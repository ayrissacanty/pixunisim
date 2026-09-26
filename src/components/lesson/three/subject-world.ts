export type LessonWorld =
  | "algebra"
  | "geometry"
  | "science"
  | "english"
  | "history"
  | "government"
  | "literature";

export type ObjectShape =
  | "box"
  | "sphere"
  | "cone"
  | "torus"
  | "pyramid"
  | "cylinder"
  | "capsule"
  | "octahedron";

/** One tappable thing in a world, tied to a lesson objective. */
export interface WorldObject {
  label: string;
  /** Short objective-linked fact shown when the student inspects it. */
  fact: string;
  shape: ObjectShape;
  color: string;
  position: [number, number, number];
}

export interface LessonWorldConfig {
  id: LessonWorld;
  label: string;
  prompt: string;
  ground: string;
  objects: readonly WorldObject[];
}

export const WORLD_COLORS = {
  ink: "#17151f",
  paper: "#fff4d6",
  coral: "#ff4d6d",
  violet: "#6c5ce7",
  green: "#6ab04c",
  yellow: "#f9ca24",
  sky: "#66c7f2",
  teal: "#27ae9b",
  wood: "#8b5a3c",
  stone: "#d8cbb0",
  navy: "#2d3a6e",
} as const;

const C = WORLD_COLORS;

export const WORLD_CONFIGS: Record<LessonWorld, LessonWorldConfig> = {
  algebra: {
    id: "algebra",
    label: "Equation Observatory",
    prompt: "Tap the weights to balance the equation scale",
    ground: C.green,
    objects: [
      { label: "Variable crystal", fact: "A letter like x holds a number we don't know yet.", shape: "octahedron", color: C.violet, position: [-2.6, 0.1, 1.2] },
      { label: "Coefficient weight", fact: "In 5x, the 5 multiplies the variable — five copies of x.", shape: "box", color: C.coral, position: [-1.4, 0.35, -1.6] },
      { label: "Operation gears", fact: "Parentheses, exponents, multiply/divide, then add/subtract.", shape: "torus", color: C.yellow, position: [1.4, 0.35, -1.6] },
      { label: "Balance pan", fact: "Whatever you do to one side, do to the other to keep it balanced.", shape: "cylinder", color: C.sky, position: [2.6, 0.1, 1.2] },
    ],
  },
  geometry: {
    id: "geometry",
    label: "Geometry Garden",
    prompt: "Inspect each angle and shape in the garden",
    ground: C.teal,
    objects: [
      { label: "Acute pyramid", fact: "Angles under 90° are acute — sharp, like a pyramid peak.", shape: "pyramid", color: C.yellow, position: [-2.6, 0, 1] },
      { label: "Right-angle block", fact: "A cube corner is a perfect 90° right angle.", shape: "box", color: C.coral, position: [0, 0, 2.2] },
      { label: "Protractor ring", fact: "Protractors measure turn in degrees; a straight line is 180°.", shape: "torus", color: C.violet, position: [2.6, 0.2, 1] },
      { label: "Triangle keystone", fact: "Any triangle's three angles always add to 180°.", shape: "cone", color: C.sky, position: [0, 0.2, -2.4] },
    ],
  },
  science: {
    id: "science",
    label: "Cell Discovery Lab",
    prompt: "Orbit the giant cell and inspect its parts",
    ground: C.teal,
    objects: [
      { label: "Nucleus", fact: "The nucleus stores DNA — the cell's instruction book.", shape: "sphere", color: C.violet, position: [0, 1.2, 0] },
      { label: "Mitochondrion", fact: "Mitochondria release energy from food for the cell.", shape: "capsule", color: C.coral, position: [-2.6, 0.1, 1.2] },
      { label: "Specimen jar", fact: "Living things grow, respond, reproduce and use energy.", shape: "cylinder", color: C.sky, position: [2.6, 0.1, 1.2] },
      { label: "Food-web crystal", fact: "Energy flows from producers to consumers to decomposers.", shape: "octahedron", color: C.green, position: [0, 0.1, -2.8] },
    ],
  },
  english: {
    id: "english",
    label: "Word Workshop",
    prompt: "Tap each word block to learn its job",
    ground: C.coral,
    objects: [
      { label: "Noun block", fact: "Nouns name people, places, things and ideas.", shape: "box", color: C.sky, position: [-2.7, 0, 0.8] },
      { label: "Verb block", fact: "Verbs show action or being — every sentence needs one.", shape: "box", color: C.yellow, position: [-0.9, 0, 1.6] },
      { label: "Adjective block", fact: "Adjectives describe nouns: the quiet library.", shape: "box", color: C.green, position: [0.9, 0, 1.6] },
      { label: "Sentence keystone", fact: "Subject + predicate = a complete sentence, not a fragment.", shape: "pyramid", color: C.violet, position: [2.7, 0, 0.8] },
    ],
  },
  history: {
    id: "history",
    label: "River Valley Expedition",
    prompt: "Walk the river valley and uncover its artifacts",
    ground: "#d9b26f",
    objects: [
      { label: "Great pyramid", fact: "Egypt's pharaohs built pyramids as eternal tombs.", shape: "pyramid", color: C.yellow, position: [-2.6, 0.1, -1.4] },
      { label: "River urn", fact: "Civilizations grew beside rivers for water, farming and trade.", shape: "cylinder", color: C.coral, position: [0, 0, 2.3] },
      { label: "Obelisk", fact: "Writing, cities, government and specialized jobs mark a civilization.", shape: "box", color: C.stone, position: [2.6, 0.4, -1.4] },
      { label: "Timeline scroll", fact: "Egypt lasted about 3,000 years — longer than any empire since.", shape: "capsule", color: C.paper, position: [2.4, 0, 1.6] },
    ],
  },
  government: {
    id: "government",
    label: "Capitol Chamber",
    prompt: "Visit each branch and see how power is balanced",
    ground: C.navy,
    objects: [
      { label: "Capitol dome", fact: "Legislative branch: Congress writes and passes laws.", shape: "sphere", color: C.paper, position: [0, 1.5, -1.8] },
      { label: "Executive seal", fact: "Executive branch: the President carries out laws and can veto.", shape: "cylinder", color: C.yellow, position: [-2.7, 0, 1] },
      { label: "Justice gavel", fact: "Judicial branch: courts interpret laws and check the Constitution.", shape: "capsule", color: C.wood, position: [2.7, 0, 1] },
      { label: "Constitution scroll", fact: "\"We the People\" — the Bill of Rights protects every citizen.", shape: "torus", color: C.coral, position: [0, 0, 2.4] },
    ],
  },
  literature: {
    id: "literature",
    label: "Storybook Library",
    prompt: "Explore the stacks and open each story clue",
    ground: C.violet,
    objects: [
      { label: "Character volume", fact: "Characters show who they are through words, actions and thoughts.", shape: "box", color: C.coral, position: [-2.5, 0, 1] },
      { label: "Setting globe", fact: "Setting is where and when — it shapes the story's mood.", shape: "sphere", color: C.sky, position: [-0.8, 0.1, 2.2] },
      { label: "Plot arch", fact: "Exposition, rising action, climax, falling action, resolution.", shape: "torus", color: C.yellow, position: [0.9, 0.2, 2.2] },
      { label: "Theme lantern", fact: "Theme is the big idea underneath — what did the hero learn?", shape: "cone", color: C.green, position: [2.5, 0, 1] },
    ],
  },
};

const RULES: [RegExp, LessonWorld][] = [
  [/geometr|angle|triangle|shape|polygon/i, "geometry"],
  [/govern|civic|constitution|branch|rights|congress|democra/i, "government"],
  [/algebra|equation|expression|variable|operations|math|comput|technolog|algorithm/i, "algebra"],
  [/scien|cell|life|ecosystem|biolog|lab|chemist|physic/i, "science"],
  [/litera|story|library|novel|poem|poetry|fiction/i, "literature"],
  [/english|grammar|speech|sentence|writ|language arts|composition|essay/i, "english"],
  [/histor|civiliz|egypt|ancient|humanit|social studies|river valley/i, "history"],
];

function match(text: string): LessonWorld | undefined {
  for (const [re, id] of RULES) if (re.test(text)) return id;
  return undefined;
}

/**
 * Picks the 3D world for a lesson. The course id and title are the most
 * specific signals (a Humanities course can still be a writing lesson), then
 * the broad subject label.
 */
export function lessonWorldFor(
  subject?: string | null,
  title?: string | null,
  courseId?: string | null,
): LessonWorldConfig {
  const id =
    match(courseId ?? "") ?? match(title ?? "") ?? match(subject ?? "") ?? "literature";
  return WORLD_CONFIGS[id];
}

/** Lesson section a world object opens (objects cycle through the sections). */
export function sectionForObject(index: number, sectionCount: number): number {
  if (sectionCount <= 0) return 0;
  return index % sectionCount;
}
