import alleyPortrait from "@/assets/faculty-alley.png";
import vancePortrait from "@/assets/faculty-vance.png";
import kaelenPortrait from "@/assets/faculty-kaelen.png";

export interface FacultyProfile {
  id: "alley" | "vance" | "kaelen";
  name: string;
  title: string;
  subject: string;
  roomId: string;
  zoneId: string;
  portrait: string;
  standard: string;
  philosophy: string;
  backstory: string;
  quest: [string, string, string];
}

export const FACULTY: FacultyProfile[] = [
  {
    id: "alley",
    name: "Alley the Owl",
    title: "Mathematics Guide",
    subject: "Algebra & mathematical thinking",
    roomId: "algebra-204",
    zoneId: "math-tech-hall",
    portrait: alleyPortrait,
    standard: "HS-ALG.2",
    philosophy: "Show the pattern, name the rule, then let the learner test it.",
    backstory: "Alley keeps the old observatory ledger, where generations of students have sketched equations beside star charts.",
    quest: ["Meet Alley at the board", "Work the lesson examples", "Complete the knowledge check"],
  },
  {
    id: "vance",
    name: "Professor Vance",
    title: "Keeper of the Stacks",
    subject: "Literature & primary sources",
    roomId: "literature-seminar",
    zoneId: "humanities-hall",
    portrait: vancePortrait,
    standard: "CCSS.ELA-LITERACY.RL.9-10.2",
    philosophy: "A careful reader listens for what a text says—and what its silence reveals.",
    backstory: "Professor Vance has catalogued the academy archives for thirty years, preserving letters, field journals, and first editions.",
    quest: ["Choose a primary text", "Annotate theme evidence", "Defend an interpretation"],
  },
  {
    id: "kaelen",
    name: "Dr. Kaelen",
    title: "Conservatory Naturalist",
    subject: "Life science & field observation",
    roomId: "science-classroom",
    zoneId: "science-hall",
    portrait: kaelenPortrait,
    standard: "HS-LS1-1",
    philosophy: "Begin with what you can observe; build explanations from evidence.",
    backstory: "Dr. Kaelen turned the academy's neglected glasshouse into a living laboratory for local plants and pollinators.",
    quest: ["Inspect a living specimen", "Record the evidence", "Build a scientific explanation"],
  },
];

export function facultyForRoom(roomId?: string): FacultyProfile {
  return FACULTY.find((faculty) => faculty.roomId === roomId) ?? FACULTY[0]!;
}