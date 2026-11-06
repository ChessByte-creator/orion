import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronLeft, FileText, Folder, Lock } from "lucide-react";
import { CredentialForm } from "@/components/orion/CredentialForm";
import { useOrion } from "@/components/orion/orion-context";
import { apiFetch, readList } from "@/lib/orion/api";
import { cx } from "@/lib/orion/format";
import { playTick } from "@/lib/orion/sound";
import type { DocListRow, FolderRow } from "@/lib/orion/types";

export function Explorer({
  activeId,
  visible,
  locked,
  follow,
  onOpenDoc,
  onNavigate,
  onPlace,
}: {
  activeId: number | null;
  visible: boolean;
  locked?: boolean;
  follow?: Array<{ id: number; name: string }> | null;
  onOpenDoc: (doc: DocListRow) => void;
  onNavigate: () => void;
  onPlace?: (stack: Array<{ id: number; name: string }>) => void;
}) {
  const { playerName, user, folderTick, record } = useOrion();
  const [stack, setStack] = useState<Array<{ id: number; name: string }>>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [docs, setDocs] = useState<DocListRow[]>([]);
  const [note, setNote] = useState<string | null>("carregando...");
  const [prompt, setPrompt] = useState<{ id: number; name: string; error?: string } | null>(null);
  const [filter, setFilter] = useState("");
  const passwords = useRef<Record<number, string>>({});
  const failKey = useRef("");

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
        const key = `${parent.id}:${had || ""}`;
        if (had && failKey.current !== key) {
          failKey.current = key;
          record("senha-pasta", String(blocked.extra.folder_name || parent.name));
        }
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

  const followKey = follow?.map((item) => item.id).join(",") ?? "";
  useEffect(() => {
    if (!follow) return;
    setPrompt(null);
    setStack(follow);
  }, [followKey]);

  useEffect(() => {
    onPlace?.(stack);
  }, [stack, onPlace]);

  function goRoot() {
    if (locked) return;
    onNavigate();
    setFilter("");
    setStack([]);
  }

  function goTo(index: number) {
    if (locked) return;
    onNavigate();
    setFilter("");
    setStack((current) => current.slice(0, index + 1));
  }

  function goBack() {
    if (locked) return;
    onNavigate();
    setFilter("");
    setStack((current) => current.slice(0, -1));
  }

  const query = filter.trim().toLowerCase();
  const shownFolders = query && !locked ? folders.filter((folder) => folder.name.toLowerCase().includes(query)) : folders;
  const shownDocs = query && !locked ? docs.filter((doc) => doc.title.toLowerCase().includes(query)) : docs;
  const quiet = !!locked && activeId != null;
  const shown = quiet ? (visible ? "flex md:hidden" : "hidden") : visible ? "flex" : "hidden md:flex";

  return (
    <aside className={cx("min-h-0 w-full shrink-0 flex-col border-line bg-panel md:w-72 md:border-r", shown)}>
      <div className="border-b border-line px-3 py-3 text-xs tracking-widest text-dim uppercase">{locked ? "Na tela" : "Sistema de arquivos"}</div>
      {locked ? (
        <p className="border-b border-line px-3 py-3 text-xs leading-relaxed text-dim">
          {stack.length ? `~/ ${stack.map((crumb) => crumb.name).join(" / ")}` : "~/"}
        </p>
      ) : (
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
      )}
      {!locked && !prompt && (folders.length > 0 || docs.length > 0) ? (
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
          locked ? (
            <p className="px-3 py-4 text-xs text-dim">// credencial exigida para quem está no terminal</p>
          ) : (
          <CredentialForm
            title={prompt.name}
            error={prompt.error}
            onBack={stack.length ? goBack : undefined}
            onSubmit={async (password) => {
              passwords.current[prompt.id] = password;
              setStack((current) => [...current]);
            }}
          />
          )
        ) : (
          <>
            {stack.length > 0 && !locked ? (
              <button type="button" onClick={goBack} className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm text-dim hover:bg-hover hover:text-bright">
                <ChevronLeft className="size-4" aria-hidden="true" />
                ..
              </button>
            ) : null}
            {shownFolders.map((folder) => {
              const sealed = !!Number(folder.password_protected);
              const body = (
                <>
                  {sealed ? <Lock className="size-4 shrink-0 text-amber" /> : <Folder className="size-4 shrink-0 text-violet" />}
                  <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                </>
              );
              if (locked) {
                return (
                  <div key={folder.id} className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm text-fg">
                    {body}
                  </div>
                );
              }
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => {
                    playTick();
                    onNavigate();
                    setFilter("");
                    setPrompt(null);
                    const path = [...stack.map((crumb) => crumb.name), folder.name].join(" / ");
                    record("pasta", path);
                    setStack((current) => [...current, { id: folder.id, name: folder.name }]);
                  }}
                  className="file-in flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm text-fg hover:bg-hover"
                >
                  {body}
                </button>
              );
            })}
            {shownDocs.map((doc) => {
              const sealed = !!Number(doc.password_protected);
              const corrupted = !!Number(doc.corrupted);
              const active = activeId === doc.id;
              const body = (
                <>
                  {sealed ? (
                    <Lock className="size-4 shrink-0 text-amber" />
                  ) : corrupted ? (
                    <AlertTriangle className="size-4 shrink-0 text-danger" />
                  ) : (
                    <FileText className="size-4 shrink-0 text-cyan-dim" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{doc.title}</span>
                  {doc.file_size ? <span className="shrink-0 text-xs text-dim">{doc.file_size}</span> : null}
                </>
              );
              const tone = cx(
                "flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm",
                active ? "bg-cyan/10 text-cyan" : "text-fg",
                corrupted && "text-danger",
              );
              if (locked) {
                return (
                  <div key={doc.id} className={tone}>
                    {body}
                  </div>
                );
              }
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    playTick();
                    onOpenDoc(doc);
                  }}
                  className={cx(tone, "file-in hover:bg-hover")}
                >
                  {body}
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
