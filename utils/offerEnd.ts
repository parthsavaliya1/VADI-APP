/**
 * Parses API deadline fields into epoch ms when the value is a real date/time.
 * Includes past dates (caller decides whether to show countdown vs "ended").
 */
export function parseOfferEndToMs(raw: unknown): number | null {
  if (raw == null || raw === "") return null;

  let ms: number;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const n = raw;
    // Values in this range are almost always Unix *seconds*; ms timestamps are ~1.7e12+ in the 2020s.
    ms = n > 0 && n < 1e12 ? Math.round(n * 1000) : n;
  } else if (typeof raw === "string") {
    ms = new Date(raw).getTime();
  } else if (typeof raw === "object" && raw !== null && "$date" in raw) {
    const v = (raw as { $date: string | number }).$date;
    if (typeof v === "number" && Number.isFinite(v)) {
      ms = v > 0 && v < 1e12 ? Math.round(v * 1000) : v;
    } else {
      ms = new Date(String(v)).getTime();
    }
  } else if (raw instanceof Date) {
    ms = raw.getTime();
  } else {
    return null;
  }

  if (!Number.isFinite(ms)) return null;
  return ms;
}

/** Same as parseOfferEndToMs but only if the deadline is still in the future. */
export function offerDeadlineToFutureMs(raw: unknown): number | null {
  const ms = parseOfferEndToMs(raw);
  if (ms == null) return null;
  return ms > Date.now() ? ms : null;
}

/** Reads offer end from product payloads (camelCase or snake_case). */
export function getProductOfferEndRaw(product: unknown): unknown {
  if (!product || typeof product !== "object") return null;
  const p = product as Record<string, unknown>;
  return p.offerEndsAt ?? p.offer_ends_at ?? null;
}

/** Days + clock within the current day (h is 0–23 when d > 0). */
export type CountdownDHMS = { d: number; h: number; m: number; s: number };

/**
 * Converts remaining time into days + h:m:s within the day.
 * Use `roundUpToFullSecond` to match UI that treats sub-second as the next whole second.
 */
export function remainingMsToCountdownDHMS(
  remainingMs: number,
  opts?: { roundUpToFullSecond?: boolean },
): CountdownDHMS {
  const ms = Math.max(0, remainingMs);
  const totalSec =
    opts?.roundUpToFullSecond === true
      ? Math.floor((ms + 999) / 1000)
      : Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const r = totalSec % 86400;
  const h = Math.floor(r / 3600);
  const m = Math.floor((r % 3600) / 60);
  const s = r % 60;
  return { d, h, m, s };
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** e.g. `10d 05:30:45` or `05:30:45` when under one day. */
export function formatOfferCountdownShort(
  remainingMs: number,
  opts?: { roundUpToFullSecond?: boolean },
): string {
  const { d, h, m, s } = remainingMsToCountdownDHMS(remainingMs, opts);
  if (d > 0) return `${d}d ${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}
