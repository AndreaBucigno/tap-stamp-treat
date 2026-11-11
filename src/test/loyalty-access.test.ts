import { describe, expect, it } from "vitest";

const url = process.env['LOYALTY_TEST_URL'];
const key = process.env['LOYALTY_TEST_KEY'];
const owner = process.env['LOYALTY_TEST_OWNER'];
const token = process.env['LOYALTY_TEST_CARD'];
const otherCard = process.env['LOYALTY_TEST_OTHER_CARD'];

describe.skipIf(!url || !key || !owner || !token)("Live loyalty rules", () => {
  async function rpc(name: string, body: object, signedIn: boolean) {
    const headers: Record<string, string> = { apikey: key ?? "", "Content-Type": "application/json" };
    if (signedIn) headers['Authorization'] = `Bearer ${owner}`;
    const response = await fetch(`${url}/rest/v1/rpc/${name}`, { method: "POST", headers, body: JSON.stringify(body) });
    return { ok: response.ok, data: await response.json() };
  }
  it("denies stamping without a signed-in owner", async () => {
    expect((await rpc("add_stamp", { _token: token }, false)).ok).toBe(false);
  });
  it("denies reward delivery without a signed-in owner", async () => {
    expect((await rpc("redeem_reward", { _token: token, _kind: "gift", _description: "Caffè" }, false)).ok).toBe(false);
  });
  it("denies stamping cards belonging to a different venue", async () => {
    expect((await rpc("add_stamp", { _token: otherCard }, true)).ok).toBe(false);
  });
  it("keeps the completed card at exactly 10 purchases", async () => {
    const card = await rpc("get_card", { _token: token }, false);
    expect(card.data[0].stamps).toBe(10);
    expect(card.data[0].stamps_required).toBe(10);
    expect((await rpc("add_stamp", { _token: token }, true)).ok).toBe(false);
    expect((await rpc("get_card", { _token: token }, false)).data[0].stamps).toBe(10);
  });
});