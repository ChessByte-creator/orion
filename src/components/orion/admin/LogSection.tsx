import { useState } from "react";
import { Btn, SectionTitle } from "@/components/orion/admin/ui";
import { useOrion } from "@/components/orion/orion-context";
import { cx, fmtTime } from "@/lib/orion/format";
import type { LogAction } from "@/lib/orion/signal";

const LABEL: Record<LogAction, string> = {
  entrou: "entrou no terminal",
  saiu: "saiu do terminal",
  pasta: "abriu a pasta",
  "senha-pasta": "errou a credencial da pasta",
  arquivo: "abriu o arquivo",
  "senha-arquivo": "errou a credencial do arquivo",
  corrompido: "abriu arquivo corrompido",
  bloqueado: "bateu no repositório bloqueado",
  canal: "escreveu no canal",
  envio: "iniciou a transferência",
  "envio-pct": "ajustou a transferência",
  "envio-ok": "concluiu a transferência",
  "envio-fail": "interrompeu a transferência",
  "envio-off": "retirou a transferência",
  caiu: "derrubou o terminal",
  voltou: "religou o terminal",
};

const FILES = new Set<LogAction>(["pasta", "senha-pasta", "arquivo", "senha-arquivo", "corrompido", "bloqueado"]);
const CHANNEL = new Set<LogAction>(["canal"]);
const MACHINE = new Set<LogAction>(["entrou", "saiu", "envio", "envio-pct", "envio-ok", "envio-fail", "envio-off", "caiu", "voltou"]);

const FILTERS = [
  { id: "all", label: "Tudo" },
  { id: "files", label: "Arquivos" },
  { id: "channel", label: "Canal" },
  { id: "machine", label: "Terminal" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

export function LogSection() {
  const { log } = useOrion();
  const [filter, setFilter] = useState<FilterId>("all");
  const rows = [...log].reverse().filter((entry) => {
    if (filter === "files") return FILES.has(entry.action);
    if (filter === "channel") return CHANNEL.has(entry.action);
    if (filter === "machine") return MACHINE.has(entry.action);
    return true;
  });

  return (
    <div>
      <SectionTitle>Registro</SectionTitle>
      <p className="mb-4 text-xs leading-relaxed text-dim">
        Quem entrou, o que abriu, senha errada, o que escreveu e o que o controle fez. Limpar o canal apaga isto.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Btn key={item.id} tone={filter === item.id ? "rose" : "ghost"} onClick={() => setFilter(item.id)}>
            {item.label}
          </Btn>
        ))}
      </div>
      {rows.length === 0 ? <p className="text-xs text-dim">nada registrado</p> : null}
      <div className="space-y-2">
        {rows.map((entry) => (
          <article key={entry.id} className="border border-line px-3 py-2">
            <p className="text-xs text-dim">
              <span className="text-fg">{entry.name}</span>
              <span className="ml-2">{fmtTime(entry.at)}</span>
            </p>
            <p className={cx("mt-1 text-sm text-bright", entry.action === "caiu" && "text-danger")}>
              {LABEL[entry.action]}
              {entry.subject ? <span className="text-dim"> — {entry.subject}</span> : null}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
