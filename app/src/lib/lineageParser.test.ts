import { describe, expect, it } from "vitest";
import {
  lineageAncestorsToCreate,
  parseLineageChain,
} from "@/lib/lineageParser";

describe("parseLineageChain compound names", () => {
  it("keeps عبد الرحمن as one segment", () => {
    const p = parseLineageChain("بن عبد الرحمن بن محمد");
    expect(p.segments.map((s) => s.givenName)).toEqual([
      "عبد الرحمن",
      "محمد",
    ]);
  });

  it("keeps عبد الله as one segment", () => {
    const p = parseLineageChain("بن عبد الله بن سالم");
    expect(p.segments.map((s) => s.givenName)).toEqual(["عبد الله", "سالم"]);
  });

  it("keeps عبد الحميد as one segment", () => {
    const p = parseLineageChain("بن عبد الحميد بن حمود");
    expect(p.segments.map((s) => s.givenName)).toEqual([
      "عبد الحميد",
      "حمود",
    ]);
  });

  it("keeps أبو بكر as one segment", () => {
    const p = parseLineageChain("بن أبو بكر بن علي");
    expect(p.segments.map((s) => s.givenName)).toEqual(["أبو بكر", "علي"]);
  });

  it("does not invent generations from compound names", () => {
    const ancestors = lineageAncestorsToCreate(
      "بن عبد الحميد بن حمود بن حمدان",
      "male",
    );
    expect(ancestors.map((a) => a.givenName)).toEqual([
      "عبد الحميد",
      "حمود",
      "حمدان",
    ]);
  });
});
