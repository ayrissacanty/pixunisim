import { useMemo } from "react";
import { Check, MapPin, ScrollText, Sparkles, X } from "lucide-react";
import { useCampusStore } from "@/lib/campus/store";
import {
  useAcceptQuest,
  useAbandonQuest,
  useQuestCatalog,
  useQuestRecords,
} from "@/lib/quests";
import { isUnlocked, stepsDone, type QuestDef, type QuestRecord } from "@/lib/campus/quests";

interface QuestView {
  quest: QuestDef;
  record?: QuestRecord;
  unlocked: boolean;
}

/** Splits the catalog into active / available / locked / done buckets. */
function useQuestBoard() {
  const catalog = useQuestCatalog();
  const { data: records } = useQuestRecords();

  return useMemo(() => {
    const rows = records ?? [];
    const views: QuestView[] = catalog.map((quest) => {
      const record = rows.find((r) => r.quest_id === quest.id);
      return { quest, ...(record ? { record } : {}), unlocked: isUnlocked(quest, rows) };
    });
    return {
      active: views.filter((v) => v.record?.status === "accepted"),
      available: views.filter((v) => !v.record && v.unlocked),
      locked: views.filter((v) => !v.record && !v.unlocked),
      completed: views.filter((v) => v.record?.status === "completed"),
    };
  }, [catalog, records]);
}

function StepRow({ quest, record }: { quest: QuestDef; record?: QuestRecord }) {
  return (
    <ul className="mt-1.5 space-y-1">
      {quest.steps.map((step) => {
        const done = !!record?.steps?.[step.id];
        return (
          <li
            key={step.id}
            data-step={step.id}
            data-done={done ? "yes" : "no"}
            className="flex items-start gap-1.5 text-[11px] leading-snug"
          >
            <span
              className={`mt-[2px] flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border-2 ${
                done ? "border-primary bg-primary text-primary-foreground" : "border-border"
              }`}
            >
              {done && <Check className="size-2.5" aria-hidden="true" />}
            </span>
            <span className={done ? "text-muted-foreground line-through" : "text-foreground/85"}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Bottom-left quest scroll. Shows the live active quest with per-step ticks,
 * or the next quest waiting to be accepted.
 */
export function QuestTracker() {
  const { active, available } = useQuestBoard();
  const setQuestsOpen = useCampusStore((s) => s.setQuestsOpen);
  const accept = useAcceptQuest();
  const events = useCampusStore((s) => s.events);

  const current = active[0];
  const next = available[0];
  const quest = current?.quest ?? next?.quest;

  if (!quest) return null;
  const done = current ? stepsDone(current.quest, current.record) : 0;

  return (
    <div
      data-testid="quest-tracker"
      data-quest={quest.id}
      data-active={current ? "yes" : "no"}
      data-steps-done={done}
      className="block-panel pointer-events-auto relative max-w-72 overflow-hidden border-accent/70 bg-card/95 pb-2.5 text-xs animate-fade-in"
    >
      <div className="flex items-center gap-1.5 border-b-[3px] border-accent/70 bg-accent px-3 py-1.5">
        <ScrollText className="size-3.5 text-accent-foreground" aria-hidden="true" />
        <p className="font-display text-[11px] font-black uppercase tracking-[0.18em] text-accent-foreground">
          {current ? "Active quest" : "New quest"}
        </p>
        <button
          type="button"
          onClick={() => setQuestsOpen(true)}
          data-testid="quest-log-open"
          className="ml-auto rounded-[4px] bg-accent-foreground/15 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent-foreground hover:bg-accent-foreground/25"
        >
          Log
        </button>
      </div>

      <div className="px-3.5 pt-2">
        <p className="font-semibold leading-snug text-foreground">{quest.title}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <MapPin className="size-3" aria-hidden="true" />
          {quest.roomName ?? quest.zoneName} · {quest.giver}
        </p>

        {current ? (
          <>
            <StepRow quest={current.quest} record={current.record} />
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              {done} / {quest.steps.length} steps
            </p>
          </>
        ) : (
          <button
            type="button"
            data-testid="quest-accept"
            onClick={() => accept.mutate(quest.id)}
            className="block-btn mt-2 w-full border-primary/40 bg-primary px-2 py-1.5 text-[11px] font-black uppercase tracking-wider text-primary-foreground"
          >
            Accept quest
          </button>
        )}
      </div>

      {events.length > 0 && (
        <ul className="mx-3 mt-2 space-y-1 border-t-[3px] border-dashed border-border pt-2">
          {events.slice(0, 3).map((e) => (
            <li key={e.id} data-event-kind={e.kind} className="text-[11px] text-muted-foreground">
              {e.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Full-screen quest log: accept, track and review every campus quest. */
export function QuestLog() {
  const open = useCampusStore((s) => s.questsOpen);
  const setOpen = useCampusStore((s) => s.setQuestsOpen);
  const board = useQuestBoard();
  const accept = useAcceptQuest();
  const abandon = useAbandonQuest();

  if (!open) return null;

  return (
    <div
      data-testid="quest-log"
      className="academy absolute inset-0 z-40 flex items-center justify-center bg-background/80 p-3 backdrop-blur-sm"
    >
      <div className="block-panel flex max-h-full w-full max-w-2xl flex-col overflow-hidden border-accent/60 bg-card">
        <div className="flex items-center gap-2 border-b-[3px] border-accent/60 bg-accent px-4 py-2.5">
          <ScrollText className="size-4 text-accent-foreground" aria-hidden="true" />
          <h2 className="font-display text-sm font-black uppercase tracking-[0.18em] text-accent-foreground">
            Quest log
          </h2>
          <button
            type="button"
            aria-label="Close the quest log"
            onClick={() => setOpen(false)}
            className="ml-auto rounded-full bg-accent-foreground/15 p-1 text-accent-foreground hover:bg-accent-foreground/30"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-4 text-sm">
          <Section title="In progress" empty="No quest accepted yet.">
            {board.active.map(({ quest, record }) => (
              <article key={quest.id} data-quest-row={quest.id} className="block-panel bg-background/60 p-3">
                <Header quest={quest} />
                <StepRow quest={quest} record={record} />
                <button
                  type="button"
                  onClick={() => abandon.mutate(quest.id)}
                  className="mt-2 text-[11px] font-semibold text-muted-foreground underline hover:text-destructive"
                >
                  Abandon
                </button>
              </article>
            ))}
          </Section>

          <Section title="Available" empty="Finish an active quest to unlock more.">
            {board.available.map(({ quest }) => (
              <article key={quest.id} data-quest-row={quest.id} className="block-panel bg-background/60 p-3">
                <Header quest={quest} />
                <button
                  type="button"
                  onClick={() => accept.mutate(quest.id)}
                  className="block-btn mt-2 border-primary/40 bg-primary px-3 py-1 text-[11px] font-black uppercase tracking-wider text-primary-foreground"
                >
                  Accept
                </button>
              </article>
            ))}
          </Section>

          <Section title="Completed" empty="Nothing finished yet.">
            {board.completed.map(({ quest }) => (
              <article
                key={quest.id}
                data-quest-row={quest.id}
                className="block-panel flex items-center gap-2 bg-background/40 p-3 opacity-80"
              >
                <Sparkles className="size-4 text-primary" aria-hidden="true" />
                <span className="font-semibold">{quest.title}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {quest.reward.icon} {quest.reward.name}
                </span>
              </article>
            ))}
          </Section>

          {board.locked.length > 0 && (
            <Section title="Locked" empty="">
              {board.locked.map(({ quest }) => (
                <article
                  key={quest.id}
                  data-quest-row={quest.id}
                  className="block-panel bg-background/30 p-3 text-muted-foreground"
                >
                  <p className="font-semibold">{quest.title}</p>
                  <p className="text-[11px]">Unlocks after the previous {quest.subject} class.</p>
                </article>
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Header({ quest }: { quest: QuestDef }) {
  return (
    <>
      <p className="font-bold text-foreground">{quest.title}</p>
      <p className="text-[11px] text-muted-foreground">
        {quest.giver} · {quest.roomName ?? quest.zoneName}
        {quest.standardCode ? ` · ${quest.standardCode}` : ""}
      </p>
      <p className="mt-1 text-[12px] text-foreground/80">{quest.summary}</p>
      <p className="mt-1 text-[11px] font-semibold text-primary">
        Reward: {quest.reward.icon} {quest.reward.name}
      </p>
    </>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode[];
}) {
  const has = Array.isArray(children) && children.length > 0;
  return (
    <section>
      <h3 className="mb-1.5 font-display text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h3>
      {has ? <div className="space-y-2">{children}</div> : empty ? (
        <p className="text-[12px] text-muted-foreground">{empty}</p>
      ) : null}
    </section>
  );
}
