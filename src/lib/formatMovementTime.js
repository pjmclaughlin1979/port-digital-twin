export function formatMovementTime(epochMs) {
  if (!epochMs) return "—";
  const date = new Date(epochMs);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
