import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronLeft, FileText, Folder, Lock } from "lucide-react";
import { CredentialForm } from "@/components/orion/CredentialForm";
import { useOrion } from "@/components/orion/orion-context";
import { apiFetch, readList } from "@/lib/orion/api";
import { cx } from "@/lib/orion/format";
import type { DocListRow, FolderRow } from "@/lib/orion/types";

export function Explorer({
  activeId,
  visible,
  onOpenDoc,
  onNavigate,
}: {
  activeId: number | null;
  visible: boolean;
  onOpenDoc: (doc: DocListRow) => void;
  onNavigate: () => void;
}) {
  const { playerName, user, folderTick } = useOrion();
  const [stack, setStack] = useState<Array<{ id: number; name: string }>>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [docs, setDocs] = useState<DocListRow[]>([]);
  const [note, setNote] = useState<string | null>("carregando...");
  const [prompt, setPrompt] = useState<{ id: number; name: string; error?: string } | null>(null);
  const [filter, setFilter] = useState("");
  const passwords = useRef<Record<number, string>>({});

  const repoBlocked = !!user && !Number(user.can_view_repository);

  useEffect(() => {
    let cancel = false;

    async function load() {
      if (!playerName) return;
      if (repoBlocked) {
        if (!cancel) {
          setFolders([]);
          setDocs([]);
          setPrompt(null);
          setNote("repositório bloqueado pelo controle");
        }
        return;
      }
      const parent = stack[stack.length - 1];
      const sender = `sender=${encodeURIComponent(playerName)}`;
      const pw = parent ? passwords.current[parent.id] || "" : "";
      const fp = pw ? `&folder_password=${encodeURIComponent(pw)}` : "";
      const folderPath = parent ? `/api/folders?parent_id=${parent.id}&${sender}${fp}` : `/api/folders?${sender}`;
      const [folderRaw, docRaw] = await Promise.all([
        apiFetch<unknown>(folderPath),
        parent
          ? apiFetch<unknown>(`/api/documents?folder_id=${parent.id}&${sender}${fp}`)
          : Promise.resolve([] as unknown),
      ]);
      if (cancel) return;
      const folderParsed = readList<FolderRow>(folderRaw);
      const docParsed = readList<DocListRow>(docRaw);
      const blocked =
        folderParsed.code === "FOLDER_PASSWORD_REQUIRED"
          ? folderParsed
          : docParsed.code === "FOLDER_PASSWORD_REQUIRED"
            ? docParsed
            : null;
      if (blocked && parent) {
        const had = passwords.current[parent.id];
        if (had) delete passwords.current[parent.id];
        setFolders([]);
        setDocs([]);
        setNote(null);
        setPrompt({
          id: Number(blocked.extra.folder_id ?? parent.id),
          name: String(blocked.extra.folder_name || parent.name),
          error: had ? "credencial inválida" : undefined,
        });
        return;
      }
      if (folderParsed.code === "REPOSITORY_BLOCKED" || docParsed.code === "REPOSITORY_BLOCKED") {
        setPrompt(null);
        setNote("repositório bloqueado pelo controle");
        return;
      }
      if (folderRaw === null) {
        setPrompt(null);
        setNote("sem ligação com o sistema");
        return;
      }
      setPrompt(null);
      setFolders(folderParsed.rows);
      setDocs(docParsed.rows);
      setNote(
        !folderParsed.rows.length && !docParsed.rows.length
          ? stack.length
            ? "pasta vazia"
            : "nenhum arquivo disponível"
          : null,
      );
    }

    void load();
    return () => {
      cancel = true;
    };
  }, [playerName, folderTick, repoBlocked, stack]);

  function goRoot() {
    onNavigate();
    setFilter("");
    setStack([]);
  }

  function goTo(index: number) {
    onNavigate();
    setFilter("");
    setStack((current) => current.slice(0, index + 1));
  }

  function goBack() {
    onNavigate();
    setFilter("");
    setStack((current) => current.slice(0, -1));
  }

  const query = filter.trim().toLowerCase();
  const shownFolders = query ? folders.filter((folder) => folder.name.toLowerCase().includes(query)) : folders;
  const shownDocs = query ? docs.filter((doc) => doc.title.toLowerCase().includes(query)) : docs;

  return (
    <aside className={cx("min-h-0 w-full shrink-0 flex-col border-line bg-panel md:w-72 md:border-r", visible ? "flex" : "hidden md:flex")}>
      <div className="border-b border-line px-3 py-3 text-xs tracking-widest text-dim uppercase">Sistema de arquivos</div>
      <div className="flex min-h-11 flex-wrap items-center gap-1 border-b border-line px-2 py-1 text-xs">
        <button type="button" onClick={goRoot} className="min-h-11 px-1 text-cyan-dim hover:text-cyan">
          ~/
        </button>
        {stack.map((crumb, index) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <span className="text-dim">/</span>
            <button type="button" onClick={() => goTo(index)} className="min-h-11 px-1 text-cyan-dim hover:text-cyan">
              {crumb.name}
            </button>
          </span>
        ))}
      </div>
      {!prompt && (folders.length > 0 || docs.length > 0) ? (
        <div className="border-b border-line px-3 py-2">
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="filtrar nesta pasta"
            className="min-h-11 w-full border border-line bg-bg px-3 text-sm text-bright outline-none focus:border-cyan"
          />
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {prompt ? (
          <CredentialForm
            title={prompt.name}
            error={prompt.error}
            onBack={stack.length ? goBack : undefined}
            onSubmit={async (password) => {
              passwords.current[prompt.id] = password;
              setStack((current) => [...current]);
            }}
          />
        ) : (
          <>
            {stack.length > 0 ? (
              <button type="button" onClick={goBack} className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm text-dim hover:bg-hover hover:text-bright">
                <ChevronLeft className="size-4" aria-hidden="true" />
                ..
              </button>
            ) : null}
            {shownFolders.map((folder) => {
              const locked = !!Number(folder.password_protected);
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => {
                    onNavigate();
                    setFilter("");
                    setPrompt(null);
                    setStack((current) => [...current, { id: folder.id, name: folder.name }]);
                  }}
                  className="file-in flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm text-fg hover:bg-hover"
                >
                  {locked ? <Lock className="size-4 shrink-0 text-amber" /> : <Folder className="size-4 shrink-0 text-violet" />}
                  <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                </button>
              );
            })}
            {shownDocs.map((doc) => {
              const locked = !!Number(doc.password_protected);
              const corrupted = !!Number(doc.corrupted);
              const active = activeId === doc.id;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => onOpenDoc(doc)}
                  className={cx(
                    "file-in flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm hover:bg-hover",
                    active ? "bg-cyan/10 text-cyan" : "text-fg",
                    corrupted && "text-danger",
                  )}
                >
                  {locked ? (
                    <Lock className="size-4 shrink-0 text-amber" />
                  ) : corrupted ? (
                    <AlertTriangle className="size-4 shrink-0 text-danger" />
                  ) : (
                    <FileText className="size-4 shrink-0 text-cyan-dim" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{doc.title}</span>
                  {doc.file_size ? <span className="shrink-0 text-xs text-dim">{doc.file_size}</span> : null}
                </button>
              );
            })}
            {note ? <p className="px-3 py-4 text-xs text-dim">// {note}</p> : null}
            {!note && query && !shownFolders.length && !shownDocs.length ? (
              <p className="px-3 py-4 text-xs text-dim">// nada com esse filtro</p>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}
