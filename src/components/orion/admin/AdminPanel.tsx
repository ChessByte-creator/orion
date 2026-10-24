import { useEffect, useState } from "react";
import { ChatSection } from "@/components/orion/admin/ChatSection";
import { ClockSection } from "@/components/orion/admin/ClockSection";
import { DocsSection } from "@/components/orion/admin/DocsSection";
import { DownloadSection } from "@/components/orion/admin/DownloadSection";
import { EventsSection } from "@/components/orion/admin/EventsSection";
import { FoldersSection } from "@/components/orion/admin/FoldersSection";
import { LogSection } from "@/components/orion/admin/LogSection";
import { OverviewSection } from "@/components/orion/admin/OverviewSection";
import { ADMIN_NAV, type AdminSection } from "@/components/orion/admin/sections";
import { UsersSection } from "@/components/orion/admin/UsersSection";
import { Btn } from "@/components/orion/admin/ui";
import { cx } from "@/lib/orion/format";

export function AdminPanel({ onClose, focus }: { onClose: () => void; focus?: AdminSection | null }) {
  const [section, setSection] = useState<AdminSection>(focus ?? "overview");

  useEffect(() => {
    if (focus) setSection(focus);
  }, [focus]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg text-fg lg:inset-y-0 lg:left-auto lg:w-admin lg:border-l lg:border-line">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-rose-dim px-3">
        <p className="text-xs tracking-widest text-rose">CONTROLE</p>
        <Btn tone="ghost" onClick={onClose}>Fechar</Btn>
      </div>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav className="flex gap-1 overflow-x-auto border-b border-line p-2 md:w-36 md:flex-col md:overflow-y-auto md:border-r md:border-b-0">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const on = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={cx(
                  "term-btn inline-flex min-h-11 shrink-0 items-center gap-2 px-3 md:w-full",
                  on ? "bg-rose/10 text-rose" : "text-dim hover:text-bright",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className={section === "overview" ? "block" : "hidden"}>
            <OverviewSection active={section === "overview"} onJump={setSection} />
          </div>
          <div className={section === "log" ? "block" : "hidden"}>
            <LogSection />
          </div>
          <div className={section === "chat" ? "block" : "hidden"}>
            <ChatSection active={section === "chat"} />
          </div>
          <div className={section === "download" ? "block" : "hidden"}>
            <DownloadSection active={section === "download"} />
          </div>
          <div className={section === "events" ? "block" : "hidden"}>
            <EventsSection active={section === "events"} />
          </div>
          <div className={section === "folders" ? "block" : "hidden"}>
            <FoldersSection active={section === "folders"} />
          </div>
          <div className={section === "docs" ? "block" : "hidden"}>
            <DocsSection active={section === "docs"} />
          </div>
          <div className={section === "users" ? "block" : "hidden"}>
            <UsersSection active={section === "users"} />
          </div>
          <div className={section === "clock" ? "block" : "hidden"}>
            <ClockSection active={section === "clock"} />
          </div>
        </div>
      </div>
    </div>
  );
}
