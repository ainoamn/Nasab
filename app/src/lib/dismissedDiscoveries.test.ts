import { beforeEach, describe, expect, it } from "vitest";
import {
  clearDismissedDiscoveries,
  discoveryDismissKey,
  dismissDiscoveryKey,
  getDismissedDiscoveryKeys,
} from "@/lib/dismissedDiscoveries";

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
}

describe("dismissedDiscoveries", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it("builds stable dismiss keys", () => {
    expect(discoveryDismissKey("possibleTwin", 3, 4)).toBe("possibleTwin:3:4");
    expect(discoveryDismissKey("noPhoto", 3)).toBe("noPhoto:3:0");
  });

  it("dismisses with dedupe and clears", () => {
    const key = discoveryDismissKey("possibleTwin", 1, 2);
    expect(dismissDiscoveryKey(7, key)).toEqual([key]);
    expect(dismissDiscoveryKey(7, key)).toEqual([key]);
    expect(getDismissedDiscoveryKeys(7)).toEqual([key]);
    expect(clearDismissedDiscoveries(7)).toEqual([]);
    expect(getDismissedDiscoveryKeys(7)).toEqual([]);
  });

  it("caps at 200 and recovers from bad JSON", () => {
    for (let i = 0; i < 210; i++) {
      dismissDiscoveryKey(1, `k:${i}`);
    }
    expect(getDismissedDiscoveryKeys(1)).toHaveLength(200);
    localStorage.setItem("nasab:dismissedDiscoveries:3", "{bad");
    expect(getDismissedDiscoveryKeys(3)).toEqual([]);
  });
});
