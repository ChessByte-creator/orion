import { useEffect, useState } from "react";
import { apiFetch, readList } from "@/lib/orion/api";
import { ago, fmtTime, seenRecently } from "@/lib/orion/format";
import { isSignal } from "@/lib/orion/signal";
import type { ChatMessage, EventRow, Operator } from "@/lib/orion/types";
import { useOrion } from "@/components/orion/orion-context";
import { Btn, Feedback, Field, SectionTitle, fieldClass, useFeedback } from "@/components/orion/admin/ui";
import type { AdminSection } from "@/components/orion/admin/sections";

export function OverviewSection({ active, onJump }: { active: boolean; onJump: (section: AdminSection) => void }) {
  const { adminToken, clock, download, folderTick, seat, setSeat, setTerminalDown } = useOrion();
  const [users, setUsers] = useState<Operator[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [driver, setDriver] = useState("");
  const [target, setTarget] = useState("*");
  const [note, setNote] = useState("");
  const { fb, show } = useFeedback();

  useEffect(() => {
    if (!active) return;
    let cancel = false;
    async function load() {
      const [userRaw, eventRaw, chatRaw] = await Promise.all([
        apiFetch<unknown>("/api/admin/users", "GET", undefined, adminToken),
        apiFetch<unknown>("/api/admin/events", "GET", undefined, adminToken),
        apiFetch<unknown>("/api/chat?since=0", "GET", undefined, adminToken),
      ]);
      if (cancel) return;
      const userParsed = readList<Operator>(userRaw);
      if (userParsed.error) setError(userParsed.error);
      else setError(null);
      setUsers(userParsed.rows);
      setEvents(readList<EventRow>(eventRaw).rows);
      setMessages(readList<ChatMessage>(chatRaw).rows.filter((message) => !isSignal(message.text)).slice(-6));
    }
    void load();
    const id = window.setInterval(() => void load(), 4000);
    return () => {
      cancel = true;
      window.clearInterval(id);
    };
  }, [active, adminToken, folderTick]);

  const recent = users.filter((item) => seenRecently(item.last_seen)).length;
  const names = [...new Set(users.map((item) => item.current_name))].sort();

  return (
    <div>
      <SectionTitle>Visão do terminal</SectionTitle>
      <div className="mb-6 border border-line p-3">
        <p className="text-xs tracking-widest text-dim uppercase">Quem está no comando</p>
        <p className="mt-2 text-sm text-bright">{seat ? `${seat} usa o terminal. Os outros só assistem.` : "cada um no seu"}</p>
        <Field label="Operador">
          <select className={fieldClass} value={driver} onChange={(event) => setDriver(event.target.value)}>
            <option value="">cada um no seu</option>
            {names.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </Field>
        <Btn
          onClick={async () => {
            await setSeat(driver);
            show(driver ? `${driver} no comando.` : "Cada um no seu.");
          }}
        >
          Aplicar
        </Btn>
      </div>
      <div className="mb-6 border border-line p-3">
        <p className="text-xs tracking-widest text-dim uppercase">Derrubar sinal</p>
        <Field label="Quem">
          <select className={fieldClass} value={target} onChange={(event) => setTarget(event.target.value)}>
            <option value="*">todos</option>
            {names.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </Field>
        <Field label="Mensagem na tela">
          <input className={fieldClass} value={note} maxLength={140} onChange={(event) => setNote(event.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Btn
            tone="danger"
            onClick={async () => {
              await setTerminalDown(true, target, note);
              show(target === "*" ? "Sinal derrubado para todos." : `Sinal derrubado para ${target}.`);
            }}
          >
            Derrubar
          </Btn>
          <Btn
            tone="ok"
            onClick={async () => {
              await setTerminalDown(false, target);
              show(target === "*" ? "Todos religados." : `${target} religado.`);
            }}
          >
            Religar
          </Btn>
        </div>
      </div>
      {error ? <p className="mb-4 text-xs text-danger">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="border border-line p-3">
          <p className="text-xs tracking-widest text-dim uppercase">Relógio</p>
          <p className="mt-2 text-sm text-bright">{clock?.fictionalTime ? (clock.running ? "correndo" : "pausado") : "hora real"}</p>
          <Btn tone="ghost" className="mt-3" onClick={() => onJump("clock")}>Ajustar</Btn>
        </article>
        <article className="border border-line p-3">
          <p className="text-xs tracking-widest text-dim uppercase">Transferência</p>
          <p className="mt-2 text-sm text-bright">
            {download ? `${download.title} · ${Math.round(download.percent)}%` : "nenhuma"}
          </p>
          <Btn tone="ghost" className="mt-3" onClick={() => onJump("download")}>Controlar</Btn>
        </article>
        <article className="border border-line p-3">
          <p className="text-xs tracking-widest text-dim uppercase">Operadores</p>
          <p className="mt-2 text-sm text-bright">{recent} vistos agora · {users.length} no registro</p>
          <ul className="mt-3 space-y-1">
            {users.slice(0, 4).map((item) => (
              <li key={item.ip} className="truncate text-xs text-dim">
                <span className="text-fg">{item.current_name}</span> · {ago(item.last_seen)}
              </li>
            ))}
          </ul>
          <Btn tone="ghost" className="mt-3" onClick={() => onJump("users")}>Permissões</Btn>
        </article>
        <article className="border border-line p-3">
          <p className="text-xs tracking-widest text-dim uppercase">Canal</p>
          <ul className="mt-2 space-y-2">
            {messages.length === 0 ? <li className="text-xs text-dim">sem mensagens</li> : null}
            {messages.map((message) => (
              <li key={message.id} className="text-xs leading-relaxed text-dim">
                <span className="text-fg">{message.sender_alias || message.sender}</span> {fmtTime(message.created_at)}
                <span className="line-clamp-2 block text-fg">{message.text}</span>
              </li>
            ))}
          </ul>
          <Btn tone="ghost" className="mt-3" onClick={() => onJump("chat")}>Escrever</Btn>
        </article>
      </div>
      <div className="mt-6">
        <p className="mb-2 text-xs tracking-widest text-dim uppercase">Mensagens prontas</p>
        {events.length === 0 ? <p className="text-xs text-dim">nenhuma cadastrada</p> : null}
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-3 border border-line px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-bright">{event.label}</p>
                <p className="truncate text-xs text-dim">{event.message || "sem texto"}</p>
              </div>
              <Btn
                disabled={!event.message}
                onClick={async () => {
                  const res = await apiFetch<{ ok?: boolean; error?: string }>("/api/chat", "POST", {
                    sender: "[NPC]",
                    text: event.message,
                    sender_alias: event.sender_alias,
                    sender_color: event.sender_color,
                    text_color: event.text_color,
                  }, adminToken);
                  show(res?.ok ? "Enviada." : res?.error || "Falhou.", !res?.ok);
                }}
              >
                Disparar
              </Btn>
            </div>
          ))}
        </div>
        <Feedback text={fb?.text ?? null} err={fb?.err} />
      </div>
    </div>
  );
}
