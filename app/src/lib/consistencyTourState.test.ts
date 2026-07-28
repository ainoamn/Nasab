import { beforeEach, describe, expect, it } from "vitest";
import {
  getConsistencyTourState,
  setConsistencyTourState,
} from "@/lib/consistencyTourState";

function mockLocalStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    },
    configurable: true,
  });
  return store;
}

describe("consistencyTourState", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it("persists scope and index", () => {
    setConsistencyTourState(3, { scope: "all", index: 4 });
    expect(getConsistencyTourState(3)).toEqual({ scope: "all", index: 4 });
  });

  it("defaults on invalid JSON scope and negative index", () => {
    expect(getConsistencyTourState(1)).toEqual({ scope: "close", index: 0 });
    localStorage.setItem("nasab:consistencyTour:2", "{bad");
    expect(getConsistencyTourState(2)).toEqual({ scope: "close", index: 0 });
    localStorage.setItem(
      "nasab:consistencyTour:5",
      JSON.stringify({ scope: "weird", index: -2 }),
    );
    expect(getConsistencyTourState(5)).toEqual({ scope: "close", index: 0 });
  });
});
