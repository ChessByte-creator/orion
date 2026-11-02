export const LOG_ACTIONS = [
  "entrou",
  "saiu",
  "pasta",
  "senha-pasta",
  "arquivo",
  "senha-arquivo",
  "corrompido",
  "bloqueado",
  "canal",
  "envio",
  "envio-pct",
  "envio-ok",
  "envio-fail",
  "envio-off",
  "caiu",
  "voltou",
  "posto",
] as const;

export type LogAction = (typeof LOG_ACTIONS)[number];

export type Signal =
  | { t: "down"; v: 0 | 1; who: string; m?: string }
  | { t: "type" }
  | { t: "seat"; who: string }
  | { t: "view"; path: number[]; names: string[]; doc: number | null; title?: string }
  | { t: "log"; a: LogAction; s?: string };

const MARK = "\u2063orion:";

function cleanWho(value: unknown, allowEmpty: boolean) {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (raw === "*") return "*";
  const name = raw.replace(/[^A-Z0-9_-]/g, "").slice(0, 20);
  if (name) return name;
  return allowEmpty ? "" : "*";
}

export function encodeSignal(signal: Signal): string {
  return MARK + JSON.stringify(signal);
}

export function isSignal(text: string | null | undefined): boolean {
  return typeof text === "string" && text.startsWith(MARK);
}

export function decodeSignal(text: string | null | undefined): Signal | null {
  if (typeof text !== "string" || !text.startsWith(MARK)) return null;
  try {
    const value = JSON.parse(text.slice(MARK.length)) as Partial<Signal>;
    if (value.t === "down") {
      const message = typeof value.m === "string" ? value.m.slice(0, 140) : undefined;
      return { t: "down", v: value.v === 1 ? 1 : 0, who: cleanWho(value.who, false), m: message };
    }
    if (value.t === "type") return { t: "type" };
    if (value.t === "seat") return { t: "seat", who: cleanWho(value.who, true) };
    if (value.t === "view" && Array.isArray(value.path) && Array.isArray(value.names)) {
      const path = value.path.filter((item) => typeof item === "number").slice(0, 12);
      const names = value.names.filter((item) => typeof item === "string").map((item) => item.slice(0, 24)).slice(0, 12);
      const doc = typeof value.doc === "number" ? value.doc : null;
      const title = typeof value.title === "string" ? value.title.slice(0, 60) : undefined;
      return { t: "view", path, names, doc, title };
    }
    if (value.t === "log" && LOG_ACTIONS.includes(value.a as LogAction)) {
      const subject = typeof value.s === "string" ? value.s.slice(0, 140) : undefined;
      return { t: "log", a: value.a as LogAction, s: subject };
    }
  } catch {
    return null;
  }
  return null;
}

export function signalStamp(created?: string): number | null {
  if (!created) return Date.now();
  const iso = created.includes("T") ? created : `${created.replace(" ", "T")}Z`;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? null : parsed;
}
