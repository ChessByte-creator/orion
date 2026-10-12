import { useEffect, useState } from "react";
import { apiFetch, loadAllDocs } from "@/lib/orion/api";
import type { DocFull, DocListRow } from "@/lib/orion/types";
import { useOrion } from "@/components/orion/orion-context";
import { useFolderTree } from "@/components/orion/admin/use-folder-tree";
import { Btn, Feedback, Field, SectionTitle, fieldClass, useFeedback } from "@/components/orion/admin/ui";

const empty = {
  folder_id: "",
  title: "",
  content: "",
  image_url: "",
  file_size: "",
  password: "",
  custom_date: "",
  corrupted: false,
  hidden: false,
};

export function DocsSection({ active }: { active: boolean }) {
  const { adminToken, bumpFolders } = useOrion();
  const { folders, error } = useFolderTree(active);
  const [docs, setDocs] = useState<DocListRow[]>([]);
  const [selected, setSelected] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [filter, setFilter] = useState("");
  const { fb, show } = useFeedback();

  useEffect(() => {
    if (!active) return;
    let cancel = false;
    void loadAllDocs(adminToken, folders).then((rows) => {
      if (!cancel) setDocs(rows);
    });
    return () => {
      cancel = true;
    };
  }, [active, adminToken, folders]);

  function patch(partial: Partial<typeof empty>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  function reset() {
    setEditingId(null);
    setForm(empty);
  }

  const shown = docs.filter((doc) => {
    const blob = `${doc.folderLabel || ""} ${doc.title}`.toLowerCase();
    return blob.includes(filter.trim().toLowerCase());
  });

  async function save() {
    if (!form.folder_id || !form.title.trim()) {
      show("Pasta e título obrigatórios.", true);
      return;
    }
    const payload = {
      folder_id: Number(form.folder_id),
      title: form.title.trim(),
      content: form.content,
      image_url: form.image_url.trim() || null,
      file_size: form.file_size.trim() || null,
      password: form.password.trim() || null,
      custom_date: form.custom_date || null,
      corrupted: form.corrupted,
      hidden: form.hidden,
    };
    const res = editingId
      ? await apiFetch<{ ok?: boolean; error?: string }>(`/api/admin/documents/${editingId}`, "PUT", payload, adminToken)
      : await apiFetch<{ ok?: boolean; error?: string }>("/api/admin/documents", "POST", payload, adminToken);
    if (res?.ok) {
      reset();
      bumpFolders();
      show(editingId ? "Documento atualizado." : "Documento criado.");
    } else show(res?.error || "Falhou.", true);
  }

  return (
    <div>
      <SectionTitle>{editingId ? "Editar arquivo" : "Novo arquivo"}</SectionTitle>
      {error ? <p className="mb-3 text-xs text-danger">{error}</p> : null}
      <Field label="Pasta">
        <select className={fieldClass} value={form.folder_id} onChange={(event) => patch({ folder_id: event.target.value })}>
          <option value="">selecione</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>{folder.pathLabel}</option>
          ))}
        </select>
      </Field>
      <Field label="Título">
        <input className={fieldClass} value={form.title} maxLength={100} onChange={(event) => patch({ title: event.target.value })} />
      </Field>
      <Field label="Conteúdo">
        <textarea className={`${fieldClass} min-h-36 py-2`} value={form.content} onChange={(event) => patch({ content: event.target.value })} />
      </Field>
      <Field label="URL de imagem (opcional)">
        <input className={fieldClass} value={form.image_url} onChange={(event) => patch({ image_url: event.target.value })} />
      </Field>
      <Field label="Tamanho fictício (opcional)">
        <input className={fieldClass} value={form.file_size} maxLength={20} onChange={(event) => patch({ file_size: event.target.value })} />
      </Field>
      <Field label="Data de registro (opcional)">
        <input className={fieldClass} type="date" value={form.custom_date} onChange={(event) => patch({ custom_date: event.target.value })} />
      </Field>
      <Field label="Senha (opcional)">
        <input className={fieldClass} value={form.password} maxLength={64} autoComplete="off" onChange={(event) => patch({ password: event.target.value })} />
      </Field>
      <div className="mb-4 flex flex-wrap gap-2">
        <Btn tone={form.corrupted ? "danger" : "ghost"} onClick={() => patch({ corrupted: !form.corrupted })}>
          {form.corrupted ? "Corrompido" : "Íntegro"}
        </Btn>
        <Btn tone={form.hidden ? "danger" : "ghost"} onClick={() => patch({ hidden: !form.hidden })}>
          {form.hidden ? "Oculto" : "Visível"}
        </Btn>
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => void save()}>{editingId ? "Salvar edição" : "Criar documento"}</Btn>
        <Btn tone="ghost" onClick={reset}>Limpar campos</Btn>
      </div>
      <Feedback text={fb?.text ?? null} err={fb?.err} />
      <div className="mt-6 border-t border-line pt-4">
        <Field label="Buscar existente">
          <input className={fieldClass} value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="título ou pasta" />
        </Field>
        <Field label="Documento">
          <select className={fieldClass} value={selected} onChange={(event) => setSelected(event.target.value)}>
            <option value="">selecione</option>
            {shown.map((doc) => (
              <option key={doc.id} value={doc.id}>
                [{doc.folderLabel}] {doc.title}{doc.file_size ? ` (${doc.file_size})` : ""}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex flex-wrap gap-2">
          <Btn
            tone="ghost"
            onClick={async () => {
              if (!selected) { show("Selecione um documento.", true); return; }
              const doc = await apiFetch<DocFull & { error?: string }>(`/api/documents/${selected}`, "GET", undefined, adminToken);
              if (!doc || doc.error || !doc.title) { show(doc?.error || "Erro ao carregar.", true); return; }
              setEditingId(doc.id);
              setForm({
                folder_id: String(doc.folder_id || ""),
                title: doc.title || "",
                content: doc.content || "",
                image_url: doc.image_url || "",
                file_size: doc.file_size || "",
                password: doc.password || "",
                custom_date: doc.custom_date || "",
                corrupted: !!Number(doc.corrupted),
                hidden: !!Number(doc.hidden),
              });
              show("Documento carregado para edição.");
            }}
          >
            Carregar para editar
          </Btn>
          <Btn
            tone="danger"
            onClick={async () => {
              if (!selected) return;
              if (!window.confirm("Apagar este documento?")) return;
              const res = await apiFetch<{ ok?: boolean }>(`/api/admin/documents/${selected}`, "DELETE", undefined, adminToken);
              if (res?.ok) {
                if (String(editingId) === selected) reset();
                setSelected("");
                bumpFolders();
                show("Documento apagado.");
              } else show("Falhou.", true);
            }}
          >
            Apagar
          </Btn>
        </div>
      </div>
    </div>
  );
}
