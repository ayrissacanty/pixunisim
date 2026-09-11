import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  lessonId: z.string(),
  question: z.string().min(1).max(600),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .max(10)
    .default([]),
  /** The student's saved learning style, so explanations match how they learn. */
  learningStyle: z.string().max(40).optional(),
  gradeBand: z.string().max(10).optional(),
});

const STYLE_GUIDANCE: Record<string, string> = {
  visual: "This student learns visually: describe diagrams, lay steps out in a numbered column, and use colour or shape language.",
  hands_on:
    "This student learns hands-on: give them something to try first, then explain why it worked.",
  story:
    "This student learns through story: wrap the idea in a short concrete scenario before naming the rule.",
  discussion:
    "This student learns by discussion: answer with a short explanation plus one question back to them.",
};

function styleGuidance(style?: string) {
  return (style && STYLE_GUIDANCE[style]) || "";
}

/**
 * Course-scoped tutor. It explains the pre-authored lesson the student is on —
 * it never invents new curriculum and never hands over check answers.
 */
export const askTutor = createServerFn({ method: "POST" })
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }) => {
    const supabaseUrl = process.env["SUPABASE_URL"];
    const publishable = process.env["SUPABASE_PUBLISHABLE_KEY"];
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!supabaseUrl || !publishable || !apiKey) {
      return { reply: "The tutor is unavailable right now. Please try again shortly." };
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, publishable, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: lesson } = await supabase
      .from("lessons")
      .select("title, summary, sections, course_id")
      .eq("id", data.lessonId)
      .maybeSingle();

    if (!lesson) {
      return { reply: "I can only help with the lesson you're currently studying." };
    }

    const sections = Array.isArray(lesson.sections) ? lesson.sections : [];
    const material = sections
      .map((s) => {
        const sec = s as { heading?: string; body?: string };
        return `## ${sec.heading ?? ""}\n${sec.body ?? ""}`;
      })
      .join("\n\n");

    const system = [
      "You are the Unify University teaching assistant.",
      "You ONLY explain the lesson material provided below. Never invent new curriculum, new lessons, or outside topics.",
      "If the student asks about something outside this lesson, say it's outside this lesson and point them back to the material.",
      "Never reveal the answer to a knowledge-check question directly; guide with hints and worked reasoning on similar examples.",
      "Be warm, concise (under 120 words), and use plain language.",
      styleGuidance(data.learningStyle),
      data.gradeBand ? `The student is in grade band ${data.gradeBand}; pitch vocabulary accordingly.` : "",
      "",
      `LESSON: ${lesson.title}`,
      `SUMMARY: ${lesson.summary}`,
      "MATERIAL:",
      material,
    ].join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          { role: "system", content: system },
          ...data.history,
          { role: "user", content: data.question },
        ],
      }),
    });

    if (res.status === 429) return { reply: "Too many questions at once — give me a moment." };
    if (!res.ok) return { reply: "I couldn't reach my notes just now. Try asking again." };

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { reply: json.choices?.[0]?.message?.content ?? "Let's look at the material together." };
  });
