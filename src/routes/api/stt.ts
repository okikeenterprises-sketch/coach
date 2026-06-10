import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.ELEVENLABS_API_KEY;
        if (!key) return new Response("STT not configured", { status: 500 });
        const form = await request.formData();
        const file = form.get("audio");
        if (!(file instanceof File) && !(file instanceof Blob)) {
          return new Response("Missing audio", { status: 400 });
        }
        const out = new FormData();
        out.append("file", file, "audio.webm");
        out.append("model_id", "scribe_v2");
        const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
          method: "POST",
          headers: { "xi-api-key": key },
          body: out,
        });
        if (!r.ok) return new Response(await r.text(), { status: r.status });
        const data = await r.json();
        return Response.json({ text: data.text ?? "" });
      },
    },
  },
});