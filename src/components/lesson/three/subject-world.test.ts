import { describe, expect, it } from "vitest";
import { lessonWorldFor } from "./subject-world";

describe("lesson subject worlds", () => {
  it("maps the four core branches to distinct worlds", () => {
    expect(lessonWorldFor("Mathematics").id).toBe("mathematics");
    expect(lessonWorldFor("Science").id).toBe("science");
    expect(lessonWorldFor("Literature").id).toBe("literature");
    expect(lessonWorldFor("Writing").id).toBe("writing");
  });

  it("uses lesson titles when subject metadata is sparse", () => {
    expect(lessonWorldFor(null, "Writing a strong conclusion").id).toBe("writing");
    expect(lessonWorldFor(null, "Algebra and equations").id).toBe("mathematics");
  });
});
