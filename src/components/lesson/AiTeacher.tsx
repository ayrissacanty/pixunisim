import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, ShieldCheck } from "lucide-react";
import { askTutor } from "@/lib/tutor.functions";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputBody, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import alleyPortrait from "@/assets/faculty-alley.png";

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

  const send = async (value = input) => {
    const question = value.trim();
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
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[0_12px_40px_rgba(0,0,0,.2)]">
      <div className="flex items-center gap-3 border-b border-border bg-[#211b17] px-4 py-3 text-[#eedcc5]">
        <img src={alleyPortrait} alt="Alley the Owl" width={768} height={768} loading="lazy" className="size-11 rounded-lg border border-[#84a98c]/60 object-cover [image-rendering:pixelated]" />
        <div>
          <h3 className="font-display text-sm font-semibold">Ask Alley</h3>
          <p className="text-[10px] text-[#eedcc5]/65">Your lesson-side guide</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-[#84a98c]/40 bg-[#3a4d39]/50 px-2 py-1 text-[10px]">
          <ShieldCheck className="size-3" /> Lesson-scoped
        </span>
      </div>
      <Conversation className="min-h-0">
        <ConversationContent className="gap-4">
          {messages.map((m, i) => (
            <Message key={`${m.role}-${i}`} from={m.role}>
              <MessageContent className={m.role === "assistant" ? "rounded-lg border border-border/60 bg-muted/60 px-3 py-2" : undefined}>
                <MessageResponse>{m.content}</MessageResponse>
              </MessageContent>
            </Message>
          ))}
          {busy && <Shimmer className="text-sm">Alley is checking the lesson notes…</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="border-t border-border bg-background/50 p-3">
        <PromptInput onSubmit={({ text }) => send(text)}>
          <PromptInputBody>
            <PromptInputTextarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask Alley to explain this step…" aria-label="Ask Alley about this lesson" />
          </PromptInputBody>
          <PromptInputFooter>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Sparkles className="size-3" /> Hints, not answer keys</span>
            <PromptInputSubmit status={busy ? "submitted" : "ready"} disabled={busy || !input.trim()} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
