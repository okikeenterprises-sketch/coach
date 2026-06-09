import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = auth.slice("Bearer ".length);
        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        if (!LOVABLE_API_KEY) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
        if (claimsErr || !claims?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = claims.claims.sub;

        const body = (await request.json()) as {
          messages: UIMessage[];
          threadId: string;
        };
        if (!body.threadId) return new Response("Missing threadId", { status: 400 });

        // Verify thread ownership and persist the last user message
        const { data: thread, error: threadErr } = await supabase
          .from("chat_threads")
          .select("id, title")
          .eq("id", body.threadId)
          .maybeSingle();
        if (threadErr || !thread) return new Response("Thread not found", { status: 404 });

        const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
        if (lastUser) {
          await supabase.from("chat_messages").insert({
            thread_id: body.threadId,
            user_id: userId,
            role: "user",
            parts: lastUser.parts as unknown as Database["public"]["Tables"]["chat_messages"]["Insert"]["parts"],
          });
          // Auto-title from first user message
          if (thread.title === "New chat") {
            const text = lastUser.parts
              .map((p) => (p.type === "text" ? p.text : ""))
              .join(" ")
              .slice(0, 80);
            if (text) {
              await supabase.from("chat_threads").update({ title: text }).eq("id", body.threadId);
            }
          }
        }

        // Briefing context for the system prompt
        const { data: openTasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("status", "todo");

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(startOfToday.getTime() + 86400000);
        const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
        const overdue = (openTasks ?? []).filter((t) => t.due_at && new Date(t.due_at) < startOfToday);
        const dueToday = (openTasks ?? []).filter(
          (t) => t.due_at && new Date(t.due_at) >= startOfToday && new Date(t.due_at) < endOfToday,
        );
        const neglected = (openTasks ?? []).filter(
          (t) => !t.due_at && new Date(t.created_at) < threeDaysAgo,
        );

        const slacking = overdue.length >= 3 || neglected.length >= 3;

        const system = `You are "Coach", a personal task assistant. Personality: ${
          slacking
            ? "the user has been slacking — be firm, direct, and slightly stern. Call out neglected and overdue tasks specifically. No fluff. Push them to commit to action."
            : "the user is on top of things — be cheerful, warm, and encouraging. Light humor is welcome. Celebrate progress."
        }

Today is ${now.toISOString()}.
Open tasks: ${openTasks?.length ?? 0} total. Overdue: ${overdue.length}. Due today: ${dueToday.length}. Neglected (>3 days, no due date): ${neglected.length}.

You have tools to read and modify the user's tasks. Use them whenever the user asks about, creates, completes, or changes tasks. Always confirm actions you took. When listing tasks in chat, use compact markdown bullets.`;

        const provider = createLovableAiGatewayProvider(LOVABLE_API_KEY);

        const result = streamText({
          model: provider("google/gemini-3-flash-preview"),
          system,
          messages: await convertToModelMessages(body.messages),
          stopWhen: stepCountIs(50),
          tools: {
            list_tasks: tool({
              description: "List the user's tasks, optionally filtered by status.",
              inputSchema: z.object({
                status: z.enum(["todo", "done", "all"]).default("todo"),
              }),
              execute: async ({ status }) => {
                const q = supabase.from("tasks").select("id,title,due_at,priority,status,notes,created_at");
                const { data, error } = status === "all" ? await q : await q.eq("status", status);
                if (error) return { error: error.message };
                return { tasks: data };
              },
            }),
            create_task: tool({
              description: "Create a new task for the user.",
              inputSchema: z.object({
                title: z.string().min(1).max(500),
                notes: z.string().max(5000).optional(),
                due_at: z.string().datetime().optional().describe("ISO datetime"),
                priority: z.enum(["low", "medium", "high"]).default("medium"),
                recurrence: z.enum(["none", "daily", "weekly"]).default("none"),
              }),
              execute: async (input) => {
                const { data, error } = await supabase
                  .from("tasks")
                  .insert({ ...input, user_id: userId })
                  .select()
                  .single();
                if (error) return { error: error.message };
                return { task: data };
              },
            }),
            complete_task: tool({
              description: "Mark a task as done by id.",
              inputSchema: z.object({ id: z.string().uuid() }),
              execute: async ({ id }) => {
                const { data, error } = await supabase
                  .from("tasks")
                  .update({ status: "done", completed_at: new Date().toISOString() })
                  .eq("id", id)
                  .select()
                  .single();
                if (error) return { error: error.message };
                return { task: data };
              },
            }),
            update_task: tool({
              description: "Update fields on an existing task.",
              inputSchema: z.object({
                id: z.string().uuid(),
                title: z.string().min(1).max(500).optional(),
                notes: z.string().max(5000).optional(),
                due_at: z.string().datetime().optional(),
                priority: z.enum(["low", "medium", "high"]).optional(),
              }),
              execute: async ({ id, ...patch }) => {
                const { data, error } = await supabase
                  .from("tasks")
                  .update(patch)
                  .eq("id", id)
                  .select()
                  .single();
                if (error) return { error: error.message };
                return { task: data };
              },
            }),
            delete_task: tool({
              description: "Delete a task by id.",
              inputSchema: z.object({ id: z.string().uuid() }),
              execute: async ({ id }) => {
                const { error } = await supabase.from("tasks").delete().eq("id", id);
                if (error) return { error: error.message };
                return { ok: true };
              },
            }),
            get_briefing: tool({
              description: "Get a structured briefing of overdue, due today, and neglected tasks.",
              inputSchema: z.object({}),
              execute: async () => ({
                counts: {
                  overdue: overdue.length,
                  dueToday: dueToday.length,
                  neglected: neglected.length,
                  total: openTasks?.length ?? 0,
                },
                overdue,
                dueToday,
                neglected,
              }),
            }),
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: body.messages,
          onFinish: async ({ messages }) => {
            const last = messages[messages.length - 1];
            if (last && last.role === "assistant") {
              await supabase.from("chat_messages").insert({
                thread_id: body.threadId,
                user_id: userId,
                role: "assistant",
                parts: last.parts as unknown as Database["public"]["Tables"]["chat_messages"]["Insert"]["parts"],
              });
              await supabase
                .from("chat_threads")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", body.threadId);
            }
          },
        });
      },
    },
  },
});
