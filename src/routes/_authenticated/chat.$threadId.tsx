import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { getThreadMessages } from "@/lib/threads.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import coachLogo from "@/assets/coach-logo.png";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ChatThreadPage,
});

function ChatThreadPage() {
  const { threadId } = Route.useParams();
  return <ChatWindow key={threadId} threadId={threadId} />;
}

function ChatWindow({ threadId }: { threadId: string }) {
  const getMsgs = useServerFn(getThreadMessages);
  const msgsQ = useQuery({
    queryKey: ["thread-messages", threadId],
    queryFn: () => getMsgs({ data: { threadId } }),
  });

  const initial = useMemo<UIMessage[]>(
    () => (msgsQ.data ?? []).map((m) => ({ id: m.id, role: m.role, parts: m.parts as UIMessage["parts"] })),
    [msgsQ.data],
  );

  if (msgsQ.isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading conversation…</div>;
  }

  return <Chat threadId={threadId} initial={initial} />;
}

function Chat({ threadId, initial }: { threadId: string; initial: UIMessage[] }) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages }) => {
          const { data } = await supabase.auth.getSession();
          return {
            body: { messages, threadId },
            headers: data.session?.access_token
              ? { Authorization: `Bearer ${data.session.access_token}` }
              : undefined,
          };
        },
      }),
    [threadId],
  );

  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initial,
    transport,
    onError: (e) => toast.error(e.message),
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId, status]);

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<img src={coachLogo} alt="" width={64} height={64} className="h-16 w-16" />}
              title="Hey, I'm Coach"
              description="Ask me what's on your plate, add tasks, or get a kick-in-the-pants briefing."
            />
          ) : (
            messages.map((m) => (
              <Message from={m.role === "user" ? "user" : "assistant"} key={m.id}>
                <MessageContent>
                  {m.parts.map((part, i) => {
                    if (part.type === "text") {
                      return m.role === "assistant" ? (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      ) : (
                        <span key={i}>{part.text}</span>
                      );
                    }
                    if (typeof part.type === "string" && part.type.startsWith("tool-")) {
                      const tp = part as {
                        type: string;
                        state?: string;
                        input?: unknown;
                        output?: unknown;
                        errorText?: string;
                      };
                      return (
                        <Tool key={i} defaultOpen={false}>
                          <ToolHeader type={tp.type as `tool-${string}`} state={(tp.state ?? "output-available") as Parameters<typeof ToolHeader>[0]["state"]} />
                          <ToolContent>
                            {tp.input != null && <ToolInput input={tp.input} />}
                            {(tp.output != null || tp.errorText) && (
                              <ToolOutput output={tp.output ? <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(tp.output, null, 2)}</pre> : null} errorText={tp.errorText} />
                            )}
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Thinking…</Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-3">
        <PromptInput
          onSubmit={async (message) => {
            const text = message.text.trim();
            if (!text || isLoading) return;
            await sendMessage({ text });
          }}
          className="max-w-3xl mx-auto"
        >
          <PromptInputTextarea
            ref={textareaRef}
            placeholder="Tell Coach what you're up to…"
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={isLoading} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
