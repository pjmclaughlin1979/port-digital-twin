import { formatMovementTime } from "./formatMovementTime.js";

// A lightweight, rule-based stand-in for a real "data exploration" LLM
// agent (Esri's own arcgis-assistant-data-exploration-agent requires a
// signed-in ArcGIS Online named user and only supports 2D web maps —
// neither of which fits this public, anonymous 3D scene). It pattern-
// matches a handful of question shapes against the vessels feature layer
// and the shipping-schedule feature layer, which covers the same two
// datasets the real agent would be scoped to.

export const SUGGESTED_PROMPTS = [
  "How many cargo vessels are in the harbour?",
  "What's arriving next?",
  "List today's departures",
];

const VESSEL_TYPE_KEYWORDS = [
  "cargo",
  "tanker",
  "fishing",
  "passenger",
  "cruise",
  "tug",
  "pilot",
  "yacht",
  "sailing",
  "military",
  "pleasure craft",
  "high speed craft",
];

const findTypeKeyword = (text) => VESSEL_TYPE_KEYWORDS.find((keyword) => text.includes(keyword)) ?? null;

const escapeSql = (value) => value.replace(/'/g, "''");

function describeMovement(movement) {
  const route = `${movement.FROM_LOC?.trim() || "—"} → ${movement.TO_LOC?.trim() || "—"}`;
  const time = formatMovementTime(movement.SRT);
  const kind =
    movement.MOVE_TYPE === "ARRIVAL"
      ? "arriving"
      : movement.MOVE_TYPE === "DEPARTURE"
        ? "departing"
        : "moving";
  return `${movement.VESSEL} is ${kind} at ${time} (${route})`;
}

function describeMovementList(list, label) {
  if (list.length === 0) return { text: `There are no ${label}s currently scheduled.` };
  const items = list.slice(0, 8).map((m) => `${m.VESSEL} (${formatMovementTime(m.SRT)})`);
  const suffix = list.length > 8 ? `, and ${list.length - 8} more` : "";
  return {
    text: `${list.length} ${label}${list.length === 1 ? "" : "s"}: ${items.join(", ")}${suffix}.`,
  };
}

// Resolves a natural-language-ish question into an answer, querying the
// live vessels layer on demand (via `queryVessels`) and the already-loaded
// shipping schedule (`movements`). Returns { text, vessel?, movement? } —
// the optional vessel/movement lets the panel offer a "Locate on map"
// action for a specific result, reusing the same selection flow as the
// Vessel Finder and Shipping Schedule lists.
export async function answerAssistantQuestion(question, { queryVessels, movements }) {
  const lower = question.trim().toLowerCase();
  if (!lower) {
    return { text: "Ask me something about the vessels in the harbour or the shipping schedule." };
  }

  const arrivals = movements?.arrivals ?? [];
  const departures = movements?.departures ?? [];
  const other = movements?.other ?? [];
  const allMovements = [...arrivals, ...departures, ...other];

  // "where is / find / locate / show me <vessel>"
  const findMatch = lower.match(/\b(?:where is|where's|find|locate|show me)\b\s+(?:the\s+)?(.+?)\??$/);
  if (findMatch) {
    const name = findMatch[1].replace(/\bvessel\b|\bship\b/g, "").trim();
    if (name) {
      const vessels = await queryVessels(`UPPER(NAME) LIKE UPPER('%${escapeSql(name)}%')`);
      if (vessels.length === 1) {
        const vessel = vessels[0];
        return {
          text: `${vessel.name} (${vessel.type}) is currently ${
            vessel.status ? `${vessel.status.toLowerCase()}, ` : ""
          }doing ${vessel.speed ?? "an unknown"} knots${
            vessel.destination ? `, bound for ${vessel.destination}` : ""
          }.`,
          vessel,
        };
      }
      if (vessels.length > 1) {
        return {
          text: `Found ${vessels.length} vessels matching "${name}": ${vessels
            .map((v) => v.name)
            .join(", ")}.`,
        };
      }
      const scheduled = allMovements.find((m) => m.VESSEL?.toLowerCase().includes(name));
      if (scheduled) {
        return {
          text: `${scheduled.VESSEL} isn't currently broadcasting AIS, but it's on the shipping schedule — ${describeMovement(scheduled)}.`,
          movement: scheduled,
        };
      }
      return { text: `I couldn't find a vessel matching "${name}" in the harbour or the shipping schedule.` };
    }
  }

  // "how many <type?> vessels/ships/boats" (not the schedule)
  if (/\bhow many\b.*\b(vessel|ship|boat)s?\b/.test(lower) && !/(arriv|depart|schedul)/.test(lower)) {
    const typeKeyword = findTypeKeyword(lower);
    const where = typeKeyword ? `UPPER(TYPE) LIKE UPPER('%${escapeSql(typeKeyword)}%')` : "1=1";
    const vessels = await queryVessels(where);
    const label = typeKeyword ? `${typeKeyword} vessel` : "vessel";
    return {
      text: `There ${vessels.length === 1 ? "is" : "are"} ${vessels.length} ${label}${
        vessels.length === 1 ? "" : "s"
      } currently broadcasting AIS in the harbour.`,
    };
  }

  // "list/show/which/what vessels" (not the schedule)
  if (/\b(list|show|which|what)\b.*\bvessel/.test(lower) && !/(arriv|depart|schedul)/.test(lower)) {
    const typeKeyword = findTypeKeyword(lower);
    const where = typeKeyword ? `UPPER(TYPE) LIKE UPPER('%${escapeSql(typeKeyword)}%')` : "1=1";
    const vessels = await queryVessels(where);
    const label = typeKeyword ? `${typeKeyword} vessel` : "vessel";
    if (vessels.length === 0) {
      return { text: `No ${label}s are currently broadcasting AIS in the harbour.` };
    }
    const names = vessels.slice(0, 10).map((v) => v.name);
    const suffix = vessels.length > 10 ? `, and ${vessels.length - 10} more` : "";
    return {
      text: `${vessels.length} ${label}${vessels.length === 1 ? "" : "s"}: ${names.join(", ")}${suffix}.`,
    };
  }

  // "what's/who's arriving or departing next"
  if (/\bnext\b.*\barriv/.test(lower) || /\barriving next\b/.test(lower)) {
    const next = [...arrivals].sort((a, b) => a.SRT - b.SRT)[0];
    return next
      ? { text: `Next arrival: ${describeMovement(next)}.`, movement: next }
      : { text: "There are no scheduled arrivals right now." };
  }
  if (/\bnext\b.*\bdepart/.test(lower) || /\bdeparting next\b/.test(lower)) {
    const next = [...departures].sort((a, b) => a.SRT - b.SRT)[0];
    return next
      ? { text: `Next departure: ${describeMovement(next)}.`, movement: next }
      : { text: "There are no scheduled departures right now." };
  }

  // "how many arrivals/departures"
  if (/\bhow many\b.*\barriv/.test(lower)) {
    return {
      text: `There ${arrivals.length === 1 ? "is" : "are"} ${arrivals.length} arrival${
        arrivals.length === 1 ? "" : "s"
      } on the shipping schedule.`,
    };
  }
  if (/\bhow many\b.*\bdepart/.test(lower)) {
    return {
      text: `There ${departures.length === 1 ? "is" : "are"} ${departures.length} departure${
        departures.length === 1 ? "" : "s"
      } on the shipping schedule.`,
    };
  }

  // "when is <vessel> arriving/departing/due"
  const whenMatch = lower.match(/\bwhen\b.*?\b(?:is|are)\b\s+(.+?)\s+\b(arriving|departing|due|expected)\b/);
  if (whenMatch) {
    const name = whenMatch[1].trim();
    const scheduled = allMovements.find((m) => m.VESSEL?.toLowerCase().includes(name));
    return scheduled
      ? { text: `${describeMovement(scheduled)}.`, movement: scheduled }
      : { text: `I couldn't find "${name}" on the shipping schedule.` };
  }

  // "list/show/what arrivals/departures"
  if (/\b(list|show|what)\b.*\barriv/.test(lower)) {
    return describeMovementList(arrivals, "arrival");
  }
  if (/\b(list|show|what)\b.*\bdepart/.test(lower)) {
    return describeMovementList(departures, "departure");
  }

  return {
    text:
      "I can only answer questions about vessels currently in the harbour and the Port of Cork shipping schedule. Try things like \"How many cargo vessels are there?\", \"Where is the [vessel]?\", or \"What's arriving next?\"",
  };
}
