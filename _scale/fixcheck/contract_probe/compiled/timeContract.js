"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/panel-framework/timeContract.ts
var timeContract_exports = {};
__export(timeContract_exports, {
  RFC3339_WITH_TIMEZONE: () => RFC3339_WITH_TIMEZONE,
  formatRfc3339FromEpochMs: () => formatRfc3339FromEpochMs,
  formatRfc3339Local: () => formatRfc3339Local,
  formatRfc3339LocalTime: () => formatRfc3339LocalTime,
  isRfc3339Timestamp: () => isRfc3339Timestamp,
  parseLegacyTimestampMs: () => parseLegacyTimestampMs,
  parseRfc3339Timestamp: () => parseRfc3339Timestamp
});
module.exports = __toCommonJS(timeContract_exports);
var RFC3339_WITH_TIMEZONE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(?:(Z)|([+-])(\d{2}):(\d{2}))$/;
function parseRfc3339Timestamp(value) {
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
  const calendar = /* @__PURE__ */ new Date(0);
  calendar.setUTCHours(hour, minute, second, milliseconds);
  calendar.setUTCFullYear(year, month - 1, day);
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day || calendar.getUTCHours() !== hour || calendar.getUTCMinutes() !== minute || calendar.getUTCSeconds() !== second || calendar.getUTCMilliseconds() !== milliseconds) return null;
  const offsetMilliseconds = (offsetHour * 60 + offsetMinute) * 6e4;
  const parsed = calendar.getTime() - (utcMarker ? 0 : offsetSign === "+" ? offsetMilliseconds : -offsetMilliseconds);
  return Number.isFinite(parsed) ? parsed : null;
}
function localTimeParts(timestamp) {
  if (!Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return null;
  const pad = (part) => String(part).padStart(2, "0");
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
    offset: offsetSign + pad(offsetHours) + ":" + pad(offsetRemainder)
  };
}
function formatRfc3339Local(value) {
  const timestamp = parseRfc3339Timestamp(value);
  const parts = timestamp === null ? null : localTimeParts(timestamp);
  return parts ? `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} ${parts.offset}` : null;
}
function formatRfc3339LocalTime(value) {
  const timestamp = parseRfc3339Timestamp(value);
  const parts = timestamp === null ? null : localTimeParts(timestamp);
  return parts ? `${parts.hour}:${parts.minute}:${parts.second}` : null;
}
function isRfc3339Timestamp(value) {
  return parseRfc3339Timestamp(value) !== null;
}
var LEGACY_NAIVE_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;
var LEGACY_TIME_ONLY_TIMESTAMP = /^(\d{2}):(\d{2}):(\d{2})$/;
var LEGACY_ROUTEROS_TIMESTAMP = /^([a-z]{3})\/(\d{1,2})[ T](\d{2}):(\d{2}):(\d{2})$/i;
var LEGACY_ROUTEROS_MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
var LEGACY_EPOCH_SECONDS_MIN = 1e9;
var LEGACY_EPOCH_SECONDS_MAX = 9999999999;
function parseLegacyTimestampMs(value, nowMs) {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < LEGACY_EPOCH_SECONDS_MIN || value > LEGACY_EPOCH_SECONDS_MAX) return null;
    return Math.round(value * 1e3);
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
    return Number.isFinite(parsed.getTime()) && parsed.getDate() === day && parsed.getMonth() === month - 1 ? parsed.getTime() : null;
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
    return Number.isFinite(parsed.getTime()) && parsed.getDate() === day && parsed.getMonth() === month - 1 ? parsed.getTime() : null;
  }
  return null;
}
function formatRfc3339FromEpochMs(ms) {
  const parts = Number.isFinite(ms) ? localTimeParts(ms) : null;
  if (!parts) return null;
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${parts.offset}`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RFC3339_WITH_TIMEZONE,
  formatRfc3339FromEpochMs,
  formatRfc3339Local,
  formatRfc3339LocalTime,
  isRfc3339Timestamp,
  parseLegacyTimestampMs,
  parseRfc3339Timestamp
});
