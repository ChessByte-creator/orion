import { useEffect, useRef, useState } from "react";
import { AdminPanel } from "@/components/orion/admin/AdminPanel";
import { ChatPanel } from "@/components/orion/ChatPanel";
import { Explorer } from "@/components/orion/Explorer";
import { HeaderBar } from "@/components/orion/HeaderBar";
import { LoginGate } from "@/components/orion/LoginGate";
import { OrionProvider, useOrion } from "@/components/orion/orion-context";
import { TransferBar } from "@/components/orion/TransferBar";
import { Viewer } from "@/components/orion/Viewer";
import { apiFetch } from "@/lib/orion/api";
import { cx } from "@/lib/orion/format";
import type { DocFull, DocListRow, DocView } from "@/lib/orion/types";

type Tab = "files" | "read" | "chat";

function Shell() {
  const { playerName, adminToken, user, download } = useOrion();
  const [adminOpen, setAdminOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("files");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [view, setView] = useState<DocView | null>(null);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const openedAdmin = useRef(false);
  const wasBlocked = useRef(false);

  useEffect(() => {
    if (playerName && adminToken && !openedAdmin.current) {
      openedAdmin.current = true;
      setAdminOpen(true);
    }
  }, [playerName, adminToken]);

  useEffect(() => {
    setDismissed(null);
    setView(null);
    setActiveId(null);
    setTab("files");
  }, [playerName]);

  useEffect(() => {
    const blocked = !!user && !Number(user.can_view_repository);
    if (blocked && !wasBlocked.current) setView({ kind: "blocked" });
    if (!blocked && wasBlocked.current && view?.kind === "blocked") setView(null);
    wasBlocked.current = blocked;
  }, [user, view?.kind]);

  async function fetchDoc(id: number, password: string | null) {
    setView({ kind: "loading" });
    const pw = password ? `&password=${encodeURIComponent(password)}` : "";
    const raw = await apiFetch<DocFull & { error?: string; code?: string }>(
      `/api/documents/${id}?sender=${encodeURIComponent(playerName)}${pw}`,
    );
    if (!raw) {
      setView({ kind: "error", message: "sem ligação com o sistema" });
      return;
    }
    if (raw.code === "PASSWORD_REQUIRED") {
      setView({ kind: "password", id, error: password ? "credencial inválida" : undefined });
      return;
    }
    if (raw.code === "FILE_CORRUPTED") {
      setView({ kind: "corrupted", title: raw.title || "ARQUIVO", fileSize: raw.file_size });
      return;
    }
    if (raw.code === "REPOSITORY_BLOCKED") {
      setView({ kind: "blocked" });
      return;
    }
    if (raw.error || !raw.title) {
      setView({ kind: "error", message: raw.error || "erro ao carregar documento" });
      return;
    }
    setView({ kind: "doc", doc: raw });
  }

  function openDoc(doc: DocListRow) {
    setActiveId(doc.id);
    setTab("read");
    if (Number(doc.corrupted)) {
      setView({ kind: "corrupted", title: doc.title, fileSize: doc.file_size });
      return;
    }
    if (Number(doc.password_protected)) {
      setView({ kind: "password", id: doc.id });
      return;
    }
    void fetchDoc(doc.id, null);
  }

  const showTransfer = download && download.id !== dismissed;
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "files", label: "Arquivos" },
    { id: "read", label: "Leitura" },
    { id: "chat", label: "Canal" },
  ];

  if (!playerName) {
    return (
      <div className="h-dvh overflow-hidden bg-bg text-fg">
        <LoginGate />
        <div className="scanlines pointer-events-none fixed inset-0 z-50" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <HeaderBar adminOpen={adminOpen} onToggleAdmin={() => setAdminOpen((open) => !open)} />
      {showTransfer && download ? <TransferBar job={download} onDismiss={download.status === "active" ? undefined : () => setDismissed(download.id)} /> : null}
      <div className="flex min-h-0 flex-1">
        <Explorer
          activeId={activeId}
          visible={tab === "files"}
          onOpenDoc={openDoc}
          onNavigate={() => {
            setActiveId(null);
            setView(null);
          }}
        />
        <div className={cx("min-w-0 flex-1 flex-col", tab === "files" ? "hidden md:flex" : "flex")}>
          <Viewer
            view={view}
            visible={tab === "read"}
            onPassword={async (id, password) => {
              await fetchDoc(id, password);
            }}
          />
          <ChatPanel visible={tab === "chat"} />
        </div>
      </div>
      <nav className="grid shrink-0 grid-cols-3 border-t border-line bg-panel md:hidden">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cx(
              "term-btn min-h-11",
              tab === item.id ? "bg-cyan/10 text-cyan" : "text-dim",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {adminOpen && adminToken ? <AdminPanel onClose={() => setAdminOpen(false)} /> : null}
      <div className="scanlines pointer-events-none fixed inset-0 z-50" aria-hidden="true" />
    </div>
  );
}

export function TerminalApp() {
  return (
    <OrionProvider>
      <Shell />
    </OrionProvider>
  );
}
