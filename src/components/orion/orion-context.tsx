import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch, readDownload } from "@/lib/orion/api";
import { normalizeName } from "@/lib/orion/format";
import type { ChatMessage, ClockState, DownloadJob, Operator, SessionResponse } from "@/lib/orion/types";

type LinkState = "wait" | "on" | "off";

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
  connect: (raw: string) => Promise<string | null>;
  disconnect: () => void;
  sendPlayer: (text: string) => Promise<{ ok: boolean; code?: string }>;
  resetChat: () => void;
  bumpFolders: () => void;
  setClock: (clock: ClockState | null) => void;
  setDownload: (job: DownloadJob | null) => void;
};

const OrionContext = createContext<OrionValue | null>(null);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAdminToken(params.get("admin")?.trim() || "");
    setSavedName(localStorage.getItem("operatorName") || "");
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
        const incoming = Array.isArray(data.messages) ? data.messages : [];
        const fresh: ChatMessage[] = [];
        for (const message of incoming) {
          if (typeof message.id !== "number" || seen.has(message.id)) continue;
          seen.add(message.id);
          fresh.push(message);
          if (message.id > since) since = message.id;
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
  }, [playerName, chatEpoch]);

  async function connect(raw: string) {
    const name = normalizeName(raw);
    if (!name) return "Identificador inválido. Use letras, números, _ ou -.";
    const res = await apiFetch<SessionResponse>("/api/session", "POST", { name });
    if (!res?.user || res.error) return "Não foi possível abrir a sessão.";
    localStorage.setItem("operatorName", name);
    setSavedName(name);
    setMessages([]);
    setPlayerName(name);
    setUser(res.user);
    setLink("on");
    return null;
  }

  function disconnect() {
    setPlayerName("");
    setUser(null);
    setMessages([]);
    setDownload(null);
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
    return { ok: true };
  }

  function resetChat() {
    setMessages([]);
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
    connect,
    disconnect,
    sendPlayer,
    resetChat,
    bumpFolders: () => setFolderTick((value) => value + 1),
    setClock,
    setDownload,
  };

  return <OrionContext.Provider value={value}>{children}</OrionContext.Provider>;
}

export function useOrion() {
  const ctx = useContext(OrionContext);
  if (!ctx) throw new Error("Terminal fora do contexto.");
  return ctx;
}
