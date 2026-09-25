import { subjectFor, subjectLabel, type SubjectKey } from "@/lib/campus/classroom-config";

export type LessonWorld = "mathematics" | "science" | "literature" | "writing";

export interface LessonWorldConfig {
  id: LessonWorld;
  label: string;
  prompt: string;
  discoveryLabels: readonly string[];
}

const WORLD_CONFIGS: Record<LessonWorld, LessonWorldConfig> = {
  mathematics: {
    id: "mathematics",
    label: "Geometry Garden",
    prompt: "Rotate the garden and tap the shapes",
    discoveryLabels: ["Golden sphere", "Fraction tower", "Coordinate arch"],
  },
  science: {
    id: "science",
    label: "Discovery Laboratory",
    prompt: "Orbit the lab and inspect the experiment",
    discoveryLabels: ["Orbiting electron", "Crystal sample", "Energy core"],
  },
  literature: {
    id: "literature",
    label: "Storybook Stacks",
    prompt: "Explore the library and open its story clues",
    discoveryLabels: ["Story arch", "Character volume", "Plot lantern"],
  },
  writing: {
    id: "writing",
    label: "Writer's Workshop",
    prompt: "Arrange your view and find the building blocks",
    discoveryLabels: ["Opening idea", "Strong detail", "Closing thought"],
  },
};

export function lessonWorldFor(subject?: string | null, title?: string): LessonWorldConfig {
  const haystack = `${subject ?? ""} ${title ?? ""}`;
  if (/writ|grammar|composition|essay|sentence/i.test(haystack)) return WORLD_CONFIGS.writing;
  const resolved: SubjectKey = subjectFor({ subject: haystack });
  if (resolved === "science") return WORLD_CONFIGS.science;
  if (resolved === "literature" || resolved === "history") return WORLD_CONFIGS.literature;
  if (resolved === "mathematics" || resolved === "computing") return WORLD_CONFIGS.mathematics;
  return {
    ...WORLD_CONFIGS.writing,
    label: `${subjectLabel(resolved)} Studio`,
  };
}
