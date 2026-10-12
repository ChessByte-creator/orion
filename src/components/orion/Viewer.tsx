import { useEffect, useState } from "react";
import { AlertTriangle, Terminal } from "lucide-react";
import { CredentialForm } from "@/components/orion/CredentialForm";
import { formatDocDate, glitchBlock, safeImage } from "@/lib/orion/format";
import type { DocView } from "@/lib/orion/types";

function CorruptedBody() {
  const [text, setText] = useState(glitchBlock);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setText(glitchBlock()), 160);
    return () => window.clearInterval(id);
  }, []);

  return <pre className="glitch-text mt-4 overflow-hidden text-xs leading-relaxed whitespace-pre-wrap text-danger">{text}</pre>;
}

function DocImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <p className="mt-4 text-xs text-dim">imagem indisponível</p>;
  return (
    <img
      src={src}
      alt=""
      className="mt-5 max-w-full border border-line"
      onError={() => setFailed(true)}
    />
  );
}

export function Viewer({
  view,
  visible,
  onPassword,
}: {
  view: DocView | null;
  visible: boolean;
  onPassword: (id: number, password: string) => Promise<void>;
}) {
  return (
    <section className={visible ? "relative min-h-0 flex-1 overflow-y-auto" : "relative hidden min-h-0 flex-1 overflow-y-auto md:block"}>
      {!view ? (
        <div className="flex flex-col items-center px-6 pt-16 text-center">
          <Terminal className="size-8 text-line-lit" aria-hidden="true" />
          <p className="mt-4 text-sm text-fg">Selecione um arquivo</p>
          <p className="mt-2 text-xs tracking-widest text-dim uppercase">navegue pelos arquivos</p>
        </div>
      ) : null}
      {view?.kind === "loading" ? <p className="px-6 py-8 text-xs text-dim">carregando...</p> : null}
      {view?.kind === "blocked" ? (
        <p className="px-6 py-8 text-sm text-danger">acesso ao repositório bloqueado</p>
      ) : null}
      {view?.kind === "error" ? <p className="px-6 py-8 text-sm text-danger">{view.message}</p> : null}
      {view?.kind === "password" ? (
        <CredentialForm
          title="Arquivo protegido"
          error={view.error}
          onSubmit={(password) => onPassword(view.id, password)}
        />
      ) : null}
      {view?.kind === "corrupted" ? (
        <div className="px-5 py-6 sm:px-7">
          <h2 className="border-b border-line pb-3 text-sm tracking-wide text-danger">// {view.title}</h2>
          <p className="mt-3 text-xs tracking-wide text-dim">
            {view.fileSize ? `TAMANHO: ${view.fileSize} · ` : ""}
            STATUS: <span className="text-danger">CORROMPIDO</span>
          </p>
          <div className="mt-4 flex items-center gap-2 border border-danger px-3 py-2 text-xs tracking-widest text-danger">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            Leitura impossível — integridade comprometida
          </div>
          <CorruptedBody />
        </div>
      ) : null}
      {view?.kind === "doc" ? (
        <article key={view.doc.id} className="doc-in relative px-5 py-6 sm:px-7">
          <div className="viewer-scan" />
          <h2 className="border-b border-line pb-3 text-sm tracking-wide text-cyan">
            // {view.doc.title}
            <span className="ml-2 inline-block size-2.5 animate-pulse bg-cyan-dim align-middle" />
          </h2>
          <p className="mt-3 text-xs tracking-wide text-dim">
            REGISTRADO EM: {formatDocDate(view.doc)}
            {view.doc.file_size ? ` · TAMANHO: ${view.doc.file_size}` : ""}
          </p>
          <div className="mt-5 text-sm leading-relaxed whitespace-pre-wrap break-words text-bright">
            {view.doc.content || ""}
          </div>
          {safeImage(view.doc.image_url) ? <DocImage src={safeImage(view.doc.image_url) || ""} /> : null}
        </article>
      ) : null}
    </section>
  );
}
