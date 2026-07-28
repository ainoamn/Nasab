import { beforeEach, describe, expect, it } from "vitest";
import {
  dismissTodayEvents,
  isTodayEventsDismissed,
} from "@/lib/dismissedTodayEvents";

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

describe("dismissedTodayEvents", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it("is false until dismissed for today", () => {
    expect(isTodayEventsDismissed(1)).toBe(false);
    dismissTodayEvents(1);
    expect(isTodayEventsDismissed(1)).toBe(true);
  });

  it("uses a day-keyed storage entry", () => {
    const store = mockLocalStorage();
    dismissTodayEvents(4);
    const keys = [...store.keys()];
    expect(keys.some((k) => k.startsWith("nasab:todayEventsDismissed:4:"))).toBe(
      true,
    );
  });
});
