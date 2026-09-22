import { describe, expect, it } from "vitest";
import { classroomConfig, gradeBandFor, subjectFor } from "@/lib/campus/classroom-config";

describe("classroom configuration", () => {
  it("reads the subject from the room", () => {
    expect(subjectFor({ roomId: "algebra-204" })).toBe("mathematics");
    expect(subjectFor({ roomName: "Computer Lab" })).toBe("computing");
    expect(subjectFor({ roomName: "Art Studio" })).toBe("art");
    expect(subjectFor({ subject: "Science" })).toBe("science");
  });

  it("maps grades to bands", () => {
    expect(gradeBandFor(3)).toBe("k-5");
    expect(gradeBandFor(7)).toBe("6-8");
    expect(gradeBandFor(11)).toBe("9-12");
    expect(gradeBandFor(null)).toBe("6-8");
  });

  it("builds one reusable template with subject-specific furniture", () => {
    const math = classroomConfig({ roomId: "algebra-204", grade: 8 });
    const lab = classroomConfig({ roomName: "Computer Lab", grade: 8 });
    expect(math.templateId).toBe(lab.templateId);
    expect(math.furniture.deskKind).toBe("desk");
    expect(lab.furniture.deskKind).toBe("computer");
    expect(math.decorations.length).toBeGreaterThan(0);
  });

  it("seats younger rooms in a single row", () => {
    expect(classroomConfig({ roomId: "algebra-204", grade: 2 }).furniture.rows).toBe(1);
    expect(classroomConfig({ roomId: "algebra-204", grade: 9 }).furniture.rows).toBe(2);
  });
});
