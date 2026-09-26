import { describe, expect, it } from "vitest";
import { WORLD_CONFIGS, lessonWorldFor, sectionForObject } from "./subject-world";

describe("lessonWorldFor", () => {
  it("routes every seeded course to its own world", () => {
    expect(lessonWorldFor("Mathematics", "Order of Operations", "foundations-algebra").id).toBe("algebra");
    expect(lessonWorldFor("Mathematics", "Angles and Triangles", "foundations-geometry").id).toBe("geometry");
    expect(lessonWorldFor("Science", "Cells", "intro-life-science").id).toBe("science");
    expect(lessonWorldFor("Language Arts", "Parts of Speech", "english-language-arts").id).toBe("english");
    expect(lessonWorldFor("Humanities", "Ancient Egypt", "world-civilizations").id).toBe("history");
    expect(lessonWorldFor("Government", "Three Branches", "civics-government").id).toBe("government");
    expect(lessonWorldFor("Literature", "Story Elements", "literature-library").id).toBe("literature");
  });

  it("falls back to title and subject", () => {
    expect(lessonWorldFor(null, "Writing a strong conclusion").id).toBe("english");
    expect(lessonWorldFor(undefined, "Algebra and equations").id).toBe("algebra");
    expect(lessonWorldFor("Arts", "Rhythm").id).toBe("literature");
  });

  it("gives each world four objective objects that cycle through sections", () => {
    for (const w of Object.values(WORLD_CONFIGS)) expect(w.objects).toHaveLength(4);
    expect(sectionForObject(5, 4)).toBe(1);
    expect(sectionForObject(2, 0)).toBe(0);
  });
});
