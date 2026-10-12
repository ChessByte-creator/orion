import { useEffect, useState } from "react";
import { apiFetch, readList } from "@/lib/orion/api";
import { DEFAULT_NPC_NAME, DEFAULT_NPC_NICK, DEFAULT_NPC_TEXT } from "@/lib/orion/constants";
import { fmtTime, safeColor } from "@/lib/orion/format";
import type { ChatMessage } from "@/lib/orion/types";
import { useOrion } from "@/components/orion/orion-context";
import { Btn, Feedback, Field, SectionTitle, fieldClass, useFeedback } from "@/components/orion/admin/ui";

export function ChatSection({ active }: { active: boolean }) {
  const { adminToken, resetChat } = useOrion();
  const [nick, setNick] = useState("");
  const [nickColor, setNickColor] = useState(DEFAULT_NPC_NICK);
  const [textColor, setTextColor] = useState(DEFAULT_NPC_TEXT);
  const [useNick, setUseNick] = useState(false);
  const [useText, setUseText] = useState(false);
  const [ready, setReady] = useState(false);
  const [text, setText] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [nonce, setNonce] = useState(0);
  const { fb, show } = useFeedback();

  useEffect(() => {
    setNick(localStorage.getItem("orionAdminNick") || "");
    setUseNick(localStorage.getItem("orionAdminUseNick") === "1");
    setUseText(localStorage.getItem("orionAdminUseText") === "1");
    setNickColor(localStorage.getItem("orionAdminNickColor") || DEFAULT_NPC_NICK);
    setTextColor(localStorage.getItem("orionAdminTextColor") || DEFAULT_NPC_TEXT);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("orionAdminNick", nick);
    localStorage.setItem("orionAdminUseNick", useNick ? "1" : "0");
    localStorage.setItem("orionAdminUseText", useText ? "1" : "0");
    localStorage.setItem("orionAdminNickColor", nickColor);
    localStorage.setItem("orionAdminTextColor", textColor);
  }, [ready, nick, useNick, useText, nickColor, textColor]);

  useEffect(() => {
    if (!active) return;
    let cancel = false;
    async function load() {
      const raw = await apiFetch<unknown>("/api/chat?since=0", "GET", undefined, adminToken);
      if (cancel) return;
      setHistory(readList<ChatMessage>(raw).rows.slice(-40));
    }
    void load();
    const id = window.setInterval(() => void load(), 3000);
    return () => {
      cancel = true;
      window.clearInterval(id);
    };
  }, [active, adminToken, nonce]);

  const previewName = nick.trim() || DEFAULT_NPC_NAME;
  const previewNick = useNick ? safeColor(nickColor) || DEFAULT_NPC_NICK : DEFAULT_NPC_NICK;
  const previewText = useText ? safeColor(textColor) : undefined;

  return (
    <div>
      <SectionTitle>Canal</SectionTitle>
      <Field label="Identidade">
        <input className={fieldClass} value={nick} maxLength={32} placeholder={DEFAULT_NPC_NAME} onChange={(event) => setNick(event.target.value)} />
      </Field>
      <div className="mb-4 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-xs text-dim">
          Cor do nome
          <input type="color" value={nickColor} onChange={(event) => { setNickColor(event.target.value); setUseNick(true); }} className="size-11 border border-line bg-bg" />
          <Btn tone="ghost" onClick={() => { setUseNick(false); setNickColor(DEFAULT_NPC_NICK); }}>Padrão</Btn>
        </label>
        <label className="flex items-center gap-2 text-xs text-dim">
          Cor do texto
          <input type="color" value={textColor} onChange={(event) => { setTextColor(event.target.value); setUseText(true); }} className="size-11 border border-line bg-bg" />
          <Btn tone="ghost" onClick={() => { setUseText(false); setTextColor(DEFAULT_NPC_TEXT); }}>Padrão</Btn>
        </label>
      </div>
      <p className="mb-4 text-xs text-dim">
        prévia: <span className="font-medium" style={{ color: previewNick }}>{previewName}</span>{" "}
        <span style={previewText ? { color: previewText } : undefined}>— texto do canal</span>
      </p>
      <Field label="Mensagem">
        <textarea className={`${fieldClass} min-h-28 py-2`} value={text} onChange={(event) => setText(event.target.value)} placeholder="Mensagem que entra no canal" />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Btn
          onClick={async () => {
            const message = text.trim();
            if (!message) return;
            const res = await apiFetch<{ ok?: boolean; error?: string }>("/api/chat", "POST", {
              sender: "[NPC]",
              text: message,
              sender_alias: nick.trim() || null,
              sender_color: useNick ? nickColor : null,
              text_color: useText ? textColor : null,
            }, adminToken);
            if (res?.ok) {
              setText("");
              setNonce((value) => value + 1);
              show("Mensagem transmitida.");
            } else show(res?.error || "Falhou.", true);
          }}
        >
          Transmitir
        </Btn>
        <Btn
          tone="ghost"
          onClick={async () => {
            if (!window.confirm("Limpar todo o histórico do canal?")) return;
            const res = await apiFetch<{ ok?: boolean }>("/api/admin/chat", "DELETE", undefined, adminToken);
            if (res?.ok) {
              resetChat();
              setHistory([]);
              show("Histórico limpo neste sistema. Quem já estava com o canal aberto pode precisar entrar de novo para esvaziar a tela.");
            } else show("Falhou.", true);
          }}
        >
          Limpar histórico
        </Btn>
      </div>
      <Feedback text={fb?.text ?? null} err={fb?.err} />
      <div className="mt-6 border-t border-line pt-4">
        <p className="mb-2 text-xs tracking-widest text-dim uppercase">Histórico recente</p>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {history.map((message) => (
            <p key={message.id} className="border-b border-line pb-2 text-xs leading-relaxed">
              <span className="font-medium text-fg">{message.sender_alias || message.sender}</span>
              <span className="ml-2 text-dim">{fmtTime(message.created_at)}</span>
              <span className="mt-1 block text-bright">{message.text}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
