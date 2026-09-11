import welcomePlaza from "@/assets/zones/welcome-plaza.jpg";
import centralQuad from "@/assets/zones/central-quad.jpg";
import studentCommons from "@/assets/zones/student-commons.jpg";
import studyGardens from "@/assets/zones/study-gardens.jpg";
import agriculturalField from "@/assets/zones/agricultural-field.jpg";
import universityLibrary from "@/assets/zones/university-library.jpg";
import studentCenter from "@/assets/zones/student-center.jpg";
import careerCenter from "@/assets/zones/career-center.jpg";
import administration from "@/assets/zones/administration.jpg";
import personalSpace from "@/assets/zones/personal-space.jpg";
import mathTechHall from "@/assets/zones/math-tech-hall.jpg";
import scienceHall from "@/assets/zones/science-hall.jpg";
import humanitiesHall from "@/assets/zones/humanities-hall.jpg";
import artsCenter from "@/assets/zones/arts-center.jpg";

/**
 * Per-zone campus guide: the illustration shown in the map inspector and the
 * arrival panel, the resident steward's backstory, the standards the zone
 * covers, and the interests it speaks to. Keyed by the ids in `ZONE_IDS`.
 */
export interface ZoneGuide {
  id: string;
  image: string;
  tagline: string;
  steward: string;
  stewardRole: string;
  backstory: string;
  philosophy: string;
  standards: string[];
  interests: string[];
  quest: [string, string, string];
}

export const ZONE_GUIDES: Record<string, ZoneGuide> = {
  "welcome-plaza": {
    id: "welcome-plaza",
    image: welcomePlaza,
    tagline: "Where every campus day begins.",
    steward: "Rosa Delgado",
    stewardRole: "Campus Guide",
    backstory:
      "Rosa was the first student to finish the old campus orientation trail, and she has met every new arrival at the arch ever since.",
    philosophy: "Nobody learns well while they are still lost. Get oriented, then get curious.",
    standards: ["CCSS.ELA-LITERACY.SL.6.1"],
    interests: ["stories", "people"],
    quest: ["Read the welcome board", "Talk with Rosa", "Walk north to the quad"],
  },
  "central-quad": {
    id: "central-quad",
    image: centralQuad,
    tagline: "The crossroads of all four academic halls.",
    steward: "Dean Amara Osei",
    stewardRole: "Dean of Students",
    backstory:
      "Dean Osei planted the quad's four oaks — one for each hall — the year she arrived, and still marks the seasons by them.",
    philosophy: "A quad is a promise: every subject is only a short walk away.",
    standards: ["CCSS.ELA-LITERACY.SL.6.1"],
    interests: ["people", "building"],
    quest: ["Check the events board", "Choose a hall", "Step inside a classroom"],
  },
  "student-commons": {
    id: "student-commons",
    image: studentCommons,
    tagline: "Study tables, notice boards, and quiet company.",
    steward: "Mira Vance",
    stewardRole: "Peer Study Lead",
    backstory:
      "Mira ran the first student study circle out of a single corner table; it now fills the whole commons every afternoon.",
    philosophy: "Explaining something to a friend is the fastest way to learn it twice.",
    standards: ["CCSS.ELA-LITERACY.SL.6.1"],
    interests: ["people", "stories"],
    quest: ["Find a study partner", "Set today's goal", "Report what you finished"],
  },
  "study-gardens": {
    id: "study-gardens",
    image: studyGardens,
    tagline: "Hedges, benches, and a pond for slow thinking.",
    steward: "Oli Bramble",
    stewardRole: "Garden Keeper",
    backstory:
      "Oli keeps a weather journal on the pond wall that stretches back eleven years, one line a day, never missed.",
    philosophy: "Observation is a skill, and quiet is where it grows.",
    standards: ["HS-LS2-1"],
    interests: ["animals", "space", "nature"],
    quest: ["Sit and observe", "Record one detail", "Compare it with yesterday"],
  },
  "agricultural-field": {
    id: "agricultural-field",
    image: agriculturalField,
    tagline: "Crop rows, greenhouse, and a working weather station.",
    steward: "Tomas Herrera",
    stewardRole: "Field Science Lead",
    backstory:
      "Tomas grew up on a seed farm and turned the campus's unused back acre into a living experiment plot.",
    philosophy: "Plants keep honest records. Read them.",
    standards: ["HS-LS2-1", "HS-ESS3-3"],
    interests: ["animals", "nature", "building"],
    quest: ["Inspect the crop rows", "Log the weather station", "Predict next week's growth"],
  },
  "university-library": {
    id: "university-library",
    image: universityLibrary,
    tagline: "Stacks, archives, and the quiet room.",
    steward: "Teodora Ilic",
    stewardRole: "Head Librarian",
    backstory:
      "Teodora rescued the archive from a flooded basement and rebuilt its catalogue card by card.",
    philosophy: "A source is only useful when you can say where it came from.",
    standards: ["CCSS.ELA-LITERACY.RI.9-10.1", "CCSS.ELA-LITERACY.W.9-10.8"],
    interests: ["stories", "history"],
    quest: ["Search the catalogue", "Pull a primary source", "Cite what you used"],
  },
  "student-center": {
    id: "student-center",
    image: studentCenter,
    tagline: "Lounge, cafeteria, and every club sign-up sheet.",
    steward: "Drew Kimani",
    stewardRole: "Peer Mentor",
    backstory:
      "Drew started the mentor desk after his own difficult first term, and has staffed it every week since.",
    philosophy: "Belonging comes before achievement, not after it.",
    standards: ["CCSS.ELA-LITERACY.SL.6.1"],
    interests: ["people", "art"],
    quest: ["Meet a mentor", "Join one club", "Plan your week"],
  },
  "career-center": {
    id: "career-center",
    image: careerCenter,
    tagline: "Pathways, portfolios, and practice interviews.",
    steward: "Nadia Whitfield",
    stewardRole: "Pathways Counsellor",
    backstory:
      "Nadia has tracked where graduates land for two decades and keeps every thank-you letter pinned behind her desk.",
    philosophy: "Start from what you like doing, then find who needs it done.",
    standards: ["CCSS.ELA-LITERACY.W.9-10.4"],
    interests: ["people", "building"],
    quest: ["Explore one pathway", "Draft your profile", "Practise an introduction"],
  },
  administration: {
    id: "administration",
    image: administration,
    tagline: "Records, transcripts, and the family ledger.",
    steward: "Registrar Colm Beattie",
    stewardRole: "Registrar",
    backstory:
      "Colm can find any record in under a minute and insists that a good ledger is a kindness to future you.",
    philosophy: "If it is not written down, it did not happen.",
    standards: [],
    interests: ["numbers"],
    quest: ["Open your record", "Check standards met", "Print a report"],
  },
  "personal-space": {
    id: "personal-space",
    image: personalSpace,
    tagline: "Your own desk, shelf, and reading lamp.",
    steward: "You",
    stewardRole: "Resident",
    backstory:
      "Every student keeps one room on campus that is entirely their own — decorated, rearranged, and filled with finished work.",
    philosophy: "A place that fits you makes long work possible.",
    standards: [],
    interests: ["art", "building"],
    quest: ["Set up your desk", "Pick up where you left off", "Finish one lesson"],
  },
  "math-tech-hall": {
    id: "math-tech-hall",
    image: mathTechHall,
    tagline: "Algebra rooms, the computer lab, and a wall of chalk.",
    steward: "Alley the Owl",
    stewardRole: "Mathematics Guide",
    backstory:
      "Alley keeps the old observatory ledger, where generations of students sketched equations beside star charts.",
    philosophy: "Show the pattern, name the rule, then let the learner test it.",
    standards: ["HS-ALG.1", "HS-ALG.2", "HS-ALG.3"],
    interests: ["numbers", "building", "space"],
    quest: ["Meet Alley at the board", "Work the lesson examples", "Complete the knowledge check"],
  },
  "science-hall": {
    id: "science-hall",
    image: scienceHall,
    tagline: "Classroom, biology lab, and the glasshouse benches.",
    steward: "Dr. Kaelen",
    stewardRole: "Conservatory Naturalist",
    backstory:
      "Dr. Kaelen turned the academy's neglected glasshouse into a living laboratory for local plants and pollinators.",
    philosophy: "Begin with what you can observe; build explanations from evidence.",
    standards: ["HS-LS1-1", "HS-LS1-2", "HS-LS2-1"],
    interests: ["animals", "space", "nature"],
    quest: ["Inspect a living specimen", "Record the evidence", "Build a scientific explanation"],
  },
  "humanities-hall": {
    id: "humanities-hall",
    image: humanitiesHall,
    tagline: "History rooms, the literature seminar, and the writing studio.",
    steward: "Professor Vance",
    stewardRole: "Keeper of the Stacks",
    backstory:
      "Professor Vance has catalogued the academy archives for thirty years, preserving letters, field journals, and first editions.",
    philosophy: "A careful reader listens for what a text says — and what its silence reveals.",
    standards: [
      "CCSS.ELA-LITERACY.RL.9-10.1",
      "CCSS.ELA-LITERACY.RL.9-10.2",
      "CCSS.ELA-LITERACY.W.9-10.1",
    ],
    interests: ["stories", "history", "people"],
    quest: ["Choose a primary text", "Annotate theme evidence", "Defend an interpretation"],
  },
  "arts-center": {
    id: "arts-center",
    image: artsCenter,
    tagline: "Studio easels, the piano room, and the recital stage.",
    steward: "Wren Alonso",
    stewardRole: "Studio Lead",
    backstory:
      "Wren repainted the studio herself to catch the north light, and hangs one student piece in the entry every week.",
    philosophy: "Make the rough version first. You cannot revise a blank page.",
    standards: ["VA:Cr2.1", "MU:Pr4.2"],
    interests: ["art", "stories"],
    quest: ["Choose a medium", "Make a rough draft", "Share it at the recital"],
  },
};

export function zoneGuide(zoneId?: string): ZoneGuide | undefined {
  return zoneId ? ZONE_GUIDES[zoneId] : undefined;
}

/** Zones worth suggesting for a child's chosen interests. */
export function recommendedZones(interests: string[]): string[] {
  if (!interests.length) return [];
  return Object.values(ZONE_GUIDES)
    .filter((zone) => zone.interests.some((tag) => interests.includes(tag)))
    .map((zone) => zone.id);
}
