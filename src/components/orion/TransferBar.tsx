import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { cx } from "@/lib/orion/format";
import type { DownloadJob } from "@/lib/orion/types";

const STATUS = {
  active: "Em curso",
  ok: "Concluída",
  fail: "Interrompida",
} as const;

export function TransferBar({ job, onDismiss }: { job: DownloadJob; onDismiss?: () => void }) {
  const [open, setOpen] = useState(true);
  const percent = Math.max(0, Math.min(100, Math.round(job.percent)));
  const filled = Math.round(percent / 5);

  useEffect(() => {
    setOpen(true);
  }, [job.id, job.status]);

  const tone = job.status === "fail" ? "text-danger" : job.status === "ok" ? "text-ok" : "text-cyan";
  const fill = job.status === "fail" ? "bg-danger" : job.status === "ok" ? "bg-ok" : "bg-cyan";

  return (
    <section className="shrink-0 border-b border-line bg-panel" aria-live="polite">
      <div className="flex items-center gap-2 px-3">
        <button type="button" onClick={() => setOpen((value) => !value)} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left">
          <Download className={cx("size-4 shrink-0", tone)} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-xs tracking-widest text-dim uppercase">
            Transferência · <span className={tone}>{STATUS[job.status]}</span>
          </span>
          <span className={cx("text-sm tabular-nums", tone)}>{percent}%</span>
        </button>
        {job.status !== "active" && onDismiss ? (
          <button type="button" onClick={onDismiss} className="inline-flex size-11 items-center justify-center text-dim hover:text-bright" aria-label="Dispensar transferência">
            <X className="size-4" />
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="px-3 pb-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-bright">{job.title}</p>
            <p className="text-xs text-dim">
              {[job.size, job.source].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="mt-3 flex gap-1" aria-hidden="true">
            {Array.from({ length: 20 }, (_, index) => (
              <span key={index} className={cx("h-2 flex-1", index < filled ? fill : "bg-line")} />
            ))}
          </div>
          {job.note ? <p className="mt-3 text-xs text-fg">{job.note}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
