import { useEffect, useState } from "react";
import { apiFetch, readDownload } from "@/lib/orion/api";
import { useOrion } from "@/components/orion/orion-context";
import { Btn, Feedback, Field, SectionTitle, fieldClass, useFeedback } from "@/components/orion/admin/ui";

const STEPS = [0, 25, 50, 75, 100];

export function DownloadSection({ active }: { active: boolean }) {
  const { adminToken, download, setDownload, record } = useOrion();
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [size, setSize] = useState("");
  const [percent, setPercent] = useState(0);
  const [note, setNote] = useState("");
  const [eventMessage, setEventMessage] = useState("");
  const { fb, show } = useFeedback();

  useEffect(() => {
    if (!active || !download) return;
    setTitle(download.title || "");
    setSource(download.source || "");
    setSize(download.size || "");
    setPercent(download.percent || 0);
  }, [active, download?.id]);

  const activeJob = download?.status === "active";

  async function send(body: Record<string, unknown>) {
    const res = await apiFetch<{ ok?: boolean; error?: string; download?: unknown }>("/api/admin/download", "PUT", body, adminToken);
    if (res?.ok) {
      setDownload(readDownload(res.download));
      if (body.action === "start") record("envio", String(body.title || "ARQUIVO"));
      else if (body.action === "set") record("envio-pct", `${body.percent ?? percent}%`);
      else if (body.action === "finish" && body.status === "ok") record("envio-ok", title);
      else if (body.action === "finish") record("envio-fail", title);
      show("Atualizado.");
    } else show(res?.error || "Falhou.", true);
    return res;
  }

  return (
    <div>
      <SectionTitle>Transferência</SectionTitle>
      <p className="mb-4 text-xs leading-relaxed text-dim">
        A porcentagem não anda sozinha. Você define o valor e a tela de todo mundo fica só nisso até encerrar.
        {activeJob ? " Há uma transferência em curso." : ""}
      </p>
      <Field label="Arquivo">
        <input className={fieldClass} value={title} maxLength={60} placeholder="NOME.BIN" onChange={(event) => setTitle(event.target.value)} />
      </Field>
      <Field label="Origem (opcional)">
        <input className={fieldClass} value={source} maxLength={60} onChange={(event) => setSource(event.target.value)} />
      </Field>
      <Field label="Tamanho (opcional)">
        <input className={fieldClass} value={size} maxLength={20} placeholder="2.4 MB" onChange={(event) => setSize(event.target.value)} />
      </Field>
      <Field label={`Progresso ${percent}%`}>
        <input type="range" min={0} max={100} value={percent} onChange={(event) => setPercent(Number(event.target.value))} />
      </Field>
      <div className="mb-4 flex flex-wrap gap-2">
        {STEPS.map((step) => (
          <Btn
            key={step}
            tone="ghost"
            onClick={async () => {
              setPercent(step);
              if (activeJob) await send({ action: "set", percent: step, title, source, size });
            }}
          >
            {step}%
          </Btn>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn
          onClick={async () => {
            if (activeJob && !window.confirm("Substituir a transferência em curso?")) return;
            await send({ action: "start", title: title || "ARQUIVO.BIN", source, size, percent });
          }}
        >
          Iniciar
        </Btn>
        <Btn tone="cyan" disabled={!activeJob} onClick={() => void send({ action: "set", percent, title, source, size })}>
          Aplicar %
        </Btn>
      </div>
      <div className="mt-6 border-t border-line pt-4">
        <Field label="Nota ao encerrar (opcional)">
          <input className={fieldClass} value={note} maxLength={120} onChange={(event) => setNote(event.target.value)} />
        </Field>
        <Field label="Mensagem no canal ao encerrar (opcional)">
          <textarea className={`${fieldClass} min-h-24 py-2`} value={eventMessage} onChange={(event) => setEventMessage(event.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Btn
            tone="ok"
            disabled={!activeJob}
            onClick={() => void send({ action: "finish", status: "ok", note, event_message: eventMessage || undefined })}
          >
            Concluir
          </Btn>
          <Btn
            tone="danger"
            disabled={!activeJob}
            onClick={() => void send({ action: "finish", status: "fail", percent, note, event_message: eventMessage || undefined })}
          >
            Interromper
          </Btn>
          <Btn
            tone="ghost"
            onClick={async () => {
              if (!window.confirm("Retirar a transferência da tela de todo mundo?")) return;
              const res = await apiFetch<{ ok?: boolean }>("/api/admin/download", "DELETE", undefined, adminToken);
              if (res?.ok) {
                setDownload(null);
                record("envio-off", title);
                show("Retirada.");
              } else show("Falhou.", true);
            }}
          >
            Retirar da tela
          </Btn>
        </div>
      </div>
      <Feedback text={fb?.text ?? null} err={fb?.err} />
    </div>
  );
}
