import { useMemo } from "react";
import { CheckCircle2, Circle, Lock, Sparkles } from "lucide-react";
import { useLessons, useProgress } from "@/lib/data";
import { buildSkillTrees, type SkillNode } from "@/lib/campus/skill-tree";

const ICONS: Record<SkillNode["status"], typeof Circle> = {
  mastered: CheckCircle2,
  in_progress: Circle,
  open: Circle,
  locked: Lock,
};

/**
 * Skill trees for mathematics, science, literature and writing. Each branch's
 * tiers fill up as the student's real lesson progress lands.
 */
export function SkillTrees({
  onOpen,
}: {
  onOpen: (lessonId: string, courseId: string) => void;
}) {
  const { data: lessons } = useLessons();
  const { data: progress } = useProgress();
  const branches = useMemo(() => buildSkillTrees(lessons, progress), [lessons, progress]);
  const populated = branches.filter((b) => b.totalLessons > 0);

  if (populated.length === 0) return null;

  return (
    <section data-testid="skill-trees" className="space-y-3">
      <header className="flex items-center gap-2">
        <Sparkles className="size-4 text-accent" aria-hidden="true" />
        <h3 className="font-display text-sm font-black uppercase tracking-[0.18em] text-foreground">
          Skill trees
        </h3>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {populated.map((branch) => (
          <article
            key={branch.id}
            data-branch={branch.id}
            data-mastered={branch.masteredLessons}
            className="block-panel bg-background/60 p-3"
          >
            <div className="flex items-baseline gap-2">
              <span aria-hidden="true">{branch.icon}</span>
              <h4 className="font-display text-sm font-bold">{branch.name}</h4>
              <span className="ml-auto text-[11px] font-bold text-muted-foreground">
                {branch.masteredLessons}/{branch.totalLessons}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">{branch.blurb}</p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.round(branch.progress * 100)}%` }}
              />
            </div>

            <ol className="mt-2.5 space-y-2">
              {branch.tiers.map((tier) => (
                <li key={tier.id} data-tier={tier.id} data-unlocked={tier.unlocked ? "yes" : "no"}>
                  <p className="text-[11px] font-black uppercase tracking-wider text-accent">
                    {tier.name}
                    {tier.mastered ? " · mastered" : tier.unlocked ? "" : " · locked"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{tier.description}</p>
                  <ul className="mt-1 space-y-1">
                    {tier.nodes.length === 0 && (
                      <li className="text-[11px] italic text-muted-foreground">
                        No lesson in this tier yet.
                      </li>
                    )}
                    {tier.nodes.map((node) => {
                      const Icon = ICONS[node.status];
                      return (
                        <li key={node.lessonId} data-skill={node.lessonId} data-status={node.status}>
                          <button
                            type="button"
                            disabled={node.status === "locked"}
                            onClick={() => onOpen(node.lessonId, node.courseId)}
                            className="flex w-full items-center gap-1.5 rounded-[4px] px-1 py-0.5 text-left text-[12px] hover:bg-accent/15 disabled:opacity-40"
                          >
                            <Icon
                              className={`size-3.5 shrink-0 ${
                                node.status === "mastered" ? "text-primary" : "text-muted-foreground"
                              }`}
                              aria-hidden="true"
                            />
                            <span className="truncate">{node.title}</span>
                            {node.standard && (
                              <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                                {node.standard}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}
