import { Clock, Download, FileText, FolderTree, LayoutDashboard, MessageSquare, Users, Zap, type LucideIcon } from "lucide-react";

export type AdminSection = "overview" | "chat" | "download" | "events" | "folders" | "docs" | "users" | "clock";

export const ADMIN_NAV: Array<{ id: AdminSection; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Visão", icon: LayoutDashboard },
  { id: "chat", label: "Canal", icon: MessageSquare },
  { id: "download", label: "Envio", icon: Download },
  { id: "events", label: "Eventos", icon: Zap },
  { id: "folders", label: "Pastas", icon: FolderTree },
  { id: "docs", label: "Arquivos", icon: FileText },
  { id: "users", label: "Pessoas", icon: Users },
  { id: "clock", label: "Relógio", icon: Clock },
];
