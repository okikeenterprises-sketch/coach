import { createFileRoute } from "@tanstack/react-router";

// ─── Web Speech API types (not exposed through vite/client global types) ────
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => ISpeechRecognition;
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Mic, Square, Volume2, VolumeX, Phone, PhoneOff } from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

const SILENT_AUDIO_SRC =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQQAAAAAAA==";

/** Unlocks the audio element for autoplay (required on iOS / strict browsers). */
async function primeAudioElement(audio: HTMLAudioElement) {
  audio.setAttribute("playsinline", "true");
  audio.preload = "auto";
  audio.muted = true;
  audio.src = SILENT_AUDIO_SRC;
  audio.load();
  try {
    await audio.play();
    audio.dataset.primed = "1";
  } catch {
    delete audio.dataset.primed;
  }
  audio.pause();
  audio.currentTime = 0;
  audio.muted = false;
}

/** Returns the browser's SpeechRecognition constructor (handles webkit prefix). */
function getSR(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SpeechRecognitionCtor | null;
}

// ─── Route ──────────────────────────────────────────────────────────────────

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
    () =>
      (msgsQ.data ?? []).map((m) => ({
        id: m.id,
        role: m.role,
        parts: m.parts as UIMessage["parts"],
      })),
    [msgsQ.data],
  );

  if (msgsQ.isLoading) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Loading conversation…
      </div>
    );
  }

  return <Chat threadId={threadId} initial={initial} />;
}

// ─── Main Chat Component ─────────────────────────────────────────────────────

function Chat({
  threadId,
  initial,
}: {
  threadId: string;
  initial: UIMessage[];
}) {
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

  // ── TTS: Gemini voice playback ─────────────────────────────────────────────
  const [voiceOn, setVoiceOn] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenRef = useRef<Set<string>>(new Set());

  const speak = useCallback(async (text: string) => {
    try {
      const res = await fetch("/api/public/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = audioRef.current ?? new Audio();
      audio.pause();
      audio.setAttribute("playsinline", "true");
      audio.src = url;
      audio.load();
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play().catch(() => {
        /* autoplay blocked — user will see speaker button */
      });
    } catch {
      /* network/API error — silent fail */
    }
  }, []);

  // Auto-speak new assistant messages when voice is on
  useEffect(() => {
    if (!voiceOn || status !== "ready") return;
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
  }, [messages, status, voiceOn, speak]);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  // ── STT: mic button (single utterance via Web Speech API) ─────────────────
  const [recording, setRecording] = useState(false);
  const micRef = useRef<ISpeechRecognition | null>(null);

  const startRecording = useCallback(() => {
    const SR = getSR();
    if (!SR) {
      toast.error("Microphone requires Chrome or Edge browser");
      return;
    }
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = "en-US";

    r.onstart = () => setRecording(true);
    r.onend = () => setRecording(false);
    r.onerror = (e: SpeechRecognitionErrorEvent) => {
      setRecording(false);
      if (e.error !== "aborted" && e.error !== "no-speech") {
        toast.error(`Microphone error: ${e.error}`);
      }
    };
    r.onresult = async (e: SpeechRecognitionEvent) => {
      const text = e.results[0][0].transcript.trim();
      if (text) await sendMessage({ text });
    };

    micRef.current = r;
    try {
      r.start();
    } catch {
      toast.error("Could not start microphone");
      setRecording(false);
    }
  }, [sendMessage]);

  const stopRecording = useCallback(() => {
    micRef.current?.stop();
    micRef.current = null;
    setRecording(false);
  }, []);

  // ── Call mode: continuous hands-free conversation ─────────────────────────
  const [callActive, setCallActive] = useState(false);
  const [callState, setCallState] = useState<
    "idle" | "listening" | "thinking" | "speaking"
  >("idle");

  // Use refs so closures inside recognition handlers always see latest values
  const callActiveRef = useRef(false);
  const callStateRef = useRef<"idle" | "listening" | "thinking" | "speaking">("idle");
  const callRecRef = useRef<ISpeechRecognition | null>(null);

  const setCallStateSynced = useCallback(
    (s: "idle" | "listening" | "thinking" | "speaking") => {
      callStateRef.current = s;
      setCallState(s);
    },
    [],
  );

  /** Starts one SpeechRecognition session. On end, re-arms itself unless stopped. */
  const startListening = useCallback(() => {
    if (!callActiveRef.current) return;
    if (callStateRef.current === "speaking" || callStateRef.current === "thinking") return;

    const SR = getSR();
    if (!SR) return;

    const r = new SR();
    r.continuous = false;       // one utterance → natural pauses trigger onend
    r.interimResults = true;    // interim results allow barge-in detection
    r.lang = "en-US";
    callRecRef.current = r;

    r.onresult = async (e: SpeechRecognitionEvent) => {
      // Barge-in: pause TTS the moment speech is detected
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }

      const last = e.results[e.results.length - 1];
      if (!last.isFinal) return; // still speaking — keep waiting

      const text = last[0].transcript.trim();
      if (!text) return;

      setCallStateSynced("thinking");
      r.abort(); // stop listening while AI processes

      try {
        await sendMessage({ text });
        // Listening will resume automatically when TTS playback ends
      } catch {
        setCallStateSynced("listening");
        setTimeout(() => startListening(), 400);
      }
    };

    r.onend = () => {
      if (!callActiveRef.current) return;
      // Only re-arm on silence timeout — not when we aborted for thinking/speaking
      if (callStateRef.current === "listening") {
        setTimeout(() => startListening(), 200);
      }
    };

    r.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (!callActiveRef.current || e.error === "aborted") return;
      // "no-speech" is normal — onend will re-arm
      if (e.error !== "no-speech") {
        toast.error(`Call mic error: ${e.error}`);
      }
    };

    try {
      r.start();
      setCallStateSynced("listening");
    } catch {
      /* recognition might already be starting — ignore */
    }
  }, [sendMessage, setCallStateSynced]);

  const stopCall = useCallback(() => {
    callActiveRef.current = false;
    callRecRef.current?.abort();
    callRecRef.current = null;
    audioRef.current?.pause();
    setCallActive(false);
    setCallStateSynced("idle");
  }, [setCallStateSynced]);

  const startCall = useCallback(async () => {
    if (!getSR()) {
      toast.error("Call mode requires Chrome or Edge browser");
      return;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    await primeAudioElement(audioRef.current); // unlock autoplay
    callActiveRef.current = true;
    setCallActive(true);
    startListening();
  }, [startListening]);

  // Restart listening after TTS finishes speaking during a call
  useEffect(() => {
    if (!callActive) return;
    const a = audioRef.current;
    if (!a) return;

    const onPlay = () => setCallStateSynced("speaking");
    const onEnd = () => {
      setCallStateSynced("listening");
      // Give browser a short breath before re-arming recognition
      setTimeout(() => startListening(), 350);
    };

    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onEnd);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onEnd);
      a.removeEventListener("ended", onEnd);
    };
  }, [callActive, startListening, setCallStateSynced]);

  // Cleanup on unmount or thread change
  useEffect(() => () => stopCall(), [stopCall]);

  // ─── UI ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* Hidden audio element for TTS playback */}
      <audio
        ref={audioRef}
        preload="auto"
        className="h-0 w-0 opacity-0"
        tabIndex={-1}
      />

      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={
                <img
                  src="/logo.png"
                  alt="Alice Logo"
                  width={64}
                  height={64}
                  className="h-16 w-16"
                />
              }
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
                    if (
                      typeof part.type === "string" &&
                      part.type.startsWith("tool-")
                    ) {
                      const tp = part as {
                        type: `tool-${string}`;
                        state?:
                          | "input-streaming"
                          | "input-available"
                          | "output-available"
                          | "output-error";
                        input?: unknown;
                        output?: unknown;
                        errorText?: string;
                      };
                      return (
                        <Tool key={i} defaultOpen={false}>
                          <ToolHeader
                            type={tp.type}
                            state={tp.state ?? "output-available"}
                          />
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

      {/* Input bar */}
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
            placeholder={
              recording
                ? "Listening…"
                : callActive
                  ? callState === "speaking"
                    ? "Alice is speaking…"
                    : callState === "thinking"
                      ? "Thinking…"
                      : "Listening…"
                  : "Type or tap the mic to talk to Alice…"
            }
          />
          <PromptInputFooter className="justify-between">
            <div className="flex items-center gap-1">
              {/* Mic button (single utterance) */}
              <Button
                type="button"
                size="icon"
                variant={recording ? "destructive" : "ghost"}
                onClick={recording ? stopRecording : startRecording}
                disabled={isLoading || callActive}
                aria-label={recording ? "Stop recording" : "Start recording"}
                title={recording ? "Stop recording" : "Tap to speak"}
              >
                {recording ? (
                  <Square className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>

              {/* Speaker toggle */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (voiceOn) audioRef.current?.pause();
                  setVoiceOn((v) => !v);
                }}
                aria-label={voiceOn ? "Mute Alice's voice" : "Unmute Alice's voice"}
                title={voiceOn ? "Voice on — click to mute" : "Voice muted — click to unmute"}
              >
                {voiceOn ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>

              {/* Call mode button */}
              <Button
                type="button"
                size="icon"
                variant={callActive ? "destructive" : "ghost"}
                onClick={callActive ? stopCall : startCall}
                disabled={recording}
                aria-label={callActive ? "End call" : "Start voice call with Alice"}
                title={callActive ? "End call" : "Start hands-free call with Alice"}
              >
                {callActive ? (
                  <PhoneOff className="h-4 w-4" />
                ) : (
                  <Phone className="h-4 w-4" />
                )}
              </Button>

              {/* Call state indicator */}
              {callActive && (
                <span className="text-xs text-muted-foreground animate-pulse">
                  {callState === "speaking"
                    ? "🔊 Alice is speaking…"
                    : callState === "thinking"
                      ? "💭 Thinking…"
                      : "🎙 Listening…"}
                </span>
              )}
            </div>

            <PromptInputSubmit status={status} disabled={isLoading} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
