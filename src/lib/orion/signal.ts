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
] as const;

export type LogAction = (typeof LOG_ACTIONS)[number];

export type Signal =
  | { t: "down"; v: 0 | 1 }
  | { t: "type" }
  | { t: "log"; a: LogAction; s?: string };

const MARK = "\u2063orion:";

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
    if (value.t === "down") return { t: "down", v: value.v === 1 ? 1 : 0 };
    if (value.t === "type") return { t: "type" };
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
