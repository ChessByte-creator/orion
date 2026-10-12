import { useEffect, useRef, useState, type FormEvent } from "react";
import { Lock } from "lucide-react";

export function CredentialForm({
  title,
  error,
  onSubmit,
  onBack,
}: {
  title: string;
  error?: string;
  onSubmit: (password: string) => Promise<void> | void;
  onBack?: () => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [error]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const password = value.trim();
    if (!password || busy) return;
    setBusy(true);
    await onSubmit(password);
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 px-4 pt-12 text-center">
      <Lock className="size-8 text-amber" aria-hidden="true" />
      <p className="text-xs tracking-widest text-amber uppercase">{title}</p>
      <p className="text-xs text-dim">Credencial necessária</p>
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        placeholder="CREDENCIAL"
        className="min-h-11 w-full border border-amber bg-bg px-3 text-center text-sm tracking-widest text-bright outline-none"
      />
      <button
        type="submit"
        disabled={busy || !value.trim()}
        className="term-btn min-h-11 w-full border border-amber text-amber hover:bg-amber/10 disabled:opacity-40"
      >
        {busy ? "..." : "Acessar"}
      </button>
      {error ? <p className="text-xs tracking-wide text-danger">{error}</p> : null}
      {onBack ? (
        <button type="button" onClick={onBack} className="min-h-11 text-xs tracking-widest text-dim uppercase">
          Voltar
        </button>
      ) : null}
    </form>
  );
}
