import { useEffect, useState, type FormEvent } from "react";
import { useOrion } from "@/components/orion/orion-context";

export function LoginGate() {
  const { connect, savedName } = useOrion();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (savedName) setName(savedName);
  }, [savedName]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const message = await connect(name);
    setBusy(false);
    if (message) setError(message);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-bg px-4">
      <form onSubmit={onSubmit} className="login-frame w-full max-w-md border bg-panel px-6 py-8 sm:px-10">
        <p className="text-xs tracking-widest text-dim uppercase">OrionSoftware Systems</p>
        <h1 className="mt-4 text-xl tracking-widest text-cyan">Terminal</h1>
        <p className="mt-3 border-b border-line pb-5 text-xs leading-relaxed text-dim">
          Acesso ao sistema requer identificação do operador
        </p>
        <label className="mt-6 block text-xs tracking-widest text-dim uppercase" htmlFor="operator-name">
          Identificador
        </label>
        <input
          id="operator-name"
          value={name}
          onChange={(event) => setName(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 20))}
          maxLength={20}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="characters"
          placeholder="NOME_OPERADOR"
          className="mt-2 min-h-11 w-full border border-line-lit bg-bg px-3 text-sm tracking-widest text-cyan outline-none focus:border-cyan"
        />
        {error ? (
          <p className="mt-3 text-xs text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy || !name}
          className="term-btn mt-5 min-h-11 w-full border border-cyan-dim text-cyan hover:bg-cyan/10 disabled:opacity-40"
        >
          {busy ? "Conectando" : "Conectar"}
        </button>
      </form>
    </div>
  );
}
