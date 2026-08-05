import { createFileRoute } from "@tanstack/react-router";

/**
 * STT is now handled entirely client-side via the browser's built-in
 * Web Speech API (SpeechRecognition) — no server round-trip needed.
 * This endpoint is kept as a stub in case a server-side fallback is added later.
 */
export const Route = createFileRoute("/api/public/stt")({
  server: {
    handlers: {
      POST: async () => {
        return Response.json(
          { error: "STT is handled client-side via Web Speech API" },
          { status: 501 },
        );
      },
    },
  },
});
