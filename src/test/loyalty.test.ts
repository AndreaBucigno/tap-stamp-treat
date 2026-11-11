import { describe, expect, it } from "vitest";
import { cardToken, rewardDescription } from "@/lib/loyalty";

describe("Loyalty inputs", () => {
  const token = "de2b2d54-4ab3-4dba-9eab-bf7d2851cef4";
  it("accepts customer card links and standalone tokens, not unrelated QR data", () => {
    expect(cardToken(`https://example.com/card/${token}`)).toBe(token);
    expect(cardToken(token)).toBe(token);
    expect(cardToken(`https://example.com/join/${token}`)).toBeNull();
  });
  it("keeps the owner's gift description", () => {
    expect(rewardDescription("gift", " Un cappuccino ")).toBe("Un cappuccino");
    expect(rewardDescription("gift", " ")).toBeNull();
  });
  it("accepts percentage discounts only between 1 and 100", () => {
    expect(rewardDescription("discount", "20")).toBe("Sconto del 20%");
    expect(rewardDescription("discount", "1")).toBe("Sconto del 1%");
    expect(rewardDescription("discount", "100")).toBe("Sconto del 100%");
    expect(rewardDescription("discount", "0")).toBeNull();
    expect(rewardDescription("discount", "101")).toBeNull();
  });
});