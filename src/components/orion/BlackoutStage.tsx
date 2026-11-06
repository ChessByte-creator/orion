export function BlackoutStage({
  message,
  onRestore,
  onOpenControl,
}: {
  message?: string;
  onRestore?: () => void;
  onOpenControl?: () => void;
}) {
  return (
    <section className="dead-screen fixed inset-0 z-50 flex flex-col items-center justify-center" aria-live="assertive">
      <div className="dead-snow" aria-hidden="true" />
      {message ? (
        <>
          <p className="relative text-xs tracking-widest text-dim">SEM SINAL</p>
          <p className="relative mt-5 max-w-xl px-8 text-center text-2xl leading-snug tracking-wide text-bright sm:text-3xl">{message}</p>
        </>
      ) : (
        <p className="relative text-sm tracking-widest text-dim">SEM SINAL</p>
      )}
      {onRestore || onOpenControl ? (
        <div className="relative mt-8 flex flex-wrap justify-center gap-2">
          {onRestore ? (
            <button type="button" onClick={onRestore} className="term-btn min-h-11 border border-rose-dim px-4 text-rose">
              Religar
            </button>
          ) : null}
          {onOpenControl ? (
            <button type="button" onClick={onOpenControl} className="term-btn min-h-11 border border-line px-4 text-dim hover:text-bright">
              Controle
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
