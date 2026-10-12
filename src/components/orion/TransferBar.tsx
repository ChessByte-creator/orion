import { cx } from "@/lib/orion/format";
import type { DownloadJob } from "@/lib/orion/types";

const STATUS = {
  active: "Em curso",
  ok: "Concluída",
  fail: "Interrompida",
} as const;

export function TransferStage({
  job,
  adminOpen,
  onDismiss,
  onOpenControl,
}: {
  job: DownloadJob;
  adminOpen?: boolean;
  onDismiss?: () => void;
  onOpenControl?: () => void;
}) {
  const percent = Math.max(0, Math.min(100, Math.round(job.percent)));
  const filled = Math.round(percent / 5);
  const tone = job.status === "fail" ? "fail" : job.status === "ok" ? "ok" : "active";
  const text = tone === "fail" ? "text-danger" : tone === "ok" ? "text-ok" : "text-cyan";
  const fill = tone === "fail" ? "bg-danger" : tone === "ok" ? "bg-ok" : "bg-cyan";
  const meta = [job.size, job.source].filter(Boolean).join(" · ");

  return (
    <section
      className={cx(
        "transfer-stage fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden px-6 py-10",
        adminOpen && "lg:right-admin",
      )}
      data-tone={tone}
      aria-live="assertive"
    >
      <div className="transfer-beam" aria-hidden="true" />
      <div className="transfer-sweep" aria-hidden="true" />
      <p className={cx("relative text-xs tracking-widest uppercase", text)}>
        Transferência · {STATUS[job.status]}
      </p>
      <p key={percent} className={cx("file-in relative mt-5 text-7xl leading-none font-medium tabular-nums md:text-8xl", text)}>
        {percent}
        <span className="text-3xl md:text-4xl">%</span>
      </p>
      <h1 className="relative mt-6 max-w-3xl text-center text-lg tracking-widest text-bright uppercase md:text-2xl">
        {job.title}
      </h1>
      {meta ? <p className="relative mt-3 text-center text-xs tracking-wide text-dim uppercase">{meta}</p> : null}
      <div className="relative mt-8 flex w-full max-w-xl gap-1" aria-hidden="true">
        {Array.from({ length: 20 }, (_, index) => (
          <span
            key={index}
            className={cx(
              "h-4 flex-1",
              index < filled ? fill : "bg-line",
              index === filled - 1 && job.status === "active" && "transfer-head",
            )}
          />
        ))}
      </div>
      {job.note ? <p className="relative mt-6 max-w-xl text-center text-sm leading-relaxed text-fg">{job.note}</p> : null}
      {onOpenControl || onDismiss ? (
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-2">
          {onOpenControl ? (
            <button type="button" onClick={onOpenControl} className="term-btn min-h-11 border border-rose-dim px-4 text-rose">
              Controle
            </button>
          ) : null}
          {onDismiss ? (
            <button type="button" onClick={onDismiss} className="term-btn min-h-11 border border-line px-4 text-dim hover:text-bright">
              Voltar ao terminal
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
