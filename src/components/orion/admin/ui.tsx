import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "@/lib/orion/format";

export const fieldClass =
  "w-full min-h-11 border border-line-lit bg-bg px-3 text-sm text-bright outline-none focus:border-rose";

const tones = {
  rose: "border-rose-dim text-rose hover:bg-rose/10",
  cyan: "border-cyan-dim text-cyan hover:bg-cyan/10",
  ghost: "border-line-lit text-dim hover:text-bright",
  ok: "border-ok text-ok hover:bg-ok/10",
  danger: "border-danger text-danger hover:bg-danger/10",
  amber: "border-amber text-amber hover:bg-amber/10",
  violet: "border-violet text-violet hover:bg-violet/10",
} as const;

export function Btn({
  children,
  tone = "rose",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: keyof typeof tones }) {
  return (
    <button type="button" {...props} className={cx("term-btn inline-flex min-h-11 items-center justify-center border px-3 py-2 disabled:opacity-40", tones[tone], className)}>
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-2 block text-xs tracking-widest text-dim uppercase">{label}</span>
      {children}
    </label>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 border-b border-rose-dim pb-2 text-xs tracking-widest text-rose uppercase">{children}</h2>;
}

export function Feedback({ text, err }: { text: string | null; err?: boolean }) {
  if (!text) return null;
  return (
    <p className={cx("mt-3 border-l-2 px-3 py-2 text-xs", err ? "border-danger text-danger" : "border-ok text-ok")} role="status">
      {text}
    </p>
  );
}

export function useFeedback() {
  const [fb, setFb] = useState<{ text: string; err: boolean } | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );
  function show(text: string, err = false) {
    setFb({ text, err });
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFb(null), 3200);
  }
  return { fb, show };
}
