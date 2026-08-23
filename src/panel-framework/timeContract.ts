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
