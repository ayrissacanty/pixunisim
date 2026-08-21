import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  lines: z.array(z.string().min(1).max(600)).min(1).max(24),
});

/**
 * Cloud text-to-speech for the Family News briefing.
 * Returns one base64 MP3 per script line so the UI can highlight as it plays.
 */
export const speakBriefing = createServerFn({ method: "POST" })
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, clips: [] as string[] };

    const clips: string[] = [];
    for (const line of data.lines) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini-tts",
          voice: "alloy",
          input: line,
          response_format: "mp3",
          instructions: "Warm, upbeat local-news anchor delivering a short family bulletin.",
        }),
      });
      if (!res.ok) return { ok: false as const, clips: [] as string[] };
      const buf = await res.arrayBuffer();
      clips.push(Buffer.from(buf).toString("base64"));
    }

    return { ok: true as const, clips };
  });
