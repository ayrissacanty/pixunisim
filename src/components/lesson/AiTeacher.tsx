import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { askTutor } from "@/lib/tutor.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export function AiTeacher({ lessonId, lessonTitle }: { lessonId: string; lessonTitle: string }) {
  const ask = useServerFn(askTutor);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: `I'm your teaching assistant for "${lessonTitle}". Ask me to re-explain any part of this lesson.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await ask({
        data: { lessonId, question, history: next.slice(-6, -1) },
      });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "I couldn't answer that one. Try again in a moment." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-md border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="size-4 text-accent" />
        <h3 className="text-sm font-semibold">Teaching Assistant</h3>
        <span className="ml-auto text-[11px] text-muted-foreground">Lesson-scoped</span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-md rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                : "max-w-[90%] rounded-md rounded-bl-sm bg-muted px-3 py-2 text-sm text-foreground"
            }
          >
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Thinking…
          </div>
        )}
      </div>
      <div className="flex gap-2 border-t border-border p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
          placeholder="Ask about this lesson…"
          aria-label="Ask the teaching assistant"
        />
        <Button size="icon" onClick={() => void send()} disabled={busy} aria-label="Send question">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
