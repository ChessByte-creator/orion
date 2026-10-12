export type Operator = {
  ip: string;
  current_name: string;
  can_view_chat: number;
  can_write_chat: number;
  can_view_repository: number;
  name_color: string | null;
  created_at?: string;
  last_seen?: string;
  message_count?: number;
  last_message?: string | null;
};

export type ClockState = {
  fictionalTime: string | null;
  realTimeAtSet: string | null;
  running: boolean;
};

export type DownloadJob = {
  id: number;
  title: string;
  source: string;
  size: string;
  percent: number;
  status: "active" | "ok" | "fail";
  note: string;
  updated_at: number;
  finished_at: number | null;
};

export type ChatMessage = {
  id: number;
  sender: string;
  text: string;
  created_at?: string;
  sender_alias?: string | null;
  sender_color?: string | null;
  text_color?: string | null;
  name_color?: string | null;
};

export type FolderRow = {
  id: number;
  name: string;
  parent_id?: number | null;
  hidden?: number;
  password?: string | null;
  password_protected?: number;
  created_at?: string;
};

export type FolderNode = FolderRow & {
  pathLabel: string;
  depth: number;
};

export type DocListRow = {
  id: number;
  title: string;
  folder_id?: number;
  image_url?: string | null;
  custom_date?: string | null;
  file_size?: string | null;
  hidden?: number;
  corrupted?: number;
  password_protected?: number;
  created_at?: string;
  folderLabel?: string;
};

export type DocFull = DocListRow & {
  content?: string;
  password?: string | null;
};

export type DocView =
  | { kind: "loading" }
  | { kind: "password"; id: number; error?: string }
  | { kind: "corrupted"; title: string; fileSize?: string | null }
  | { kind: "doc"; doc: DocFull }
  | { kind: "error"; message: string }
  | { kind: "blocked" };

export type EventRow = {
  id: number;
  label: string;
  message: string | null;
  sender_alias: string | null;
  sender_color: string | null;
  text_color: string | null;
  sort_order?: number;
};

export type RepoItem = {
  type: "folder" | "doc";
  id: number;
  label: string;
  hidden: number;
  depth: number;
  folder_id?: number;
  title?: string;
};

export type SessionResponse = {
  ok?: boolean;
  error?: string;
  code?: string;
  user?: Operator;
};

export type ApiOk = {
  ok?: boolean;
  error?: string;
  id?: number;
  download?: DownloadJob;
  user?: Operator;
};

export type PermKey = "can_view_chat" | "can_write_chat" | "can_view_repository";

export type UserPatch = {
  can_view_chat?: number;
  can_write_chat?: number;
  can_view_repository?: number;
  name_color?: string | null;
};
