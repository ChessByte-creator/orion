import type { ClockState } from "@/lib/orion/types";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function normalizeName(name: string) {
  return name.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 20);
}

export function safeColor(value?: string | null) {
  if (value && /^#[0-9a-fA-F]{6}$/.test(value)) return value;
  return undefined;
}

export function safeImage(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return url;
  } catch {
    return null;
  }
  return null;
}

export function parseDbDate(ts?: string | null) {
  if (!ts) return null;
  let s = String(ts).trim();
  if (!/Z$|[+-]\d{2}:\d{2}$/.test(s)) s = `${s.replace(" ", "T")}Z`;
  const date = new Date(s);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function fmtTime(ts?: string | null) {
  const date = parseDbDate(ts);
  if (!date) return "--:--";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function fmtDateTime(ts?: string | null) {
  const date = parseDbDate(ts);
  if (!date) return "--";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ago(ts?: string | null) {
  const date = parseDbDate(ts);
  if (!date) return "--";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 45) return "agora";
  if (seconds < 3600) return `há ${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `há ${Math.round(seconds / 3600)} h`;
  return fmtDateTime(ts);
}

export function seenRecently(ts?: string | null, windowMs = 180000) {
  const date = parseDbDate(ts);
  if (!date) return false;
  return Date.now() - date.getTime() < windowMs;
}

export function fictionalNow(clock: ClockState | null) {
  if (!clock?.fictionalTime) return new Date();
  const fictional = new Date(clock.fictionalTime);
  if (Number.isNaN(fictional.getTime())) return new Date();
  if (!clock.running) return fictional;
  const anchor = clock.realTimeAtSet ? new Date(clock.realTimeAtSet) : null;
  if (!anchor || Number.isNaN(anchor.getTime())) return fictional;
  return new Date(fictional.getTime() + (Date.now() - anchor.getTime()));
}

export function toDatetimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatDocDate(doc: { custom_date?: string | null; created_at?: string | null }) {
  if (doc.custom_date && /^\d{4}-\d{2}-\d{2}$/.test(doc.custom_date)) {
    const [y, m, d] = doc.custom_date.split("-");
    return `${d}/${m}/${y}`;
  }
  const parsed = parseDbDate(doc.created_at);
  return parsed ? parsed.toLocaleDateString("pt-BR") : "—";
}

const GLITCH = "█▓▒░╬╫╪┼╩╦╣╠═║╗╔╝╚▄▀■□▪▫";

export function glitchBlock() {
  const lines: string[] = [];
  for (let i = 0; i < 10; i++) {
    const len = 42 + Math.floor(Math.random() * 28);
    let line = "";
    for (let j = 0; j < len; j++) line += GLITCH[Math.floor(Math.random() * GLITCH.length)];
    lines.push(line);
  }
  return lines.join("\n");
}
