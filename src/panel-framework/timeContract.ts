export const RFC3339_WITH_TIMEZONE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(?:(Z)|([+-])(\d{2}):(\d{2}))$/;

export function parseRfc3339Timestamp(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const timestamp = value.trim();
  const match = RFC3339_WITH_TIMEZONE.exec(timestamp);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fractionText, utcMarker, offsetSign, offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour = Number(offsetHourText || 0);
  const offsetMinute = Number(offsetMinuteText || 0);
  const milliseconds = Number((fractionText || "").slice(0, 3).padEnd(3, "0"));
  if (year < 1 || hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59) return null;
  const calendar = new Date(0);
  calendar.setUTCHours(hour, minute, second, milliseconds);
  calendar.setUTCFullYear(year, month - 1, day);
  if (
    calendar.getUTCFullYear() !== year ||
    calendar.getUTCMonth() !== month - 1 ||
    calendar.getUTCDate() !== day ||
    calendar.getUTCHours() !== hour ||
    calendar.getUTCMinutes() !== minute ||
    calendar.getUTCSeconds() !== second ||
    calendar.getUTCMilliseconds() !== milliseconds
  ) return null;
  const offsetMilliseconds = (offsetHour * 60 + offsetMinute) * 60_000;
  const parsed = calendar.getTime() - (utcMarker ? 0 : offsetSign === "+" ? offsetMilliseconds : -offsetMilliseconds);
  return Number.isFinite(parsed) ? parsed : null;
}

function localTimeParts(timestamp: number): {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
  offset: string;
} | null {
  if (!Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return null;
  const pad = (part: number) => String(part).padStart(2, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? "+" : "-";
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetRemainder = Math.abs(offsetMinutes) % 60;
  return {
    year: String(date.getFullYear()),
    month: pad(date.getMonth() + 1),
    day: pad(date.getDate()),
    hour: pad(date.getHours()),
    minute: pad(date.getMinutes()),
    second: pad(date.getSeconds()),
    offset: offsetSign + pad(offsetHours) + ":" + pad(offsetRemainder),
  };
}

export function formatRfc3339Local(value: unknown): string | null {
  const timestamp = parseRfc3339Timestamp(value);
  const parts = timestamp === null ? null : localTimeParts(timestamp);
  return parts ? `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} ${parts.offset}` : null;
}

export function formatRfc3339LocalTime(value: unknown): string | null {
  const timestamp = parseRfc3339Timestamp(value);
  const parts = timestamp === null ? null : localTimeParts(timestamp);
  return parts ? `${parts.hour}:${parts.minute}:${parts.second}` : null;
}

export function isRfc3339Timestamp(value: unknown): value is string {
  return parseRfc3339Timestamp(value) !== null;
}

// --- Legacy collector timestamp tolerance ----------------------------------
// The vanilla collector (ros_panel) predates the strict RFC 3339 contract in
// three shapes: naive local "YYYY-MM-DD HH:MM:SS", time-only "HH:MM:SS"
// (today), RouterOS "mmm/dd HH:MM:SS" (today), plus bare epoch seconds.
// runtime/legacyContract.ts converts them at the fetch boundary; the parsing
// lives here so both schema and runtime share one definition.

const LEGACY_NAIVE_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;
const LEGACY_TIME_ONLY_TIMESTAMP = /^(\d{2}):(\d{2}):(\d{2})$/;
const LEGACY_ROUTEROS_TIMESTAMP = /^([a-z]{3})\/(\d{1,2})[ T](\d{2}):(\d{2}):(\d{2})$/i;
const LEGACY_ROUTEROS_MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const LEGACY_EPOCH_SECONDS_MIN = 1_000_000_000;
const LEGACY_EPOCH_SECONDS_MAX = 9_999_999_999;

export function parseLegacyTimestampMs(value: unknown, nowMs: number): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < LEGACY_EPOCH_SECONDS_MIN || value > LEGACY_EPOCH_SECONDS_MAX) return null;
    return Math.round(value * 1000);
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  const naive = LEGACY_NAIVE_TIMESTAMP.exec(text);
  if (naive) {
    const [, yearText, monthText, dayText, hourText, minuteText, secondText] = naive;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const parsed = new Date(year, month - 1, day, Number(hourText), Number(minuteText), Number(secondText));
    return Number.isFinite(parsed.getTime()) && parsed.getDate() === day && parsed.getMonth() === month - 1
      ? parsed.getTime()
      : null;
  }
  const timeOnly = LEGACY_TIME_ONLY_TIMESTAMP.exec(text);
  if (timeOnly) {
    const now = new Date(nowMs);
    const parsed = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(timeOnly[1]), Number(timeOnly[2]), Number(timeOnly[3]));
    return Number.isFinite(parsed.getTime()) ? parsed.getTime() : null;
  }
  const routeros = LEGACY_ROUTEROS_TIMESTAMP.exec(text);
  if (routeros) {
    const month = LEGACY_ROUTEROS_MONTHS[routeros[1].toLowerCase()];
    if (!month) return null;
    const day = Number(routeros[2]);
    const now = new Date(nowMs);
    const parsed = new Date(now.getFullYear(), month - 1, day, Number(routeros[3]), Number(routeros[4]), Number(routeros[5]));
    return Number.isFinite(parsed.getTime()) && parsed.getDate() === day && parsed.getMonth() === month - 1
      ? parsed.getTime()
      : null;
  }
  return null;
}

export function formatRfc3339FromEpochMs(ms: number): string | null {
  const parts = Number.isFinite(ms) ? localTimeParts(ms) : null;
  if (!parts) return null;
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${parts.offset}`;
}
