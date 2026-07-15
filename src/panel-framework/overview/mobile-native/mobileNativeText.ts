export function compactMessage(value: unknown, fallback = "未记录"): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim() || fallback;
  const parts = normalized.split(/[;；]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return normalized;
  return [...new Set(parts)].join("；");
}
