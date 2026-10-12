import { ORION_API } from "@/lib/orion/constants";
import type {
  DocFull,
  DocListRow,
  DownloadJob,
  FolderNode,
  FolderRow,
  RepoItem,
} from "@/lib/orion/types";

export async function apiFetch<T = unknown>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: unknown,
  token?: string | null,
): Promise<T | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${ORION_API}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export type ListResult<T> = {
  rows: T[];
  error?: string;
  code?: string;
  extra: Record<string, unknown>;
};

export function readList<T>(value: unknown): ListResult<T> {
  if (value == null) return { rows: [], error: "sem ligação com o sistema", extra: {} };
  if (Array.isArray(value)) return { rows: value as T[], extra: {} };
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const code = typeof rec.code === "string" ? rec.code : undefined;
    if (typeof rec.error === "string") return { rows: [], error: rec.error, code, extra: rec };
    for (const key of ["results", "folders", "roots", "docs", "documents"]) {
      const inner = rec[key];
      if (Array.isArray(inner)) return { rows: inner as T[], code, extra: rec };
    }
  }
  return { rows: [], extra: {} };
}

export function readDownload(value: unknown): DownloadJob | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<DownloadJob>;
  if (raw.status !== "active" && raw.status !== "ok" && raw.status !== "fail") return null;
  if (typeof raw.id !== "number") return null;
  return {
    id: raw.id,
    title: String(raw.title || "ARQUIVO"),
    source: String(raw.source || ""),
    size: String(raw.size || ""),
    percent: Math.max(0, Math.min(100, Number(raw.percent) || 0)),
    status: raw.status,
    note: String(raw.note || ""),
    updated_at: Number(raw.updated_at) || 0,
    finished_at: raw.finished_at ?? null,
  };
}

export async function loadFolderTree(token: string): Promise<{ folders: FolderNode[]; error?: string }> {
  async function subtree(parentId: number | null, prefix: string, depth: number): Promise<FolderNode[]> {
    if (depth > 16) return [];
    const path = parentId == null ? "/api/folders" : `/api/folders?parent_id=${parentId}`;
    const raw = await apiFetch<unknown>(path, "GET", undefined, token);
    const parsed = readList<FolderRow>(raw);
    if (parsed.error && !Array.isArray(raw)) {
      if (parentId == null) throw new Error(parsed.error);
      return [];
    }
    const groups = await Promise.all(
      parsed.rows.map(async (folder) => {
        const pathLabel = prefix ? `${prefix} / ${folder.name}` : folder.name;
        const node: FolderNode = { ...folder, pathLabel, depth };
        const below = await subtree(folder.id, pathLabel, depth + 1);
        return [node, ...below];
      }),
    );
    return groups.flat();
  }

  try {
    return { folders: await subtree(null, "", 0) };
  } catch (error) {
    return { folders: [], error: error instanceof Error ? error.message : "falha ao listar pastas" };
  }
}

export async function loadRepoIndex(token: string): Promise<{ items: RepoItem[]; error?: string }> {
  const tree = await loadFolderTree(token);
  if (tree.error) return { items: [], error: tree.error };
  const groups = await Promise.all(
    tree.folders.map(async (folder) => {
      const raw = await apiFetch<unknown>(`/api/documents?folder_id=${folder.id}`, "GET", undefined, token);
      return { folder, docs: readList<DocListRow>(raw).rows };
    }),
  );
  const items: RepoItem[] = [];
  for (const { folder, docs } of groups) {
    items.push({
      type: "folder",
      id: folder.id,
      label: folder.pathLabel,
      hidden: Number(folder.hidden) ? 1 : 0,
      depth: folder.depth,
    });
    for (const doc of docs) {
      items.push({
        type: "doc",
        id: doc.id,
        label: `${folder.pathLabel} / ${doc.title}`,
        hidden: Number(doc.hidden) ? 1 : 0,
        depth: folder.depth + 1,
        folder_id: folder.id,
        title: doc.title,
      });
    }
  }
  return { items };
}

export async function loadAllDocs(token: string, folders: FolderNode[]) {
  const groups = await Promise.all(
    folders.map(async (folder) => {
      const raw = await apiFetch<unknown>(`/api/documents?folder_id=${folder.id}`, "GET", undefined, token);
      return readList<DocListRow>(raw).rows.map((doc) => ({ ...doc, folderLabel: folder.pathLabel, folder_id: folder.id }));
    }),
  );
  return groups.flat();
}

// The update route rewrites every column. Read the row first so a visibility
// change cannot erase the text, credential, or image.
export async function setDocHidden(id: number, hidden: boolean, token: string) {
  const raw = await apiFetch<DocFull & { error?: string }>(`/api/documents/${id}`, "GET", undefined, token);
  if (!raw || raw.error || !raw.title || raw.folder_id == null) return raw;
  return apiFetch<{ ok?: boolean; error?: string }>(
    `/api/admin/documents/${id}`,
    "PUT",
    {
      folder_id: raw.folder_id,
      title: raw.title,
      content: raw.content || "",
      image_url: raw.image_url || null,
      custom_date: raw.custom_date || null,
      hidden,
      file_size: raw.file_size || null,
      password: raw.password || null,
      corrupted: !!Number(raw.corrupted),
    },
    token,
  );
}
