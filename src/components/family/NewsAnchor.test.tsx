import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NewsAnchor } from "@/components/family/NewsAnchor";
import { DEFAULT_MASCOT } from "@/lib/mascot";

describe("NewsAnchor", () => {
  it("renders the mascot desk and flags speaking state", () => {
    const { rerender } = render(<NewsAnchor mascot={DEFAULT_MASCOT} speaking={false} />);
    expect(screen.getByTestId("news-anchor").dataset["speaking"]).toBe("no");
    rerender(<NewsAnchor mascot={{ color: "sage", accessory: "cap" }} speaking />);
    expect(screen.getByTestId("news-anchor").dataset["speaking"]).toBe("yes");
    expect(screen.getByTestId("anchor-accessory")).toBeTruthy();
  });
});
