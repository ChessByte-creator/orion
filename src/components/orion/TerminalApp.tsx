import { useEffect, useRef, useState } from "react";
import { AdminPanel } from "@/components/orion/admin/AdminPanel";
import type { AdminSection } from "@/components/orion/admin/sections";
import { BlackoutStage } from "@/components/orion/BlackoutStage";
import { ChatPanel } from "@/components/orion/ChatPanel";
import { Explorer } from "@/components/orion/Explorer";
import { HeaderBar } from "@/components/orion/HeaderBar";
import { LoginGate } from "@/components/orion/LoginGate";
import { OrionProvider, useOrion } from "@/components/orion/orion-context";
import { TransferStage } from "@/components/orion/TransferBar";
import { Viewer } from "@/components/orion/Viewer";
import { apiFetch } from "@/lib/orion/api";
import { cx } from "@/lib/orion/format";
import { playAlarm, playBlip, playCut, playEnd, playTick, unlockSound } from "@/lib/orion/sound";
import type { DocFull, DocListRow, DocView } from "@/lib/orion/types";

type Tab = "files" | "read" | "chat";

function Shell() {
  const { playerName, adminToken, user, download, blackout, blackoutMessage, seat, mirror, record, restoreTerminal, postView } = useOrion();
  const [adminOpen, setAdminOpen] = useState(false);
  const [panelFocus, setPanelFocus] = useState<AdminSection | null>(null);
  const [tab, setTab] = useState<Tab>("files");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [view, setView] = useState<DocView | null>(null);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const openedAdmin = useRef(false);
  const wasBlocked = useRef(false);
  const stackRef = useRef<Array<{ id: number; name: string }>>([]);
  const wasDown = useRef(false);
  const jobKey = useRef("");
  const followed = useRef<number | null>(null);
  const watching = !!seat && seat !== playerName;
  const follow = watching && mirror ? mirror.path.map((id, index) => ({ id, name: mirror.names[index] || String(id) })) : null;

  useEffect(() => {
    const onPointer = () => unlockSound();
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, []);

  useEffect(() => {
    if (blackout && !wasDown.current) playCut();
    wasDown.current = blackout;
  }, [blackout]);

  useEffect(() => {
    if (!download) {
      jobKey.current = "";
      return;
    }
    const key = `${download.id}:${download.status}:${download.percent}`;
    if (key === jobKey.current) return;
    const previous = jobKey.current;
    jobKey.current = key;
    const [prevId, prevStatus] = previous.split(":");
    if (download.status === "active" && (prevId !== String(download.id) || prevStatus !== "active")) playAlarm();
    else if (download.status === "active") playBlip();
    else playEnd(download.status === "ok");
  }, [download]);

  useEffect(() => {
    if (playerName && adminToken && !openedAdmin.current) {
      openedAdmin.current = true;
      setAdminOpen(true);
    }
  }, [playerName, adminToken]);

  useEffect(() => {
    if (download?.status === "active") setDismissed(null);
  }, [download?.id, download?.status]);

  useEffect(() => {
    setDismissed(null);
    setView(null);
    setActiveId(null);
    setTab("files");
  }, [playerName]);

  useEffect(() => {
    const blocked = !!user && !Number(user.can_view_repository);
    if (blocked && !wasBlocked.current) {
      setView({ kind: "blocked" });
      if (!watching) record("bloqueado");
    }
    if (!blocked && wasBlocked.current && view?.kind === "blocked") setView(null);
    wasBlocked.current = blocked;
  }, [user, view?.kind, watching, record]);

  useEffect(() => {
    if (!watching) {
      followed.current = null;
      return;
    }
    if (!mirror?.doc || followed.current === mirror.doc) return;
    followed.current = mirror.doc;
    setActiveId(mirror.doc);
    setTab("read");
    void fetchDoc(mirror.doc, null);
  }, [watching, mirror?.doc]);

  useEffect(() => {
    if (seat !== playerName) return;
    postView(stackRef.current.map((item) => item.id), stackRef.current.map((item) => item.name), activeId);
  }, [seat, playerName, activeId, postView]);

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
      if (watching) {
        setView({ kind: "error", message: "credencial exigida para quem está no terminal" });
        return;
      }
      if (password) record("senha-arquivo", raw.title || "ARQUIVO");
      setView({ kind: "password", id, error: password ? "credencial inválida" : undefined });
      return;
    }
    if (raw.code === "FILE_CORRUPTED") {
      if (!watching) record("corrompido", raw.title || "ARQUIVO");
      setView({ kind: "corrupted", title: raw.title || "ARQUIVO", fileSize: raw.file_size });
      return;
    }
    if (raw.code === "REPOSITORY_BLOCKED") {
      if (!watching) record("bloqueado");
      setView({ kind: "blocked" });
      return;
    }
    if (raw.error || !raw.title) {
      setView({ kind: "error", message: raw.error || "erro ao carregar documento" });
      return;
    }
    if (!watching) record("arquivo", raw.title);
    if (seat === playerName) postView(stackRef.current.map((item) => item.id), stackRef.current.map((item) => item.name), raw.id, raw.title);
    setView({ kind: "doc", doc: raw });
  }

  function openDoc(doc: DocListRow) {
    if (watching) return;
    playTick();
    setActiveId(doc.id);
    setTab("read");
    if (Number(doc.corrupted)) {
      record("corrompido", doc.title);
      setView({ kind: "corrupted", title: doc.title, fileSize: doc.file_size });
      if (seat === playerName) postView(stackRef.current.map((item) => item.id), stackRef.current.map((item) => item.name), doc.id, doc.title);
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
      <HeaderBar
        adminOpen={adminOpen}
        onToggleAdmin={() => setAdminOpen((open) => !open)}
        onDerrubar={() => {
          setPanelFocus("overview");
          setAdminOpen(true);
        }}
      />
      <div className="flex min-h-0 flex-1">
        <Explorer
          activeId={activeId}
          visible={tab === "files"}
          locked={watching}
          follow={follow}
          onOpenDoc={openDoc}
          onNavigate={() => {
            if (watching) return;
            setActiveId(null);
            setView(null);
          }}
          onPlace={(stack) => {
            stackRef.current = stack;
            if (seat === playerName) postView(stack.map((item) => item.id), stack.map((item) => item.name), activeId);
          }}
        />
        <div className={cx("min-w-0 flex-1 flex-col", tab === "files" ? "hidden md:flex" : "flex")}>
          {seat ? (
            <p className="border-b border-line px-3 py-2 text-xs tracking-widest text-dim uppercase">
              {watching ? `assistindo ${seat}` : "no comando"}
            </p>
          ) : null}
          <Viewer
            view={view}
            visible={tab === "read"}
            onPassword={async (id, password) => {
              if (watching) return;
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
      {blackout ? (
        <BlackoutStage
          message={blackoutMessage}
          onRestore={adminToken ? () => void restoreTerminal() : undefined}
          onOpenControl={adminToken && !adminOpen ? () => setAdminOpen(true) : undefined}
        />
      ) : null}
      {adminOpen && adminToken ? (
        <AdminPanel onClose={() => setAdminOpen(false)} focus={panelFocus ?? (download?.status === "active" ? "download" : null)} />
      ) : null}
      {showTransfer && download && !blackout ? (
        <TransferStage job={download} canControl={!!adminToken} onDismiss={download.status === "active" ? undefined : () => setDismissed(download.id)} />
      ) : null}
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
