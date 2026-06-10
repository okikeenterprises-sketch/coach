import { createFileRoute } from "@tanstack/react-router";

const ALICE_VOICE_ID = "Xb7hH8MSUJpSbSDYk0k2";

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.ELEVENLABS_API_KEY;
        if (!key) return new Response("TTS not configured", { status: 500 });
        const { text, voiceId } = (await request.json()) as { text?: string; voiceId?: string };
        if (!text || text.length === 0) return new Response("Missing text", { status: 400 });
        const vid = voiceId || ALICE_VOICE_ID;
        const r = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${vid}?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: { "xi-api-key": key, "Content-Type": "application/json" },
            body: JSON.stringify({
              text: text.slice(0, 4000),
              model_id: "eleven_turbo_v2_5",
              voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true, speed: 1.0 },
            }),
          },
        );
        if (!r.ok) return new Response(await r.text(), { status: r.status });
        return new Response(r.body, { headers: { "Content-Type": "audio/mpeg" } });
      },
    },
  },
});