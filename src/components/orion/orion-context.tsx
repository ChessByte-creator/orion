import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { apiFetch, readDownload } from "@/lib/orion/api";
import { normalizeName } from "@/lib/orion/format";
import { decodeSignal, encodeSignal, signalStamp, type LogAction } from "@/lib/orion/signal";
import type { ChatMessage, ClockState, DownloadJob, Operator, SessionResponse } from "@/lib/orion/types";

type LinkState = "wait" | "on" | "off";

export type LogEntry = {
  id: number;
  at?: string;
  name: string;
  action: LogAction;
  subject: string;
};

export type Typer = {
  name: string;
  at: number;
};

type OrionValue = {
  playerName: string;
  adminToken: string;
  savedName: string;
  user: Operator | null;
  link: LinkState;
  clock: ClockState | null;
  messages: ChatMessage[];
  download: DownloadJob | null;
  folderTick: number;
  blackout: boolean;
  typers: Typer[];
  log: LogEntry[];
  connect: (raw: string) => Promise<string | null>;
  disconnect: () => void;
  sendPlayer: (text: string) => Promise<{ ok: boolean; code?: string }>;
  resetChat: () => void;
  bumpFolders: () => void;
  setClock: (clock: ClockState | null) => void;
  setDownload: (job: DownloadJob | null) => void;
  record: (action: LogAction, subject?: string) => void;
  pulseType: (alias?: string) => void;
  setTerminalDown: (down: boolean) => Promise<void>;
};

const OrionContext = createContext<OrionValue | null>(null);
const CONTROL_SENDERS = new Set(["[ORION-CONTROL]", "[NPC]"]);

function isOperator(value: unknown): value is Operator {
  if (!value || typeof value !== "object") return false;
  const row = value as Operator;
  return typeof row.ip === "string" && typeof row.current_name === "string";
}

function readClock(value: unknown): ClockState | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<ClockState>;
  return {
    fictionalTime: row.fictionalTime ?? null,
    realTimeAtSet: row.realTimeAtSet ?? null,
    running: row.running !== false,
  };
}

function actorName(message: ChatMessage) {
  if (CONTROL_SENDERS.has(message.sender) || message.sender.startsWith("[")) {
    return message.sender_alias?.trim() || "controle";
  }
  return message.sender;
}

export function OrionProvider({ children }: { children: ReactNode }) {
  const [playerName, setPlayerName] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [savedName, setSavedName] = useState("");
  const [user, setUser] = useState<Operator | null>(null);
  const [link, setLink] = useState<LinkState>("wait");
  const [clock, setClock] = useState<ClockState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [download, setDownload] = useState<DownloadJob | null>(null);
  const [folderTick, setFolderTick] = useState(0);
  const [chatEpoch, setChatEpoch] = useState(0);
  const [blackout, setBlackout] = useState(false);
  const [typers, setTypers] = useState<Typer[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const nameRef = useRef("");
  const adminRef = useRef("");
  const typeAt = useRef(0);
  const logAt = useRef({ key: "", at: 0 });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("admin")?.trim() || "";
    setAdminToken(token);
    adminRef.current = token;
    setSavedName(localStorage.getItem("operatorName") || "");
  }, []);

  useEffect(() => {
    nameRef.current = playerName;
  }, [playerName]);

  useEffect(() => {
    adminRef.current = adminToken;
  }, [adminToken]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setTypers((current) => (current.some((item) => now - item.at >= 8000) ? current.filter((item) => now - item.at < 8000) : current));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const takeSignal = useCallback((message: ChatMessage) => {
    const signal = decodeSignal(message.text);
    if (!signal) return false;
    if (signal.t === "down") {
      if (CONTROL_SENDERS.has(message.sender)) setBlackout(signal.v === 1);
      return true;
    }
    if (signal.t === "type") {
      const stamped = signalStamp(message.created_at);
      if (stamped != null && Date.now() - stamped > 8000) return true;
      const name = actorName(message);
      if (!name || name === nameRef.current) return true;
      setTypers((current) => {
        const next = current.filter((item) => item.name !== name);
        next.push({ name, at: Date.now() });
        return next;
      });
      return true;
    }
    setLog((current) => {
      if (current.some((item) => item.id === message.id)) return current;
      const next = [
        ...current,
        { id: message.id, at: message.created_at, name: actorName(message), action: signal.a, subject: signal.s || "" },
      ];
      return next.length > 400 ? next.slice(-400) : next;
    });
    return true;
  }, []);

  useEffect(() => {
    if (!playerName) return;
    let cancelled = false;
    let since = 0;
    const seen = new Set<number>();
    let inflight = false;

    async function tick() {
      if (inflight || cancelled) return;
      inflight = true;
      try {
        const data = await apiFetch<{
          error?: string;
          user?: Operator;
          messages?: ChatMessage[];
          clock?: ClockState;
          download?: unknown;
        }>(`/api/poll?sender=${encodeURIComponent(playerName)}&since=${since}`);
        if (cancelled) return;
        if (!data || (data.error && !data.user)) {
          setLink("off");
          return;
        }
        setLink("on");
        if (isOperator(data.user)) setUser(data.user);
        if (data.clock) setClock(readClock(data.clock));
        if ("download" in data) setDownload(readDownload(data.download));
        const incoming = (Array.isArray(data.messages) ? data.messages : []).slice().sort((a, b) => a.id - b.id);
        const fresh: ChatMessage[] = [];
        for (const message of incoming) {
          if (typeof message.id !== "number" || seen.has(message.id)) continue;
          seen.add(message.id);
          if (message.id > since) since = message.id;
          if (takeSignal(message)) continue;
          fresh.push(message);
        }
        if (fresh.length) {
          setMessages((prev) => {
            const real = [...prev.filter((item) => item.id > 0), ...fresh];
            const pending = prev.filter(
              (item) => item.id < 0 && !real.some((row) => row.sender === item.sender && row.text === item.text),
            );
            const merged = [...real, ...pending];
            return merged.length > 300 ? merged.slice(-300) : merged;
          });
        }
      } finally {
        inflight = false;
      }
    }

    void tick();
    const id = window.setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [playerName, chatEpoch, takeSignal]);

  const record = useCallback((action: LogAction, subject?: string) => {
    const name = nameRef.current;
    if (!name) return;
    const clean = subject?.trim().replace(/\s+/g, " ").slice(0, 140) || "";
    const key = `${action}|${clean}`;
    const now = Date.now();
    if (logAt.current.key === key && now - logAt.current.at < 1000) return;
    logAt.current = { key, at: now };
    void apiFetch("/api/chat", "POST", { sender: name, text: encodeSignal({ t: "log", a: action, s: clean || undefined }) });
  }, []);

  const pulseType = useCallback((alias?: string) => {
    const now = Date.now();
    if (now - typeAt.current < 2500) return;
    typeAt.current = now;
    if (alias !== undefined && adminRef.current) {
      void apiFetch(
        "/api/chat",
        "POST",
        { sender: "[ORION-CONTROL]", text: encodeSignal({ t: "type" }), sender_alias: alias.trim() || null },
        adminRef.current,
      );
      return;
    }
    const name = nameRef.current;
    if (!name) return;
    void apiFetch("/api/chat", "POST", { sender: name, text: encodeSignal({ t: "type" }) });
  }, []);

  const setTerminalDown = useCallback(async (down: boolean) => {
    setBlackout(down);
    if (!adminRef.current) return;
    await apiFetch(
      "/api/chat",
      "POST",
      { sender: "[ORION-CONTROL]", text: encodeSignal({ t: "down", v: down ? 1 : 0 }) },
      adminRef.current,
    );
    record(down ? "caiu" : "voltou");
  }, [record]);

  async function connect(raw: string) {
    const name = normalizeName(raw);
    if (!name) return "Identificador inválido. Use letras, números, _ ou -.";
    const res = await apiFetch<SessionResponse>("/api/session", "POST", { name });
    if (!res?.user || res.error) return "Não foi possível abrir a sessão.";
    localStorage.setItem("operatorName", name);
    setSavedName(name);
    setMessages([]);
    setLog([]);
    setTypers([]);
    setBlackout(false);
    nameRef.current = name;
    setPlayerName(name);
    setUser(res.user);
    setLink("on");
    void apiFetch("/api/chat", "POST", { sender: name, text: encodeSignal({ t: "log", a: "entrou" }) });
    return null;
  }

  function disconnect() {
    const name = nameRef.current;
    if (name) void apiFetch("/api/chat", "POST", { sender: name, text: encodeSignal({ t: "log", a: "saiu" }) });
    setPlayerName("");
    nameRef.current = "";
    setUser(null);
    setMessages([]);
    setDownload(null);
    setLog([]);
    setTypers([]);
    setBlackout(false);
    setLink("wait");
    setChatEpoch((value) => value + 1);
  }

  async function sendPlayer(text: string) {
    const trimmed = text.trim().slice(0, 300);
    if (!trimmed || !playerName) return { ok: false };
    if (user && !Number(user.can_write_chat)) return { ok: false, code: "CHAT_WRITE_BLOCKED" };
    const tempId = -Date.now();
    const optimistic: ChatMessage = {
      id: tempId,
      sender: playerName,
      text: trimmed,
      created_at: new Date().toISOString(),
      name_color: user?.name_color ?? null,
    };
    setMessages((prev) => [...prev, optimistic]);
    const res = await apiFetch<SessionResponse>("/api/chat", "POST", { sender: playerName, text: trimmed });
    if (!res || res.error) {
      setMessages((prev) => prev.filter((item) => item.id !== tempId));
      if (res?.user) setUser(res.user);
      return { ok: false, code: res?.code };
    }
    record("canal", trimmed);
    return { ok: true };
  }

  function resetChat() {
    setMessages([]);
    setLog([]);
    setTypers([]);
    setBlackout(false);
    setChatEpoch((value) => value + 1);
  }

  const value: OrionValue = {
    playerName,
    adminToken,
    savedName,
    user,
    link,
    clock,
    messages,
    download,
    folderTick,
    blackout,
    typers,
    log,
    connect,
    disconnect,
    sendPlayer,
    resetChat,
    bumpFolders: () => setFolderTick((value) => value + 1),
    setClock,
    setDownload,
    record,
    pulseType,
    setTerminalDown,
  };

  return <OrionContext.Provider value={value}>{children}</OrionContext.Provider>;
}

export function useOrion() {
  const ctx = useContext(OrionContext);
  if (!ctx) throw new Error("Terminal fora do contexto.");
  return ctx;
}
