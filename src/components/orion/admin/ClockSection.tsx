import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/orion/api";
import { fictionalNow, toDatetimeLocal } from "@/lib/orion/format";
import { useOrion } from "@/components/orion/orion-context";
import { Btn, Feedback, Field, SectionTitle, fieldClass, useFeedback } from "@/components/orion/admin/ui";

export function ClockSection({ active }: { active: boolean }) {
  const { adminToken, clock, setClock } = useOrion();
  const [value, setValue] = useState("");
  const [running, setRunning] = useState(true);
  const [preview, setPreview] = useState("--:--:--");
  const { fb, show } = useFeedback();

  useEffect(() => {
    if (!active || !clock?.fictionalTime || value) return;
    setValue(toDatetimeLocal(fictionalNow(clock)));
    setRunning(clock.running);
  }, [active, clock, value]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (value) {
        const date = new Date(value);
        setPreview(Number.isNaN(date.getTime()) ? "--:--:--" : date.toLocaleTimeString("pt-BR"));
      } else {
        setPreview(fictionalNow(clock).toLocaleTimeString("pt-BR"));
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [value, clock]);

  return (
    <div>
      <SectionTitle>Relógio do sistema</SectionTitle>
      <p className="mb-4 text-xs leading-relaxed text-dim">
        Esta é a data e a hora que os operadores veem no topo. Se estiver correndo, avança em tempo real a partir do momento definido. Se estiver pausado, fica fixo.
      </p>
      <Field label="Data e hora">
        <input className={fieldClass} type="datetime-local" step={1} value={value} onChange={(event) => setValue(event.target.value)} />
      </Field>
      <label className="mb-4 flex min-h-11 items-center gap-3 text-xs text-fg">
        <input type="checkbox" checked={running} onChange={(event) => setRunning(event.target.checked)} />
        Relógio correndo
      </label>
      <div className="flex flex-wrap gap-2">
        <Btn
          onClick={async () => {
            if (!value) { show("Defina uma data e hora.", true); return; }
            const fictionalTime = new Date(value).toISOString();
            const res = await apiFetch<{ ok?: boolean; error?: string }>("/api/admin/clock", "PUT", { fictionalTime, running }, adminToken);
            if (res?.ok) {
              setClock({ fictionalTime, realTimeAtSet: new Date().toISOString(), running });
              show(running ? "Relógio atualizado e correndo." : "Relógio atualizado e pausado.");
            } else show(res?.error || "Falhou.", true);
          }}
        >
          Aplicar
        </Btn>
        <Btn
          tone="ghost"
          onClick={async () => {
            if (!window.confirm("Voltar ao horário real do sistema?")) return;
            const fictionalTime = new Date().toISOString();
            const res = await apiFetch<{ ok?: boolean }>("/api/admin/clock", "PUT", { fictionalTime, running: true }, adminToken);
            if (res?.ok) {
              setClock({ fictionalTime, realTimeAtSet: new Date().toISOString(), running: true });
              setValue(toDatetimeLocal(new Date()));
              setRunning(true);
              show("Relógio alinhado com a hora real.");
            } else show("Falhou.", true);
          }}
        >
          Usar hora real
        </Btn>
      </div>
      <Feedback text={fb?.text ?? null} err={fb?.err} />
      <div className="mt-6 border-t border-line pt-4">
        <p className="text-xs tracking-widest text-dim uppercase">Prévia do campo</p>
        <p className="mt-2 text-lg tracking-widest text-cyan tabular-nums">
          {preview} {running ? "▶" : "‖"}
        </p>
      </div>
    </div>
  );
}
