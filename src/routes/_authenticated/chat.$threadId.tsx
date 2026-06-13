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
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import coachLogo from "@/assets/coach-logo.png";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Mic, Square, Volume2, VolumeX, Phone, PhoneOff } from "lucide-react";

const SILENT_AUDIO_SRC =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQQAAAAAAA==";

function pickAudioMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/aac",
  ];
  return candidates.find((m) => MediaRecorder.isTypeSupported?.(m));
}

function filenameForMime(mime: string): string {
  if (mime.includes("mp4")) return "audio.mp4";
  if (mime.includes("aac")) return "audio.aac";
  if (mime.includes("ogg")) return "audio.ogg";
  return "audio.webm";
}

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
      try {
        await audio.play();
      } catch {
        /* autoplay blocked */
      }
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
      if (!audioRef.current) audioRef.current = new Audio();
      await primeAudioElement(audioRef.current);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const mime = pickAudioMime();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blobType = mr.mimeType || chunksRef.current[0]?.type || mime || "audio/mp4";
        const blob = new Blob(chunksRef.current, { type: blobType });
        if (blob.size < 500) return;
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, filenameForMime(blobType));
          const res = await fetch("/api/public/stt", { method: "POST", body: fd });
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

  // ---- Call mode: continuous VAD-driven loop ----
  const [callActive, setCallActive] = useState(false);
  const [callState, setCallState] = useState<"idle" | "listening" | "thinking" | "speaking">(
    "idle",
  );
  const callRefs = useRef<{
    stream?: MediaStream;
    ctx?: AudioContext;
    analyser?: AnalyserNode;
    raf?: number;
    recorder?: MediaRecorder;
    chunks: Blob[];
    speaking: boolean;
    silenceStart: number;
    speechStart: number;
    stopped: boolean;
  }>({ chunks: [], speaking: false, silenceStart: 0, speechStart: 0, stopped: false });

  const transcribeAndSend = async (blob: Blob) => {
    if (blob.size < 1200) return;
    setCallState("thinking");
    try {
      const fd = new FormData();
      fd.append("audio", blob, filenameForMime(blob.type));
      const res = await fetch("/api/public/stt", { method: "POST", body: fd });
      if (!res.ok) {
        setCallState("listening");
        return;
      }
      const { text } = await res.json();
      const t = (text ?? "").trim();
      if (t) {
        await sendMessage({ text: t });
      } else {
        setCallState("listening");
      }
    } catch {
      setCallState("listening");
    }
  };

  const stopCall = () => {
    const r = callRefs.current;
    r.stopped = true;
    if (r.raf) cancelAnimationFrame(r.raf);
    try {
      if (r.recorder?.state !== "inactive") r.recorder?.stop();
    } catch {
      /* noop */
    }
    r.stream?.getTracks().forEach((t) => t.stop());
    void r.ctx?.close();
    callRefs.current = {
      chunks: [],
      speaking: false,
      silenceStart: 0,
      speechStart: 0,
      stopped: false,
    };
    audioRef.current?.pause();
    setCallActive(false);
    setCallState("idle");
  };

  const startCall = async () => {
    try {
      if (!audioRef.current) audioRef.current = new Audio();
      await primeAudioElement(audioRef.current);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      if (ctx.state === "suspended") await ctx.resume().catch(() => undefined);
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);

      callRefs.current.stream = stream;
      callRefs.current.ctx = ctx;
      callRefs.current.analyser = analyser;
      callRefs.current.stopped = false;
      setCallActive(true);
      setCallState("listening");

      const SPEAK_THRESHOLD = 0.018; // RMS
      const SILENCE_MS = 900;
      const MIN_SPEECH_MS = 250;

      const tick = () => {
        const r = callRefs.current;
        if (r.stopped) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        const now = performance.now();
        const speakingNow = rms > SPEAK_THRESHOLD;

        if (speakingNow) {
          // Barge-in: interrupt TTS
          if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
          }
          if (!r.speaking) {
            r.speaking = true;
            r.speechStart = now;
            // start a fresh recorder per utterance
            try {
              const mime = pickAudioMime();
              const mr = mime
                ? new MediaRecorder(stream, { mimeType: mime })
                : new MediaRecorder(stream);
              r.chunks = [];
              mr.ondataavailable = (e) => {
                if (e.data.size > 0) r.chunks.push(e.data);
              };
              mr.onstop = () => {
                const blobType = mr.mimeType || r.chunks[0]?.type || mime || "audio/mp4";
                const blob = new Blob(r.chunks, { type: blobType });
                r.chunks = [];
                void transcribeAndSend(blob);
              };
              mr.start(250);
              r.recorder = mr;
              setCallState("listening");
            } catch {
              /* ignore */
            }
          }
          r.silenceStart = 0;
        } else if (r.speaking) {
          if (!r.silenceStart) r.silenceStart = now;
          if (now - r.silenceStart >= SILENCE_MS && now - r.speechStart >= MIN_SPEECH_MS) {
            r.speaking = false;
            r.silenceStart = 0;
            try {
              if (r.recorder?.state !== "inactive") r.recorder?.stop();
            } catch {
              /* ignore */
            }
          }
        }
        r.raf = requestAnimationFrame(tick);
      };
      callRefs.current.raf = requestAnimationFrame(tick);
    } catch {
      toast.error("Microphone access denied");
      setCallActive(false);
    }
  };

  // Reflect TTS speaking state during a call
  useEffect(() => {
    if (!callActive) return;
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setCallState("speaking");
    const onEnd = () => setCallState("listening");
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onEnd);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onEnd);
      a.removeEventListener("ended", onEnd);
    };
  }, [callActive, messages.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callRefs.current.stream) stopCall();
    };
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <audio ref={audioRef} preload="auto" className="h-0 w-0 opacity-0" tabIndex={-1} />
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
              <Button
                type="button"
                size="icon"
                variant={callActive ? "destructive" : "ghost"}
                onClick={callActive ? stopCall : startCall}
                disabled={recording || transcribing}
                aria-label={callActive ? "End call" : "Start call"}
                title={callActive ? "End call" : "Start call with Alice"}
              >
                {callActive ? <PhoneOff className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
              </Button>
              {callActive && (
                <span className="text-xs text-muted-foreground">
                  {callState === "speaking"
                    ? "Alice is speaking…"
                    : callState === "thinking"
                      ? "Thinking…"
                      : "Listening…"}
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
