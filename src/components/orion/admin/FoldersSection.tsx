import { useState } from "react";
import { apiFetch } from "@/lib/orion/api";
import { useOrion } from "@/components/orion/orion-context";
import { useFolderTree } from "@/components/orion/admin/use-folder-tree";
import { Btn, Feedback, Field, SectionTitle, fieldClass, useFeedback } from "@/components/orion/admin/ui";

export function FoldersSection({ active }: { active: boolean }) {
  const { adminToken, bumpFolders } = useOrion();
  const { folders, error, loading } = useFolderTree(active);
  const [name, setName] = useState("");
  const [parent, setParent] = useState("");
  const [hidden, setHidden] = useState(false);
  const [password, setPassword] = useState("");
  const [drafts, setDrafts] = useState<Record<number, { name: string; password: string }>>({});
  const { fb, show } = useFeedback();

  function draftFor(id: number, folderName: string, folderPassword: string) {
    return drafts[id] || { name: folderName, password: folderPassword };
  }

  return (
    <div>
      <SectionTitle>Pastas</SectionTitle>
      <Field label="Nome">
        <input className={fieldClass} value={name} maxLength={60} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Pasta pai">
        <select className={fieldClass} value={parent} onChange={(event) => setParent(event.target.value)}>
          <option value="">raiz</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>{folder.pathLabel}</option>
          ))}
        </select>
      </Field>
      <label className="mb-4 flex min-h-11 items-center gap-3 text-xs text-fg">
        <input type="checkbox" checked={hidden} onChange={(event) => setHidden(event.target.checked)} />
        Criar já oculta
      </label>
      <Field label="Senha de acesso (opcional)">
        <input className={fieldClass} value={password} maxLength={64} autoComplete="off" onChange={(event) => setPassword(event.target.value)} />
      </Field>
      <Btn
        onClick={async () => {
          if (!name.trim()) { show("Nome obrigatório.", true); return; }
          const res = await apiFetch<{ ok?: boolean; error?: string }>("/api/admin/folders", "POST", {
            name: name.trim(),
            parent_id: parent ? Number(parent) : null,
            hidden,
            password: password.trim() || null,
          }, adminToken);
          if (res?.ok) {
            setName("");
            setPassword("");
            setHidden(false);
            bumpFolders();
            show("Pasta criada.");
          } else show(res?.error || "Falhou.", true);
        }}
      >
        Criar pasta
      </Btn>
      <Feedback text={fb?.text ?? null} err={fb?.err} />
      <div className="mt-6 border-t border-line pt-4">
        <p className="mb-3 text-xs tracking-widest text-dim uppercase">Existentes</p>
        {loading ? <p className="text-xs text-dim">carregando...</p> : null}
        {error ? <p className="text-xs text-danger">{error}</p> : null}
        {!loading && folders.length === 0 ? <p className="text-xs text-dim">nenhuma pasta</p> : null}
        <div className="space-y-3">
          {folders.map((folder) => {
            const isHidden = !!Number(folder.hidden);
            const draft = draftFor(folder.id, folder.name, folder.password || "");
            return (
              <div key={folder.id} className="border border-line p-3" style={{ marginLeft: folder.depth * 12 }}>
                <p className="mb-2 text-xs text-dim">{folder.pathLabel}{isHidden ? " · oculta" : ""}{folder.password ? " · com senha" : ""}</p>
                <input
                  className={`${fieldClass} mb-2`}
                  value={draft.name}
                  onChange={(event) => setDrafts((current) => ({ ...current, [folder.id]: { ...draft, name: event.target.value } }))}
                />
                <div className="mb-2 flex flex-wrap gap-2">
                  <Btn
                    tone="ghost"
                    onClick={async () => {
                      const res = await apiFetch<{ ok?: boolean; error?: string }>(`/api/admin/folders/${folder.id}`, "PUT", { name: draft.name.trim() }, adminToken);
                      if (res?.ok) { bumpFolders(); show("Nome salvo."); } else show(res?.error || "Falhou.", true);
                    }}
                  >
                    Renomear
                  </Btn>
                  <Btn
                    tone={isHidden ? "danger" : "ok"}
                    onClick={async () => {
                      const res = await apiFetch<{ ok?: boolean }>(`/api/admin/folders/${folder.id}`, "PUT", { hidden: !isHidden }, adminToken);
                      if (res?.ok) { bumpFolders(); show(isHidden ? "Pasta visível." : "Pasta oculta."); } else show("Falhou.", true);
                    }}
                  >
                    {isHidden ? "Oculta" : "Visível"}
                  </Btn>
                  <Btn
                    tone="danger"
                    onClick={async () => {
                      if (!window.confirm("Apagar esta pasta e os documentos diretos?")) return;
                      const res = await apiFetch<{ ok?: boolean }>(`/api/admin/folders/${folder.id}`, "DELETE", undefined, adminToken);
                      if (res?.ok) { bumpFolders(); show("Pasta apagada."); } else show("Falhou.", true);
                    }}
                  >
                    Apagar
                  </Btn>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    className={`${fieldClass} min-w-0 flex-1`}
                    value={draft.password}
                    placeholder="senha da pasta"
                    autoComplete="off"
                    onChange={(event) => setDrafts((current) => ({ ...current, [folder.id]: { ...draft, password: event.target.value } }))}
                  />
                  <Btn
                    tone="amber"
                    onClick={async () => {
                      const res = await apiFetch<{ ok?: boolean }>(`/api/admin/folders/${folder.id}`, "PUT", { password: draft.password.trim() || null }, adminToken);
                      if (res?.ok) { bumpFolders(); show(draft.password.trim() ? "Senha definida." : "Senha removida."); } else show("Falhou.", true);
                    }}
                  >
                    Salvar senha
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
