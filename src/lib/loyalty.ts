export function cardToken(text: string): string | null {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuid.test(text.trim())) return text.trim();
  try {
    const url = new URL(text.trim());
    const token = url.pathname.match(/^\/card\/([^/]+)\/?$/)?.[1];
    return token && uuid.test(token) ? token : null;
  } catch { return null; }
}

export function rewardDescription(kind: "gift" | "discount", value: string): string | null {
  if (kind === "gift") return value.trim() || null;
  const amount = Number(value);
  return value.trim() && Number.isFinite(amount) && amount >= 1 && amount <= 100
    ? `Sconto del ${amount}%` : null;
}