import { ArrowLeft, Check, MapPin, Sparkles } from "lucide-react";
import { useCampusStore } from "@/lib/campus/store";
import { useLesson } from "@/lib/data";
import { useInventory, useMarkQuestStep, useUseItem } from "@/lib/quests";
import type { QuestDef, QuestRecord } from "@/lib/campus/quests";

/**
 * A quest's own page: every step with its state, the lesson content the quest
 * is built on, and the reward waiting at the end.
 */
export function QuestDetail({
  quest,
  record,
  onBack,
}: {
  quest: QuestDef;
  record?: QuestRecord | undefined;
  onBack: () => void;
}) {
  const { data: lesson } = useLesson(quest.lessonId);
  const { data: items } = useInventory();
  const openLesson = useCampusStore((s) => s.openLesson);
  const setQuestsOpen = useCampusStore((s) => s.setQuestsOpen);
  const setQuestDetail = useCampusStore((s) => s.setQuestDetail);
  const use = useUseItem();
  const mark = useMarkQuestStep();

  const rewardRow = items?.find((i) => i.item_id === quest.reward.itemId);
  const rewardAvailable = rewardRow ? rewardRow.quantity - rewardRow.used_count : 0;
  const canHandIn =
    !!record &&
    record.status !== "completed" &&
    !record.steps["deliver"] &&
    !!record.steps["lesson"] &&
    !!record.steps["check"] &&
    rewardAvailable > 0;

  return (
    <div data-testid="quest-detail" data-quest={quest.id} className="space-y-4 text-sm">
      <button
        type="button"
        onClick={onBack}
        data-testid="quest-detail-back"
        className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Quest log
      </button>

      <header>
        <h3 className="font-display text-lg font-black text-foreground">{quest.title}</h3>
        <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <MapPin className="size-3" aria-hidden="true" />
          {quest.roomName ?? quest.zoneName} · {quest.giver} · {quest.subject}
          {quest.standardCode ? ` · ${quest.standardCode}` : ""}
        </p>
        <p className="mt-2 text-foreground/85">{quest.summary}</p>
      </header>

      <section>
        <h4 className="mb-1.5 font-display text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
          Steps
        </h4>
        <ol className="space-y-1.5" data-testid="quest-detail-steps">
          {quest.steps.map((step, i) => {
            const done = !!record?.steps?.[step.id];
            return (
              <li
                key={step.id}
                data-step={step.id}
                data-done={done ? "yes" : "no"}
                className="block-panel flex items-start gap-2 bg-background/60 p-2.5"
              >
                <span
                  className={`mt-[1px] flex size-4 shrink-0 items-center justify-center rounded-[4px] border-2 text-[10px] font-black ${
                    done ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {done ? <Check className="size-2.5" aria-hidden="true" /> : i + 1}
                </span>
                <span className={done ? "text-muted-foreground line-through" : "text-foreground/90"}>
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h4 className="mb-1.5 font-display text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
          Lesson content
        </h4>
        {lesson ? (
          <div className="space-y-2" data-testid="quest-detail-lesson">
            {lesson.sections.map((section) => (
              <article key={section.heading} className="block-panel bg-background/50 p-2.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-accent">
                  {section.type}
                </p>
                <p className="font-semibold text-foreground">{section.heading}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-foreground/80">{section.body}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">Loading the lesson pages…</p>
        )}
      </section>

      <section className="block-panel flex flex-wrap items-center gap-2 border-primary/40 bg-background/60 p-3">
        <Sparkles className="size-4 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-semibold text-foreground">
            Reward: {quest.reward.icon} {quest.reward.name}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {record?.status === "completed"
              ? `Handed to ${quest.giver}.`
              : rewardAvailable > 0
                ? "In your backpack, ready to hand in."
                : `Earned when you pass ${quest.giver}'s knowledge check.`}
          </p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="quest-detail-start"
          onClick={() => {
            setQuestDetail(undefined);
            setQuestsOpen(false);
            openLesson(quest.lessonId, quest.courseId, quest.roomId);
          }}
          className="block-btn border-primary/40 bg-primary px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-primary-foreground"
        >
          {record?.status === "completed" ? "Review lesson" : "Open lesson"}
        </button>
        {canHandIn && (
          <button
            type="button"
            data-testid="quest-detail-hand-in"
            onClick={() => {
              use.mutate(quest.reward.itemId);
              mark.mutate({ questId: quest.id, stepId: "deliver" });
            }}
            className="block-btn border-accent/40 bg-accent px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-accent-foreground"
          >
            Hand in to {quest.giver}
          </button>
        )}
      </div>
    </div>
  );
}
