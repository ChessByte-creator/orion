import { useEffect, useState } from "react";
import { apiFetch, loadRepoIndex, readList, setDocHidden } from "@/lib/orion/api";
import { DEFAULT_NPC_NICK, DEFAULT_NPC_TEXT } from "@/lib/orion/constants";
import { safeColor } from "@/lib/orion/format";
import type { EventRow, RepoItem } from "@/lib/orion/types";
import { useOrion } from "@/components/orion/orion-context";
import { Btn, Feedback, Field, SectionTitle, fieldClass, useFeedback } from "@/components/orion/admin/ui";

type Pending = Record<string, number>;

export function EventsSection({ active }: { active: boolean }) {
  const { adminToken, bumpFolders, folderTick } = useOrion();
  const [items, setItems] = useState<RepoItem[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [pending, setPending] = useState<Pending>({});
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [nick, setNick] = useState("");
  const [message, setMessage] = useState("");
  const [nickColor, setNickColor] = useState(DEFAULT_NPC_NICK);
  const [textColor, setTextColor] = useState(DEFAULT_NPC_TEXT);
  const [useNick, setUseNick] = useState(false);
  const [useText, setUseText] = useState(false);
  const { fb, show } = useFeedback();
  const { fb: fileFb, show: showFile } = useFeedback();

  useEffect(() => {
    if (!active) return;
    let cancel = false;
    async function load() {
      const [repo, eventRaw] = await Promise.all([
        loadRepoIndex(adminToken),
        apiFetch<unknown>("/api/admin/events", "GET", undefined, adminToken),
      ]);
      if (cancel) return;
      const eventParsed = readList<EventRow>(eventRaw);
      setItems(repo.items);
      setEvents(eventParsed.rows);
      setError(repo.error || eventParsed.error || null);
    }
    void load();
    return () => {
      cancel = true;
    };
  }, [active, adminToken, folderTick]);

  function hiddenOf(item: RepoItem) {
    const key = `${item.type}:${item.id}`;
    return Object.prototype.hasOwnProperty.call(pending, key) ? pending[key] : item.hidden ? 1 : 0;
  }

  function toggle(item: RepoItem) {
    const key = `${item.type}:${item.id}`;
    const next = hiddenOf(item) ? 0 : 1;
    const original = item.hidden ? 1 : 0;
    setPending((current) => {
      const copy = { ...current };
      if (next === original) delete copy[key];
      else copy[key] = next;
      return copy;
    });
  }

  const pendingCount = Object.keys(pending).length;

  function resetForm() {
    setFormOpen(false);
    setEditId(null);
    setLabel("");
    setNick("");
    setMessage("");
    setUseNick(false);
    setUseText(false);
    setNickColor(DEFAULT_NPC_NICK);
    setTextColor(DEFAULT_NPC_TEXT);
  }

  return (
    <div>
      <SectionTitle>Eventos</SectionTitle>
      <p className="mb-3 text-xs text-dim">Revelar ou ocultar só entra para os operadores depois de aplicar.</p>
      <div className="mb-3 flex flex-wrap gap-2">
        <Btn
          disabled={!pendingCount}
          onClick={async () => {
            const entries = Object.entries(pending);
            let ok = 0;
            for (const [key, hiddenVal] of entries) {
              const [type, idText] = key.split(":");
              const id = Number(idText);
              const hidden = hiddenVal === 1;
              const res = type === "folder"
                ? await apiFetch<{ ok?: boolean }>(`/api/admin/folders/${id}`, "PUT", { hidden }, adminToken)
                : await setDocHidden(id, hidden, adminToken);
              if (res && "ok" in res && res.ok) ok += 1;
            }
            setPending({});
            bumpFolders();
            showFile(`${ok}/${entries.length} atualizado(s).`, ok !== entries.length);
          }}
        >
          Aplicar visibilidade{pendingCount ? ` (${pendingCount})` : ""}
        </Btn>
        <Btn tone="ghost" disabled={!pendingCount} onClick={() => { setPending({}); showFile("Alterações descartadas."); }}>
          Descartar
        </Btn>
      </div>
      <Feedback text={fileFb?.text ?? null} err={fileFb?.err} />
      {error ? <p className="mb-3 text-xs text-danger">{error}</p> : null}
      <div className="mb-6 max-h-80 space-y-2 overflow-y-auto">
        {items.length === 0 ? <p className="text-xs text-dim">nenhum arquivo cadastrado</p> : null}
        {items.map((item) => {
          const hidden = hiddenOf(item);
          const isPending = Object.prototype.hasOwnProperty.call(pending, `${item.type}:${item.id}`);
          return (
            <div key={`${item.type}:${item.id}`} className="flex items-center justify-between gap-2 border border-line px-2 py-1" style={{ marginLeft: item.depth * 12 }}>
              <span className="min-w-0 truncate text-xs text-fg">
                {item.label}
                {hidden ? <span className="text-danger"> · oculto</span> : null}
                {isPending ? <span className="text-violet"> *</span> : null}
              </span>
              <Btn tone={isPending ? "violet" : hidden ? "danger" : "ok"} onClick={() => toggle(item)}>
                {hidden ? "Revelar" : "Ocultar"}
              </Btn>
            </div>
          );
        })}
      </div>

      <div className="border-t border-line pt-4">
        <p className="mb-3 text-xs tracking-widest text-dim uppercase">Mensagens prontas</p>
        <div className="mb-3 space-y-2">
          {events.length === 0 ? <p className="text-xs text-dim">nenhuma mensagem cadastrada</p> : null}
          {events.map((event) => (
            <div key={event.id} className="border border-line p-3">
              <p className="text-xs text-dim">{event.label}</p>
              <p className="mt-1 text-sm text-bright">
                <span style={{ color: safeColor(event.sender_color) || DEFAULT_NPC_NICK }}>{event.sender_alias || "[ORION-CONTROL]"}</span>
                {event.message ? ` — ${event.message}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
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
                <Btn
                  tone="ghost"
                  onClick={() => {
                    setEditId(event.id);
                    setLabel(event.label);
                    setNick(event.sender_alias || "");
                    setMessage(event.message || "");
                    setNickColor(event.sender_color || DEFAULT_NPC_NICK);
                    setTextColor(event.text_color || DEFAULT_NPC_TEXT);
                    setUseNick(!!event.sender_color);
                    setUseText(!!event.text_color);
                    setFormOpen(true);
                  }}
                >
                  Editar
                </Btn>
                <Btn
                  tone="danger"
                  onClick={async () => {
                    if (!window.confirm(`Apagar "${event.label}"?`)) return;
                    await apiFetch(`/api/admin/events/${event.id}`, "DELETE", undefined, adminToken);
                    bumpFolders();
                  }}
                >
                  Apagar
                </Btn>
              </div>
            </div>
          ))}
        </div>
        {!formOpen ? <Btn tone="ghost" onClick={() => { resetForm(); setFormOpen(true); }}>Nova mensagem</Btn> : null}
        {formOpen ? (
          <div className="mt-3 border border-line p-3">
            <Field label="Rótulo">
              <input className={fieldClass} value={label} maxLength={60} onChange={(event) => setLabel(event.target.value)} />
            </Field>
            <Field label="Nick (vazio = padrão)">
              <input className={fieldClass} value={nick} maxLength={32} onChange={(event) => setNick(event.target.value)} />
            </Field>
            <div className="mb-4 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs text-dim">
                Cor do nome
                <input type="color" value={nickColor} className="size-11 border border-line bg-bg" onChange={(event) => { setNickColor(event.target.value); setUseNick(true); }} />
              </label>
              <label className="flex items-center gap-2 text-xs text-dim">
                Cor do texto
                <input type="color" value={textColor} className="size-11 border border-line bg-bg" onChange={(event) => { setTextColor(event.target.value); setUseText(true); }} />
              </label>
            </div>
            <Field label="Texto">
              <textarea className={`${fieldClass} min-h-24 py-2`} value={message} onChange={(event) => setMessage(event.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Btn
                onClick={async () => {
                  if (!label.trim()) { show("Rótulo obrigatório.", true); return; }
                  const payload = {
                    label: label.trim(),
                    message: message.trim() || null,
                    sender_alias: nick.trim() || null,
                    sender_color: useNick ? nickColor : null,
                    text_color: useText ? textColor : null,
                  };
                  const res = editId
                    ? await apiFetch<{ ok?: boolean; error?: string }>(`/api/admin/events/${editId}`, "PUT", payload, adminToken)
                    : await apiFetch<{ ok?: boolean; error?: string }>("/api/admin/events", "POST", payload, adminToken);
                  if (res?.ok) {
                    resetForm();
                    bumpFolders();
                    show(editId ? "Atualizado." : "Mensagem salva.");
                  } else show(res?.error || "Falhou.", true);
                }}
              >
                Salvar
              </Btn>
              <Btn tone="ghost" onClick={resetForm}>Cancelar</Btn>
            </div>
          </div>
        ) : null}
        <Feedback text={fb?.text ?? null} err={fb?.err} />
      </div>
    </div>
  );
}
