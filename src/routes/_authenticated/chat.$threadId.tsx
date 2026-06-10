import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Mic, Square, Volume2, VolumeX } from "lucide-react";

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

  // ---- Voice: auto-speak new assistant messages ----
  const [voiceOn, setVoiceOn] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenRef = useRef<Set<string>>(new Set());

  const speak = async (text: string) => {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!voiceOn) return;
    if (status !== "ready") return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (spokenRef.current.has(last.id)) return;
    const text = last.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join(" ")
      .trim();
    if (!text) return;
    spokenRef.current.add(last.id);
    void speak(text);
  }, [messages, status, voiceOn]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  // ---- Voice: mic recording -> STT -> sendMessage ----
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 500) return;
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "audio.webm");
          const res = await fetch("/api/stt", { method: "POST", body: fd });
          if (!res.ok) {
            toast.error("Couldn't transcribe");
            return;
          }
          const { text } = await res.json();
          const t = (text ?? "").trim();
          if (t) await sendMessage({ text: t });
        } finally {
          setTranscribing(false);
        }
      };
      mr.start();
      recorderRef.current = mr;
      setRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<img src={coachLogo} alt="" width={64} height={64} className="h-16 w-16" />}
              title="Hi, I'm Alice"
              description="Talk or type. I can manage tasks, search the web, check your calendar, and send emails."
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
                        type: `tool-${string}`;
                        state?: "input-streaming" | "input-available" | "output-available" | "output-error";
                        input?: unknown;
                        output?: unknown;
                        errorText?: string;
                      };
                      return (
                        <Tool key={i} defaultOpen={false}>
                          <ToolHeader type={tp.type} state={tp.state ?? "output-available"} />
                          <ToolContent>
                            {tp.input != null && <ToolInput input={tp.input} />}
                            {(tp.output != null || tp.errorText) && (
                              <ToolOutput
                                output={
                                  tp.output != null ? (
                                    <pre className="text-xs whitespace-pre-wrap">
                                      {JSON.stringify(tp.output, null, 2)}
                                    </pre>
                                  ) : null
                                }
                                errorText={tp.errorText}
                              />
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
            placeholder={recording ? "Listening…" : "Type or tap the mic to talk to Alice…"}
          />
          <PromptInputFooter className="justify-between">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant={recording ? "destructive" : "ghost"}
                onClick={recording ? stopRecording : startRecording}
                disabled={transcribing || isLoading}
                aria-label={recording ? "Stop recording" : "Start recording"}
              >
                {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (voiceOn) audioRef.current?.pause();
                  setVoiceOn((v) => !v);
                }}
                aria-label={voiceOn ? "Mute voice" : "Unmute voice"}
              >
                {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              {transcribing && <span className="text-xs text-muted-foreground">Transcribing…</span>}
            </div>
            <PromptInputSubmit status={status} disabled={isLoading} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
