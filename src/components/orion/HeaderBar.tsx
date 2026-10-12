import { useEffect, useState } from "react";
import { useOrion } from "@/components/orion/orion-context";
import { cx, fictionalNow } from "@/lib/orion/format";

export function HeaderBar({
  adminOpen,
  onToggleAdmin,
}: {
  adminOpen: boolean;
  onToggleAdmin: () => void;
}) {
  const { adminToken, clock, link } = useOrion();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(fictionalNow(clock));
    const id = window.setInterval(() => setNow(fictionalNow(clock)), 1000);
    return () => window.clearInterval(id);
  }, [clock]);

  const online = link === "on";
  const label = link === "on" ? "Online" : link === "off" ? "Sem sinal" : "Ligando";

  return (
    <header className="header-sheen flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-panel px-3">
      <div className="min-w-0 truncate text-xs tracking-widest text-cyan">ORIONSOFTWARE</div>
      <div className="flex items-center gap-2 sm:gap-3">
        {adminToken ? (
          <button
            type="button"
            onClick={onToggleAdmin}
            className={cx(
              "term-btn min-h-11 border px-3",
              adminOpen ? "border-rose text-rose" : "border-rose-dim text-rose hover:bg-rose/10",
            )}
          >
            {adminOpen ? "Ocultar" : "Controle"}
          </button>
        ) : null}
        <div className="text-right">
          <div className="text-sm text-bright tabular-nums">{now ? now.toLocaleTimeString("pt-BR") : "--:--:--"}</div>
          <div className="hidden text-xs text-dim sm:block">
            {now
              ? now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
              : ""}
            {clock?.fictionalTime && !clock.running ? " · pausado" : ""}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-dim">
          <span className={cx("size-2 rounded-full", online ? "bg-ok blink" : "bg-danger")} />
          <span className="hidden sm:inline">{label}</span>
        </div>
      </div>
    </header>
  );
}
