import { useEffect, useState } from "react";
import { apiFetch, readList } from "@/lib/orion/api";
import { DEFAULT_NAME_COLOR } from "@/lib/orion/constants";
import { ago, safeColor } from "@/lib/orion/format";
import type { Operator, PermKey, UserPatch } from "@/lib/orion/types";
import { useOrion } from "@/components/orion/orion-context";
import { Btn, Feedback, SectionTitle, fieldClass, useFeedback } from "@/components/orion/admin/ui";

const PERMS: Array<{ key: PermKey; on: string; off: string }> = [
  { key: "can_view_chat", on: "Ver canal", off: "Sem canal" },
  { key: "can_write_chat", on: "Falar", off: "Mudo" },
  { key: "can_view_repository", on: "Arquivos on", off: "Arquivos off" },
];

function originalPerm(user: Operator, key: PermKey) {
  if (key === "can_view_repository") return Number(user.can_view_repository ?? 1) ? 1 : 0;
  return Number(user[key]) ? 1 : 0;
}

export function UsersSection({ active }: { active: boolean }) {
  const { adminToken } = useOrion();
  const [users, setUsers] = useState<Operator[]>([]);
  const [pending, setPending] = useState<Record<string, UserPatch>>({});
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { fb, show } = useFeedback();

  useEffect(() => {
    if (!active) return;
    let cancel = false;
    async function load() {
      const raw = await apiFetch<unknown>("/api/admin/users", "GET", undefined, adminToken);
      if (cancel) return;
      const parsed = readList<Operator>(raw);
      setError(parsed.error ?? null);
      setUsers(parsed.rows);
    }
    void load();
    return () => {
      cancel = true;
    };
  }, [active, adminToken]);

  function effective(user: Operator, key: PermKey) {
    const patch = pending[user.ip];
    if (patch && Object.prototype.hasOwnProperty.call(patch, key)) return patch[key] ? 1 : 0;
    return originalPerm(user, key);
  }

  function toggle(user: Operator, key: PermKey) {
    const next = effective(user, key) ? 0 : 1;
    const original = originalPerm(user, key);
    setPending((current) => {
      const copy = { ...current };
      const patch: UserPatch = { ...(copy[user.ip] || {}) };
      if (next === original) delete patch[key];
      else patch[key] = next;
      if (Object.keys(patch).length === 0) delete copy[user.ip];
      else copy[user.ip] = patch;
      return copy;
    });
  }

  function setColor(user: Operator, color: string | null) {
    const original = user.name_color || null;
    setPending((current) => {
      const copy = { ...current };
      const patch: UserPatch = { ...(copy[user.ip] || {}) };
      if (color === original) delete patch.name_color;
      else patch.name_color = color;
      if (Object.keys(patch).length === 0) delete copy[user.ip];
      else copy[user.ip] = patch;
      return copy;
    });
  }

  const count = Object.values(pending).reduce((sum, patch) => sum + Object.keys(patch).length, 0);
  const shown = users.filter((user) => {
    const blob = `${user.current_name} ${user.ip}`.toLowerCase();
    return blob.includes(query.trim().toLowerCase());
  });

  return (
    <div>
      <SectionTitle>Operadores</SectionTitle>
      <p className="mb-3 text-xs leading-relaxed text-dim">
        O identificador real é o endereço de rede. Trocar o nome não cria outro operador nem apaga a cor e as permissões.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        <Btn
          tone="ghost"
          onClick={async () => {
            const raw = await apiFetch<unknown>("/api/admin/users", "GET", undefined, adminToken);
            const parsed = readList<Operator>(raw);
            setError(parsed.error ?? null);
            setUsers(parsed.rows);
          }}
        >
          Atualizar
        </Btn>
        <Btn
          disabled={!count}
          onClick={async () => {
            const entries = Object.entries(pending);
            let ok = 0;
            for (const [ip, patch] of entries) {
              const res = await apiFetch<{ ok?: boolean }>(`/api/admin/users/${encodeURIComponent(ip)}`, "PUT", patch, adminToken);
              if (res?.ok) ok += 1;
            }
            setPending({});
            const raw = await apiFetch<unknown>("/api/admin/users", "GET", undefined, adminToken);
            setUsers(readList<Operator>(raw).rows);
            show(ok === entries.length ? `${ok} operador(es) atualizado(s).` : `${ok}/${entries.length} atualizado(s).`, ok !== entries.length);
          }}
        >
          Aplicar alterações{count ? ` (${count})` : ""}
        </Btn>
        <Btn tone="ghost" disabled={!count} onClick={() => { setPending({}); show("Alterações descartadas."); }}>
          Descartar
        </Btn>
      </div>
      <Feedback text={fb?.text ?? null} err={fb?.err} />
      {error ? <p className="mt-3 text-xs text-danger">{error}</p> : null}
      <input className={`${fieldClass} mt-4`} value={query} placeholder="filtrar nome ou IP" onChange={(event) => setQuery(event.target.value)} />
      <div className="mt-4 space-y-3">
        {shown.length === 0 ? <p className="text-xs text-dim">nenhum operador registrado</p> : null}
        {shown.map((user) => {
          const patch = pending[user.ip];
          const color = patch && "name_color" in patch ? patch.name_color : user.name_color;
          const swatch = safeColor(color) || DEFAULT_NAME_COLOR;
          return (
            <article key={user.ip} className={patch ? "border border-violet p-3" : "border border-line p-3"}>
              <div className="text-sm font-medium" style={safeColor(color) ? { color: safeColor(color) } : undefined}>{user.current_name}</div>
              <p className="mt-1 text-xs text-dim">{user.ip}</p>
              <p className="mt-1 text-xs text-dim">visto {ago(user.last_seen)} · {user.message_count || 0} msgs</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input type="color" value={swatch} className="size-11 border border-line bg-bg" onChange={(event) => setColor(user, event.target.value)} aria-label={`Cor de ${user.current_name}`} />
                <Btn tone="ghost" onClick={() => setColor(user, null)}>Cor padrão</Btn>
                {PERMS.map((perm) => {
                  const on = !!effective(user, perm.key);
                  const dirty = !!patch && perm.key in patch;
                  return (
                    <Btn key={perm.key} tone={dirty ? "violet" : on ? "ok" : "danger"} onClick={() => toggle(user, perm.key)}>
                      {on ? perm.on : perm.off}{dirty ? " *" : ""}
                    </Btn>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
