import { useEffect, useRef, useState, type FormEvent } from "react";
import { useOrion } from "@/components/orion/orion-context";
import { cx, fmtTime, safeColor } from "@/lib/orion/format";

export function ChatPanel({ visible }: { visible: boolean }) {
  const { messages, user, playerName, sendPlayer, disconnect } = useOrion();
  const [text, setText] = useState("");
  const [stuck, setStuck] = useState(true);
  const [pending, setPending] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const canView = !user || !!Number(user.can_view_chat);
  const canWrite = !user || !!Number(user.can_write_chat);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || !stuck) return;
    box.scrollTop = box.scrollHeight;
  }, [messages, stuck, canView]);

  function onScroll() {
    const box = boxRef.current;
    if (!box) return;
    setStuck(box.scrollHeight - box.scrollTop - box.clientHeight < 48);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || !canWrite || pending) return;
    const outgoing = text;
    setText("");
    setPending(true);
    const result = await sendPlayer(outgoing);
    setPending(false);
    if (!result.ok && result.code !== "CHAT_WRITE_BLOCKED") setText(outgoing);
    setStuck(true);
  }

  return (
    <section
      className={cx(
        "min-h-0 flex-col border-line bg-panel md:h-60 md:flex-none md:border-t",
        visible ? "flex flex-1" : "hidden md:flex",
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
        <span className="text-xs tracking-widest text-dim uppercase">Canal de comunicação</span>
        <span className="flex items-center gap-2 text-xs text-dim">
          <span className="max-w-40 truncate text-cyan">operador: {playerName}</span>
          <button type="button" onClick={disconnect} className="min-h-11 underline">
            trocar
          </button>
        </span>
      </div>
      <div ref={boxRef} onScroll={onScroll} className="relative min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {canView ? (
          messages.map((message) => {
            const sender = message.sender || "?";
            const npc = sender.startsWith("[");
            const name = message.sender_alias || sender;
            const nameColor = safeColor(message.sender_color) || (!npc ? safeColor(message.name_color) : undefined);
            const textColor = safeColor(message.text_color);
            return (
              <p key={message.id} className="text-sm leading-relaxed">
                <span
                  className={cx("font-medium", !nameColor && (npc ? "text-rose" : "text-cyan"))}
                  style={nameColor ? { color: nameColor } : undefined}
                >
                  {name}
                </span>
                <span className="ml-2 text-xs text-dim">{fmtTime(message.created_at)}</span>
                <span className={cx("text-bright", npc && !textColor && "text-rose-soft")} style={textColor ? { color: textColor } : undefined}>
                  {" "}
                  — {message.text}
                </span>
              </p>
            );
          })
        ) : (
          <p className="text-xs text-dim">// acesso ao canal bloqueado pelo controle</p>
        )}
        {canView && messages.length === 0 ? <p className="text-xs text-dim">// canal em silêncio</p> : null}
      </div>
      {!stuck && canView ? (
        <button
          type="button"
          onClick={() => {
            setStuck(true);
            if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
          }}
          className="mx-3 mb-2 min-h-11 border border-line text-xs text-cyan"
        >
          novas mensagens
        </button>
      ) : null}
      <form onSubmit={onSubmit} className="flex border-t border-line">
        <div className="flex items-center px-3 text-rose" aria-hidden="true">
          {">"}
        </div>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={!canWrite}
          maxLength={300}
          autoComplete="off"
          spellCheck={false}
          placeholder={canWrite ? "enviar mensagem..." : "envio bloqueado pelo controle"}
          className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-bright outline-none placeholder:text-dim disabled:opacity-60"
        />
        <button type="submit" disabled={!canWrite || !text.trim()} className="term-btn min-h-11 border-l border-line px-4 text-dim hover:text-rose disabled:opacity-40">
          Enviar
        </button>
      </form>
    </section>
  );
}
