import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Terminal, c as LayoutDashboard, d as FileText, f as Download, i as TriangleAlert, l as Folder, m as ChevronLeft, n as X, o as MessageSquare, p as Clock, r as Users, s as Lock, t as Zap, u as FolderTree } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DvlEus5F.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ORION_API = "https://orion-terminal.sinalmudo.workers.dev";
var DEFAULT_NPC_NICK = "#ff6b9d";
var DEFAULT_NPC_TEXT = "#ffd0e0";
var DEFAULT_NPC_NAME = "[ORION-CONTROL]";
async function apiFetch(path, method = "GET", body, token) {
	try {
		const headers = {
			Accept: "application/json",
			"Content-Type": "application/json"
		};
		if (token) headers.Authorization = `Bearer ${token}`;
		return await (await fetch(`${ORION_API}${path}`, {
			method,
			headers,
			body: body === void 0 ? void 0 : JSON.stringify(body),
			cache: "no-store"
		})).json();
	} catch {
		return null;
	}
}
function readList(value) {
	if (value == null) return {
		rows: [],
		error: "sem ligação com o sistema",
		extra: {}
	};
	if (Array.isArray(value)) return {
		rows: value,
		extra: {}
	};
	if (typeof value === "object") {
		const rec = value;
		const code = typeof rec.code === "string" ? rec.code : void 0;
		if (typeof rec.error === "string") return {
			rows: [],
			error: rec.error,
			code,
			extra: rec
		};
		for (const key of [
			"results",
			"folders",
			"roots",
			"docs",
			"documents"
		]) {
			const inner = rec[key];
			if (Array.isArray(inner)) return {
				rows: inner,
				code,
				extra: rec
			};
		}
	}
	return {
		rows: [],
		extra: {}
	};
}
function readDownload(value) {
	if (!value || typeof value !== "object") return null;
	const raw = value;
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
		finished_at: raw.finished_at ?? null
	};
}
async function loadFolderTree(token) {
	async function subtree(parentId, prefix, depth) {
		if (depth > 16) return [];
		const raw = await apiFetch(parentId == null ? "/api/folders" : `/api/folders?parent_id=${parentId}`, "GET", void 0, token);
		const parsed = readList(raw);
		if (parsed.error && !Array.isArray(raw)) {
			if (parentId == null) throw new Error(parsed.error);
			return [];
		}
		return (await Promise.all(parsed.rows.map(async (folder) => {
			const pathLabel = prefix ? `${prefix} / ${folder.name}` : folder.name;
			return [{
				...folder,
				pathLabel,
				depth
			}, ...await subtree(folder.id, pathLabel, depth + 1)];
		}))).flat();
	}
	try {
		return { folders: await subtree(null, "", 0) };
	} catch (error) {
		return {
			folders: [],
			error: error instanceof Error ? error.message : "falha ao listar pastas"
		};
	}
}
async function loadRepoIndex(token) {
	const tree = await loadFolderTree(token);
	if (tree.error) return {
		items: [],
		error: tree.error
	};
	const groups = await Promise.all(tree.folders.map(async (folder) => {
		return {
			folder,
			docs: readList(await apiFetch(`/api/documents?folder_id=${folder.id}`, "GET", void 0, token)).rows
		};
	}));
	const items = [];
	for (const { folder, docs } of groups) {
		items.push({
			type: "folder",
			id: folder.id,
			label: folder.pathLabel,
			hidden: Number(folder.hidden) ? 1 : 0,
			depth: folder.depth
		});
		for (const doc of docs) items.push({
			type: "doc",
			id: doc.id,
			label: `${folder.pathLabel} / ${doc.title}`,
			hidden: Number(doc.hidden) ? 1 : 0,
			depth: folder.depth + 1,
			folder_id: folder.id,
			title: doc.title
		});
	}
	return { items };
}
async function loadAllDocs(token, folders) {
	return (await Promise.all(folders.map(async (folder) => {
		return readList(await apiFetch(`/api/documents?folder_id=${folder.id}`, "GET", void 0, token)).rows.map((doc) => ({
			...doc,
			folderLabel: folder.pathLabel,
			folder_id: folder.id
		}));
	}))).flat();
}
async function setDocHidden(id, hidden, token) {
	const raw = await apiFetch(`/api/documents/${id}`, "GET", void 0, token);
	if (!raw || raw.error || !raw.title || raw.folder_id == null) return raw;
	return apiFetch(`/api/admin/documents/${id}`, "PUT", {
		folder_id: raw.folder_id,
		title: raw.title,
		content: raw.content || "",
		image_url: raw.image_url || null,
		custom_date: raw.custom_date || null,
		hidden,
		file_size: raw.file_size || null,
		password: raw.password || null,
		corrupted: !!Number(raw.corrupted)
	}, token);
}
function cx(...parts) {
	return parts.filter(Boolean).join(" ");
}
function normalizeName(name) {
	return name.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 20);
}
function safeColor(value) {
	if (value && /^#[0-9a-fA-F]{6}$/.test(value)) return value;
}
function safeImage(url) {
	if (!url) return null;
	try {
		const parsed = new URL(url);
		if (parsed.protocol === "https:" || parsed.protocol === "http:") return url;
	} catch {
		return null;
	}
	return null;
}
function parseDbDate(ts) {
	if (!ts) return null;
	let s = String(ts).trim();
	if (!/Z$|[+-]\d{2}:\d{2}$/.test(s)) s = `${s.replace(" ", "T")}Z`;
	const date = new Date(s);
	return Number.isNaN(date.getTime()) ? null : date;
}
function fmtTime(ts) {
	const date = parseDbDate(ts);
	if (!date) return "--:--";
	return date.toLocaleTimeString("pt-BR", {
		hour: "2-digit",
		minute: "2-digit"
	});
}
function fmtDateTime(ts) {
	const date = parseDbDate(ts);
	if (!date) return "--";
	return date.toLocaleString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit"
	});
}
function ago(ts) {
	const date = parseDbDate(ts);
	if (!date) return "--";
	const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1e3));
	if (seconds < 45) return "agora";
	if (seconds < 3600) return `há ${Math.round(seconds / 60)} min`;
	if (seconds < 86400) return `há ${Math.round(seconds / 3600)} h`;
	return fmtDateTime(ts);
}
function seenRecently(ts, windowMs = 18e4) {
	const date = parseDbDate(ts);
	if (!date) return false;
	return Date.now() - date.getTime() < windowMs;
}
function fictionalNow(clock) {
	if (!clock?.fictionalTime) return /* @__PURE__ */ new Date();
	const fictional = new Date(clock.fictionalTime);
	if (Number.isNaN(fictional.getTime())) return /* @__PURE__ */ new Date();
	if (!clock.running) return fictional;
	const anchor = clock.realTimeAtSet ? new Date(clock.realTimeAtSet) : null;
	if (!anchor || Number.isNaN(anchor.getTime())) return fictional;
	return new Date(fictional.getTime() + (Date.now() - anchor.getTime()));
}
function toDatetimeLocal(date) {
	const pad = (n) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
function formatDocDate(doc) {
	if (doc.custom_date && /^\d{4}-\d{2}-\d{2}$/.test(doc.custom_date)) {
		const [y, m, d] = doc.custom_date.split("-");
		return `${d}/${m}/${y}`;
	}
	const parsed = parseDbDate(doc.created_at);
	return parsed ? parsed.toLocaleDateString("pt-BR") : "—";
}
var GLITCH = "█▓▒░╬╫╪┼╩╦╣╠═║╗╔╝╚▄▀■□▪▫";
function glitchBlock() {
	const lines = [];
	for (let i = 0; i < 10; i++) {
		const len = 42 + Math.floor(Math.random() * 28);
		let line = "";
		for (let j = 0; j < len; j++) line += GLITCH[Math.floor(Math.random() * 24)];
		lines.push(line);
	}
	return lines.join("\n");
}
var OrionContext = (0, import_react.createContext)(null);
function isOperator(value) {
	if (!value || typeof value !== "object") return false;
	const row = value;
	return typeof row.ip === "string" && typeof row.current_name === "string";
}
function readClock(value) {
	if (!value || typeof value !== "object") return null;
	const row = value;
	return {
		fictionalTime: row.fictionalTime ?? null,
		realTimeAtSet: row.realTimeAtSet ?? null,
		running: row.running !== false
	};
}
function OrionProvider({ children }) {
	const [playerName, setPlayerName] = (0, import_react.useState)("");
	const [adminToken, setAdminToken] = (0, import_react.useState)("");
	const [savedName, setSavedName] = (0, import_react.useState)("");
	const [user, setUser] = (0, import_react.useState)(null);
	const [link, setLink] = (0, import_react.useState)("wait");
	const [clock, setClock] = (0, import_react.useState)(null);
	const [messages, setMessages] = (0, import_react.useState)([]);
	const [download, setDownload] = (0, import_react.useState)(null);
	const [folderTick, setFolderTick] = (0, import_react.useState)(0);
	const [chatEpoch, setChatEpoch] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		const params = new URLSearchParams(window.location.search);
		setAdminToken(params.get("admin")?.trim() || "");
		setSavedName(localStorage.getItem("operatorName") || "");
	}, []);
	(0, import_react.useEffect)(() => {
		if (!playerName) return;
		let cancelled = false;
		let since = 0;
		const seen = /* @__PURE__ */ new Set();
		let inflight = false;
		async function tick() {
			if (inflight || cancelled) return;
			inflight = true;
			try {
				const data = await apiFetch(`/api/poll?sender=${encodeURIComponent(playerName)}&since=${since}`);
				if (cancelled) return;
				if (!data || data.error && !data.user) {
					setLink("off");
					return;
				}
				setLink("on");
				if (isOperator(data.user)) setUser(data.user);
				if (data.clock) setClock(readClock(data.clock));
				if ("download" in data) setDownload(readDownload(data.download));
				const incoming = Array.isArray(data.messages) ? data.messages : [];
				const fresh = [];
				for (const message of incoming) {
					if (typeof message.id !== "number" || seen.has(message.id)) continue;
					seen.add(message.id);
					fresh.push(message);
					if (message.id > since) since = message.id;
				}
				if (fresh.length) setMessages((prev) => {
					const real = [...prev.filter((item) => item.id > 0), ...fresh];
					const pending = prev.filter((item) => item.id < 0 && !real.some((row) => row.sender === item.sender && row.text === item.text));
					const merged = [...real, ...pending];
					return merged.length > 300 ? merged.slice(-300) : merged;
				});
			} finally {
				inflight = false;
			}
		}
		tick();
		const id = window.setInterval(() => void tick(), 2e3);
		return () => {
			cancelled = true;
			window.clearInterval(id);
		};
	}, [playerName, chatEpoch]);
	async function connect(raw) {
		const name = normalizeName(raw);
		if (!name) return "Identificador inválido. Use letras, números, _ ou -.";
		const res = await apiFetch("/api/session", "POST", { name });
		if (!res?.user || res.error) return "Não foi possível abrir a sessão.";
		localStorage.setItem("operatorName", name);
		setSavedName(name);
		setMessages([]);
		setPlayerName(name);
		setUser(res.user);
		setLink("on");
		return null;
	}
	function disconnect() {
		setPlayerName("");
		setUser(null);
		setMessages([]);
		setDownload(null);
		setLink("wait");
		setChatEpoch((value) => value + 1);
	}
	async function sendPlayer(text) {
		const trimmed = text.trim().slice(0, 300);
		if (!trimmed || !playerName) return { ok: false };
		if (user && !Number(user.can_write_chat)) return {
			ok: false,
			code: "CHAT_WRITE_BLOCKED"
		};
		const tempId = -Date.now();
		const optimistic = {
			id: tempId,
			sender: playerName,
			text: trimmed,
			created_at: (/* @__PURE__ */ new Date()).toISOString(),
			name_color: user?.name_color ?? null
		};
		setMessages((prev) => [...prev, optimistic]);
		const res = await apiFetch("/api/chat", "POST", {
			sender: playerName,
			text: trimmed
		});
		if (!res || res.error) {
			setMessages((prev) => prev.filter((item) => item.id !== tempId));
			if (res?.user) setUser(res.user);
			return {
				ok: false,
				code: res?.code
			};
		}
		return { ok: true };
	}
	function resetChat() {
		setMessages([]);
		setChatEpoch((value) => value + 1);
	}
	const value = {
		playerName,
		adminToken,
		savedName,
		user,
		link,
		clock,
		messages,
		download,
		folderTick,
		connect,
		disconnect,
		sendPlayer,
		resetChat,
		bumpFolders: () => setFolderTick((value) => value + 1),
		setClock,
		setDownload
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrionContext.Provider, {
		value,
		children
	});
}
function useOrion() {
	const ctx = (0, import_react.useContext)(OrionContext);
	if (!ctx) throw new Error("Terminal fora do contexto.");
	return ctx;
}
var fieldClass = "w-full min-h-11 border border-line-lit bg-bg px-3 text-sm text-bright outline-none focus:border-rose";
var tones = {
	rose: "border-rose-dim text-rose hover:bg-rose/10",
	cyan: "border-cyan-dim text-cyan hover:bg-cyan/10",
	ghost: "border-line-lit text-dim hover:text-bright",
	ok: "border-ok text-ok hover:bg-ok/10",
	danger: "border-danger text-danger hover:bg-danger/10",
	amber: "border-amber text-amber hover:bg-amber/10",
	violet: "border-violet text-violet hover:bg-violet/10"
};
function Btn({ children, tone = "rose", className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		...props,
		className: cx("term-btn inline-flex min-h-11 items-center justify-center border px-3 py-2 disabled:opacity-40", tones[tone], className),
		children
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "mb-4 block",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mb-2 block text-xs tracking-widest text-dim uppercase",
			children: label
		}), children]
	});
}
function SectionTitle({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
		className: "mb-4 border-b border-rose-dim pb-2 text-xs tracking-widest text-rose uppercase",
		children
	});
}
function Feedback({ text, err }) {
	if (!text) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: cx("mt-3 border-l-2 px-3 py-2 text-xs", err ? "border-danger text-danger" : "border-ok text-ok"),
		role: "status",
		children: text
	});
}
function useFeedback() {
	const [fb, setFb] = (0, import_react.useState)(null);
	const timer = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => () => {
		if (timer.current) window.clearTimeout(timer.current);
	}, []);
	function show(text, err = false) {
		setFb({
			text,
			err
		});
		if (timer.current) window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => setFb(null), 3200);
	}
	return {
		fb,
		show
	};
}
function ChatSection({ active }) {
	const { adminToken, resetChat } = useOrion();
	const [nick, setNick] = (0, import_react.useState)("");
	const [nickColor, setNickColor] = (0, import_react.useState)(DEFAULT_NPC_NICK);
	const [textColor, setTextColor] = (0, import_react.useState)(DEFAULT_NPC_TEXT);
	const [useNick, setUseNick] = (0, import_react.useState)(false);
	const [useText, setUseText] = (0, import_react.useState)(false);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [text, setText] = (0, import_react.useState)("");
	const [history, setHistory] = (0, import_react.useState)([]);
	const [nonce, setNonce] = (0, import_react.useState)(0);
	const { fb, show } = useFeedback();
	(0, import_react.useEffect)(() => {
		setNick(localStorage.getItem("orionAdminNick") || "");
		setUseNick(localStorage.getItem("orionAdminUseNick") === "1");
		setUseText(localStorage.getItem("orionAdminUseText") === "1");
		setNickColor(localStorage.getItem("orionAdminNickColor") || "#ff6b9d");
		setTextColor(localStorage.getItem("orionAdminTextColor") || "#ffd0e0");
		setReady(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		localStorage.setItem("orionAdminNick", nick);
		localStorage.setItem("orionAdminUseNick", useNick ? "1" : "0");
		localStorage.setItem("orionAdminUseText", useText ? "1" : "0");
		localStorage.setItem("orionAdminNickColor", nickColor);
		localStorage.setItem("orionAdminTextColor", textColor);
	}, [
		ready,
		nick,
		useNick,
		useText,
		nickColor,
		textColor
	]);
	(0, import_react.useEffect)(() => {
		if (!active) return;
		let cancel = false;
		async function load() {
			const raw = await apiFetch("/api/chat?since=0", "GET", void 0, adminToken);
			if (cancel) return;
			setHistory(readList(raw).rows.slice(-40));
		}
		load();
		const id = window.setInterval(() => void load(), 3e3);
		return () => {
			cancel = true;
			window.clearInterval(id);
		};
	}, [
		active,
		adminToken,
		nonce
	]);
	const previewName = nick.trim() || "[ORION-CONTROL]";
	const previewNick = useNick ? safeColor(nickColor) || "#ff6b9d" : DEFAULT_NPC_NICK;
	const previewText = useText ? safeColor(textColor) : void 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, { children: "Canal" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Identidade",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: fieldClass,
				value: nick,
				maxLength: 32,
				placeholder: DEFAULT_NPC_NAME,
				onChange: (event) => setNick(event.target.value)
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-4 flex flex-wrap gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex items-center gap-2 text-xs text-dim",
				children: [
					"Cor do nome",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "color",
						value: nickColor,
						onChange: (event) => {
							setNickColor(event.target.value);
							setUseNick(true);
						},
						className: "size-11 border border-line bg-bg"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						tone: "ghost",
						onClick: () => {
							setUseNick(false);
							setNickColor(DEFAULT_NPC_NICK);
						},
						children: "Padrão"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex items-center gap-2 text-xs text-dim",
				children: [
					"Cor do texto",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "color",
						value: textColor,
						onChange: (event) => {
							setTextColor(event.target.value);
							setUseText(true);
						},
						className: "size-11 border border-line bg-bg"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						tone: "ghost",
						onClick: () => {
							setUseText(false);
							setTextColor(DEFAULT_NPC_TEXT);
						},
						children: "Padrão"
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mb-4 text-xs text-dim",
			children: [
				"prévia: ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-medium",
					style: { color: previewNick },
					children: previewName
				}),
				" ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					style: previewText ? { color: previewText } : void 0,
					children: "— texto do canal"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Mensagem",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
				className: `${fieldClass} min-h-28 py-2`,
				value: text,
				onChange: (event) => setText(event.target.value),
				placeholder: "Mensagem que entra no canal"
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
				onClick: async () => {
					const message = text.trim();
					if (!message) return;
					const res = await apiFetch("/api/chat", "POST", {
						sender: "[NPC]",
						text: message,
						sender_alias: nick.trim() || null,
						sender_color: useNick ? nickColor : null,
						text_color: useText ? textColor : null
					}, adminToken);
					if (res?.ok) {
						setText("");
						setNonce((value) => value + 1);
						show("Mensagem transmitida.");
					} else show(res?.error || "Falhou.", true);
				},
				children: "Transmitir"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
				tone: "ghost",
				onClick: async () => {
					if (!window.confirm("Limpar todo o histórico do canal?")) return;
					if ((await apiFetch("/api/admin/chat", "DELETE", void 0, adminToken))?.ok) {
						resetChat();
						setHistory([]);
						show("Histórico limpo neste sistema. Quem já estava com o canal aberto pode precisar entrar de novo para esvaziar a tela.");
					} else show("Falhou.", true);
				},
				children: "Limpar histórico"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, {
			text: fb?.text ?? null,
			err: fb?.err
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6 border-t border-line pt-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-2 text-xs tracking-widest text-dim uppercase",
				children: "Histórico recente"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "max-h-80 space-y-2 overflow-y-auto",
				children: history.map((message) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "border-b border-line pb-2 text-xs leading-relaxed",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium text-fg",
							children: message.sender_alias || message.sender
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ml-2 text-dim",
							children: fmtTime(message.created_at)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-1 block text-bright",
							children: message.text
						})
					]
				}, message.id))
			})]
		})
	] });
}
function ClockSection({ active }) {
	const { adminToken, clock, setClock } = useOrion();
	const [value, setValue] = (0, import_react.useState)("");
	const [running, setRunning] = (0, import_react.useState)(true);
	const [preview, setPreview] = (0, import_react.useState)("--:--:--");
	const { fb, show } = useFeedback();
	(0, import_react.useEffect)(() => {
		if (!active || !clock?.fictionalTime || value) return;
		setValue(toDatetimeLocal(fictionalNow(clock)));
		setRunning(clock.running);
	}, [
		active,
		clock,
		value
	]);
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => {
			if (value) {
				const date = new Date(value);
				setPreview(Number.isNaN(date.getTime()) ? "--:--:--" : date.toLocaleTimeString("pt-BR"));
			} else setPreview(fictionalNow(clock).toLocaleTimeString("pt-BR"));
		}, 500);
		return () => window.clearInterval(id);
	}, [value, clock]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, { children: "Relógio do sistema" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-4 text-xs leading-relaxed text-dim",
			children: "Esta é a data e a hora que os operadores veem no topo. Se estiver correndo, avança em tempo real a partir do momento definido. Se estiver pausado, fica fixo."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Data e hora",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: fieldClass,
				type: "datetime-local",
				step: 1,
				value,
				onChange: (event) => setValue(event.target.value)
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
			className: "mb-4 flex min-h-11 items-center gap-3 text-xs text-fg",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type: "checkbox",
				checked: running,
				onChange: (event) => setRunning(event.target.checked)
			}), "Relógio correndo"]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
				onClick: async () => {
					if (!value) {
						show("Defina uma data e hora.", true);
						return;
					}
					const fictionalTime = new Date(value).toISOString();
					const res = await apiFetch("/api/admin/clock", "PUT", {
						fictionalTime,
						running
					}, adminToken);
					if (res?.ok) {
						setClock({
							fictionalTime,
							realTimeAtSet: (/* @__PURE__ */ new Date()).toISOString(),
							running
						});
						show(running ? "Relógio atualizado e correndo." : "Relógio atualizado e pausado.");
					} else show(res?.error || "Falhou.", true);
				},
				children: "Aplicar"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
				tone: "ghost",
				onClick: async () => {
					if (!window.confirm("Voltar ao horário real do sistema?")) return;
					const fictionalTime = (/* @__PURE__ */ new Date()).toISOString();
					if ((await apiFetch("/api/admin/clock", "PUT", {
						fictionalTime,
						running: true
					}, adminToken))?.ok) {
						setClock({
							fictionalTime,
							realTimeAtSet: (/* @__PURE__ */ new Date()).toISOString(),
							running: true
						});
						setValue(toDatetimeLocal(/* @__PURE__ */ new Date()));
						setRunning(true);
						show("Relógio alinhado com a hora real.");
					} else show("Falhou.", true);
				},
				children: "Usar hora real"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, {
			text: fb?.text ?? null,
			err: fb?.err
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6 border-t border-line pt-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs tracking-widest text-dim uppercase",
				children: "Prévia do campo"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-lg tracking-widest text-cyan tabular-nums",
				children: [
					preview,
					" ",
					running ? "▶" : "‖"
				]
			})]
		})
	] });
}
function useFolderTree(active) {
	const { adminToken, folderTick } = useOrion();
	const [folders, setFolders] = (0, import_react.useState)([]);
	const [error, setError] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!active) return;
		let cancel = false;
		setLoading(true);
		loadFolderTree(adminToken).then((res) => {
			if (cancel) return;
			setFolders(res.folders);
			setError(res.error ?? null);
			setLoading(false);
		});
		return () => {
			cancel = true;
		};
	}, [
		active,
		adminToken,
		folderTick
	]);
	return {
		folders,
		error,
		loading
	};
}
var empty = {
	folder_id: "",
	title: "",
	content: "",
	image_url: "",
	file_size: "",
	password: "",
	custom_date: "",
	corrupted: false,
	hidden: false
};
function DocsSection({ active }) {
	const { adminToken, bumpFolders } = useOrion();
	const { folders, error } = useFolderTree(active);
	const [docs, setDocs] = (0, import_react.useState)([]);
	const [selected, setSelected] = (0, import_react.useState)("");
	const [editingId, setEditingId] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(empty);
	const [filter, setFilter] = (0, import_react.useState)("");
	const { fb, show } = useFeedback();
	(0, import_react.useEffect)(() => {
		if (!active) return;
		let cancel = false;
		loadAllDocs(adminToken, folders).then((rows) => {
			if (!cancel) setDocs(rows);
		});
		return () => {
			cancel = true;
		};
	}, [
		active,
		adminToken,
		folders
	]);
	function patch(partial) {
		setForm((current) => ({
			...current,
			...partial
		}));
	}
	function reset() {
		setEditingId(null);
		setForm(empty);
	}
	const shown = docs.filter((doc) => {
		return `${doc.folderLabel || ""} ${doc.title}`.toLowerCase().includes(filter.trim().toLowerCase());
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
			hidden: form.hidden
		};
		const res = editingId ? await apiFetch(`/api/admin/documents/${editingId}`, "PUT", payload, adminToken) : await apiFetch("/api/admin/documents", "POST", payload, adminToken);
		if (res?.ok) {
			reset();
			bumpFolders();
			show(editingId ? "Documento atualizado." : "Documento criado.");
		} else show(res?.error || "Falhou.", true);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, { children: editingId ? "Editar arquivo" : "Novo arquivo" }),
		error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-3 text-xs text-danger",
			children: error
		}) : null,
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Pasta",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
				className: fieldClass,
				value: form.folder_id,
				onChange: (event) => patch({ folder_id: event.target.value }),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: "",
					children: "selecione"
				}), folders.map((folder) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: folder.id,
					children: folder.pathLabel
				}, folder.id))]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Título",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: fieldClass,
				value: form.title,
				maxLength: 100,
				onChange: (event) => patch({ title: event.target.value })
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Conteúdo",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
				className: `${fieldClass} min-h-36 py-2`,
				value: form.content,
				onChange: (event) => patch({ content: event.target.value })
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "URL de imagem (opcional)",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: fieldClass,
				value: form.image_url,
				onChange: (event) => patch({ image_url: event.target.value })
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Tamanho fictício (opcional)",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: fieldClass,
				value: form.file_size,
				maxLength: 20,
				onChange: (event) => patch({ file_size: event.target.value })
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Data de registro (opcional)",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: fieldClass,
				type: "date",
				value: form.custom_date,
				onChange: (event) => patch({ custom_date: event.target.value })
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Senha (opcional)",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: fieldClass,
				value: form.password,
				maxLength: 64,
				autoComplete: "off",
				onChange: (event) => patch({ password: event.target.value })
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-4 flex flex-wrap gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
				tone: form.corrupted ? "danger" : "ghost",
				onClick: () => patch({ corrupted: !form.corrupted }),
				children: form.corrupted ? "Corrompido" : "Íntegro"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
				tone: form.hidden ? "danger" : "ghost",
				onClick: () => patch({ hidden: !form.hidden }),
				children: form.hidden ? "Oculto" : "Visível"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
				onClick: () => void save(),
				children: editingId ? "Salvar edição" : "Criar documento"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
				tone: "ghost",
				onClick: reset,
				children: "Limpar campos"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, {
			text: fb?.text ?? null,
			err: fb?.err
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6 border-t border-line pt-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Buscar existente",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: fieldClass,
						value: filter,
						onChange: (event) => setFilter(event.target.value),
						placeholder: "título ou pasta"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Documento",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: fieldClass,
						value: selected,
						onChange: (event) => setSelected(event.target.value),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "",
							children: "selecione"
						}), shown.map((doc) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
							value: doc.id,
							children: [
								"[",
								doc.folderLabel,
								"] ",
								doc.title,
								doc.file_size ? ` (${doc.file_size})` : ""
							]
						}, doc.id))]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						tone: "ghost",
						onClick: async () => {
							if (!selected) {
								show("Selecione um documento.", true);
								return;
							}
							const doc = await apiFetch(`/api/documents/${selected}`, "GET", void 0, adminToken);
							if (!doc || doc.error || !doc.title) {
								show(doc?.error || "Erro ao carregar.", true);
								return;
							}
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
								hidden: !!Number(doc.hidden)
							});
							show("Documento carregado para edição.");
						},
						children: "Carregar para editar"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						tone: "danger",
						onClick: async () => {
							if (!selected) return;
							if (!window.confirm("Apagar este documento?")) return;
							if ((await apiFetch(`/api/admin/documents/${selected}`, "DELETE", void 0, adminToken))?.ok) {
								if (String(editingId) === selected) reset();
								setSelected("");
								bumpFolders();
								show("Documento apagado.");
							} else show("Falhou.", true);
						},
						children: "Apagar"
					})]
				})
			]
		})
	] });
}
var STEPS = [
	0,
	25,
	50,
	75,
	100
];
function DownloadSection({ active }) {
	const { adminToken, download, setDownload } = useOrion();
	const [title, setTitle] = (0, import_react.useState)("");
	const [source, setSource] = (0, import_react.useState)("");
	const [size, setSize] = (0, import_react.useState)("");
	const [percent, setPercent] = (0, import_react.useState)(0);
	const [note, setNote] = (0, import_react.useState)("");
	const [eventMessage, setEventMessage] = (0, import_react.useState)("");
	const { fb, show } = useFeedback();
	(0, import_react.useEffect)(() => {
		if (!active || !download) return;
		setTitle(download.title || "");
		setSource(download.source || "");
		setSize(download.size || "");
		setPercent(download.percent || 0);
	}, [active, download?.id]);
	const activeJob = download?.status === "active";
	async function send(body) {
		const res = await apiFetch("/api/admin/download", "PUT", body, adminToken);
		if (res?.ok) {
			setDownload(readDownload(res.download));
			show("Atualizado.");
		} else show(res?.error || "Falhou.", true);
		return res;
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, { children: "Transferência" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mb-4 text-xs leading-relaxed text-dim",
			children: ["A porcentagem não anda sozinha. Você define o valor e os operadores veem na hora.", activeJob ? " Há uma transferência em curso." : ""]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Arquivo",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: fieldClass,
				value: title,
				maxLength: 60,
				placeholder: "NOME.BIN",
				onChange: (event) => setTitle(event.target.value)
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Origem (opcional)",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: fieldClass,
				value: source,
				maxLength: 60,
				onChange: (event) => setSource(event.target.value)
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Tamanho (opcional)",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: fieldClass,
				value: size,
				maxLength: 20,
				placeholder: "2.4 MB",
				onChange: (event) => setSize(event.target.value)
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: `Progresso ${percent}%`,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type: "range",
				min: 0,
				max: 100,
				value: percent,
				onChange: (event) => setPercent(Number(event.target.value))
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mb-4 flex flex-wrap gap-2",
			children: STEPS.map((step) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Btn, {
				tone: "ghost",
				onClick: async () => {
					setPercent(step);
					if (activeJob) await send({
						action: "set",
						percent: step,
						title,
						source,
						size
					});
				},
				children: [step, "%"]
			}, step))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
				onClick: async () => {
					if (activeJob && !window.confirm("Substituir a transferência em curso?")) return;
					await send({
						action: "start",
						title: title || "ARQUIVO.BIN",
						source,
						size,
						percent
					});
				},
				children: "Iniciar"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
				tone: "cyan",
				disabled: !activeJob,
				onClick: () => void send({
					action: "set",
					percent,
					title,
					source,
					size
				}),
				children: "Aplicar %"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6 border-t border-line pt-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Nota ao encerrar (opcional)",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: fieldClass,
						value: note,
						maxLength: 120,
						onChange: (event) => setNote(event.target.value)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Mensagem no canal ao encerrar (opcional)",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						className: `${fieldClass} min-h-24 py-2`,
						value: eventMessage,
						onChange: (event) => setEventMessage(event.target.value)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							tone: "ok",
							disabled: !activeJob,
							onClick: () => void send({
								action: "finish",
								status: "ok",
								note,
								event_message: eventMessage || void 0
							}),
							children: "Concluir"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							tone: "danger",
							disabled: !activeJob,
							onClick: () => void send({
								action: "finish",
								status: "fail",
								percent,
								note,
								event_message: eventMessage || void 0
							}),
							children: "Interromper"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							tone: "ghost",
							onClick: async () => {
								if (!window.confirm("Retirar a transferência da tela de todo mundo?")) return;
								if ((await apiFetch("/api/admin/download", "DELETE", void 0, adminToken))?.ok) {
									setDownload(null);
									show("Retirada.");
								} else show("Falhou.", true);
							},
							children: "Retirar da tela"
						})
					]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, {
			text: fb?.text ?? null,
			err: fb?.err
		})
	] });
}
function EventsSection({ active }) {
	const { adminToken, bumpFolders, folderTick } = useOrion();
	const [items, setItems] = (0, import_react.useState)([]);
	const [events, setEvents] = (0, import_react.useState)([]);
	const [pending, setPending] = (0, import_react.useState)({});
	const [error, setError] = (0, import_react.useState)(null);
	const [formOpen, setFormOpen] = (0, import_react.useState)(false);
	const [editId, setEditId] = (0, import_react.useState)(null);
	const [label, setLabel] = (0, import_react.useState)("");
	const [nick, setNick] = (0, import_react.useState)("");
	const [message, setMessage] = (0, import_react.useState)("");
	const [nickColor, setNickColor] = (0, import_react.useState)(DEFAULT_NPC_NICK);
	const [textColor, setTextColor] = (0, import_react.useState)(DEFAULT_NPC_TEXT);
	const [useNick, setUseNick] = (0, import_react.useState)(false);
	const [useText, setUseText] = (0, import_react.useState)(false);
	const { fb, show } = useFeedback();
	const { fb: fileFb, show: showFile } = useFeedback();
	(0, import_react.useEffect)(() => {
		if (!active) return;
		let cancel = false;
		async function load() {
			const [repo, eventRaw] = await Promise.all([loadRepoIndex(adminToken), apiFetch("/api/admin/events", "GET", void 0, adminToken)]);
			if (cancel) return;
			const eventParsed = readList(eventRaw);
			setItems(repo.items);
			setEvents(eventParsed.rows);
			setError(repo.error || eventParsed.error || null);
		}
		load();
		return () => {
			cancel = true;
		};
	}, [
		active,
		adminToken,
		folderTick
	]);
	function hiddenOf(item) {
		const key = `${item.type}:${item.id}`;
		return Object.prototype.hasOwnProperty.call(pending, key) ? pending[key] : item.hidden ? 1 : 0;
	}
	function toggle(item) {
		const key = `${item.type}:${item.id}`;
		const next = hiddenOf(item) ? 0 : 1;
		const original = item.hidden ? 1 : 0;
		setPending((current) => {
			const copy = { ...current };
			if (next === original) delete copy[key];
			else copy[key] = next;
			return copy;
		});
	}
	const pendingCount = Object.keys(pending).length;
	function resetForm() {
		setFormOpen(false);
		setEditId(null);
		setLabel("");
		setNick("");
		setMessage("");
		setUseNick(false);
		setUseText(false);
		setNickColor(DEFAULT_NPC_NICK);
		setTextColor(DEFAULT_NPC_TEXT);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, { children: "Eventos" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-3 text-xs text-dim",
			children: "Revelar ou ocultar só entra para os operadores depois de aplicar."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-3 flex flex-wrap gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Btn, {
				disabled: !pendingCount,
				onClick: async () => {
					const entries = Object.entries(pending);
					let ok = 0;
					for (const [key, hiddenVal] of entries) {
						const [type, idText] = key.split(":");
						const id = Number(idText);
						const hidden = hiddenVal === 1;
						const res = type === "folder" ? await apiFetch(`/api/admin/folders/${id}`, "PUT", { hidden }, adminToken) : await setDocHidden(id, hidden, adminToken);
						if (res && "ok" in res && res.ok) ok += 1;
					}
					setPending({});
					bumpFolders();
					showFile(`${ok}/${entries.length} atualizado(s).`, ok !== entries.length);
				},
				children: ["Aplicar visibilidade", pendingCount ? ` (${pendingCount})` : ""]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
				tone: "ghost",
				disabled: !pendingCount,
				onClick: () => {
					setPending({});
					showFile("Alterações descartadas.");
				},
				children: "Descartar"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, {
			text: fileFb?.text ?? null,
			err: fileFb?.err
		}),
		error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-3 text-xs text-danger",
			children: error
		}) : null,
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-6 max-h-80 space-y-2 overflow-y-auto",
			children: [items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-dim",
				children: "nenhum arquivo cadastrado"
			}) : null, items.map((item) => {
				const hidden = hiddenOf(item);
				const isPending = Object.prototype.hasOwnProperty.call(pending, `${item.type}:${item.id}`);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-2 border border-line px-2 py-1",
					style: { marginLeft: item.depth * 12 },
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "min-w-0 truncate text-xs text-fg",
						children: [
							item.label,
							hidden ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-danger",
								children: " · oculto"
							}) : null,
							isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-violet",
								children: " *"
							}) : null
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						tone: isPending ? "violet" : hidden ? "danger" : "ok",
						onClick: () => toggle(item),
						children: hidden ? "Revelar" : "Ocultar"
					})]
				}, `${item.type}:${item.id}`);
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "border-t border-line pt-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-3 text-xs tracking-widest text-dim uppercase",
					children: "Mensagens prontas"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-3 space-y-2",
					children: [events.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-dim",
						children: "nenhuma mensagem cadastrada"
					}) : null, events.map((event) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border border-line p-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-dim",
								children: event.label
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-sm text-bright",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: { color: safeColor(event.sender_color) || "#ff6b9d" },
									children: event.sender_alias || "[ORION-CONTROL]"
								}), event.message ? ` — ${event.message}` : ""]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 flex flex-wrap gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
										disabled: !event.message,
										onClick: async () => {
											const res = await apiFetch("/api/chat", "POST", {
												sender: "[NPC]",
												text: event.message,
												sender_alias: event.sender_alias,
												sender_color: event.sender_color,
												text_color: event.text_color
											}, adminToken);
											show(res?.ok ? "Enviada." : res?.error || "Falhou.", !res?.ok);
										},
										children: "Disparar"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
										tone: "ghost",
										onClick: () => {
											setEditId(event.id);
											setLabel(event.label);
											setNick(event.sender_alias || "");
											setMessage(event.message || "");
											setNickColor(event.sender_color || "#ff6b9d");
											setTextColor(event.text_color || "#ffd0e0");
											setUseNick(!!event.sender_color);
											setUseText(!!event.text_color);
											setFormOpen(true);
										},
										children: "Editar"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
										tone: "danger",
										onClick: async () => {
											if (!window.confirm(`Apagar "${event.label}"?`)) return;
											await apiFetch(`/api/admin/events/${event.id}`, "DELETE", void 0, adminToken);
											bumpFolders();
										},
										children: "Apagar"
									})
								]
							})
						]
					}, event.id))]
				}),
				!formOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
					tone: "ghost",
					onClick: () => {
						resetForm();
						setFormOpen(true);
					},
					children: "Nova mensagem"
				}) : null,
				formOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 border border-line p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Rótulo",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: fieldClass,
								value: label,
								maxLength: 60,
								onChange: (event) => setLabel(event.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Nick (vazio = padrão)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: fieldClass,
								value: nick,
								maxLength: 32,
								onChange: (event) => setNick(event.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-4 flex flex-wrap gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex items-center gap-2 text-xs text-dim",
								children: ["Cor do nome", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "color",
									value: nickColor,
									className: "size-11 border border-line bg-bg",
									onChange: (event) => {
										setNickColor(event.target.value);
										setUseNick(true);
									}
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex items-center gap-2 text-xs text-dim",
								children: ["Cor do texto", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "color",
									value: textColor,
									className: "size-11 border border-line bg-bg",
									onChange: (event) => {
										setTextColor(event.target.value);
										setUseText(true);
									}
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Texto",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								className: `${fieldClass} min-h-24 py-2`,
								value: message,
								onChange: (event) => setMessage(event.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
								onClick: async () => {
									if (!label.trim()) {
										show("Rótulo obrigatório.", true);
										return;
									}
									const payload = {
										label: label.trim(),
										message: message.trim() || null,
										sender_alias: nick.trim() || null,
										sender_color: useNick ? nickColor : null,
										text_color: useText ? textColor : null
									};
									const res = editId ? await apiFetch(`/api/admin/events/${editId}`, "PUT", payload, adminToken) : await apiFetch("/api/admin/events", "POST", payload, adminToken);
									if (res?.ok) {
										resetForm();
										bumpFolders();
										show(editId ? "Atualizado." : "Mensagem salva.");
									} else show(res?.error || "Falhou.", true);
								},
								children: "Salvar"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
								tone: "ghost",
								onClick: resetForm,
								children: "Cancelar"
							})]
						})
					]
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, {
					text: fb?.text ?? null,
					err: fb?.err
				})
			]
		})
	] });
}
function FoldersSection({ active }) {
	const { adminToken, bumpFolders } = useOrion();
	const { folders, error, loading } = useFolderTree(active);
	const [name, setName] = (0, import_react.useState)("");
	const [parent, setParent] = (0, import_react.useState)("");
	const [hidden, setHidden] = (0, import_react.useState)(false);
	const [password, setPassword] = (0, import_react.useState)("");
	const [drafts, setDrafts] = (0, import_react.useState)({});
	const { fb, show } = useFeedback();
	function draftFor(id, folderName, folderPassword) {
		return drafts[id] || {
			name: folderName,
			password: folderPassword
		};
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, { children: "Pastas" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Nome",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: fieldClass,
				value: name,
				maxLength: 60,
				onChange: (event) => setName(event.target.value)
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Pasta pai",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
				className: fieldClass,
				value: parent,
				onChange: (event) => setParent(event.target.value),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: "",
					children: "raiz"
				}), folders.map((folder) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: folder.id,
					children: folder.pathLabel
				}, folder.id))]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
			className: "mb-4 flex min-h-11 items-center gap-3 text-xs text-fg",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type: "checkbox",
				checked: hidden,
				onChange: (event) => setHidden(event.target.checked)
			}), "Criar já oculta"]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Senha de acesso (opcional)",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: fieldClass,
				value: password,
				maxLength: 64,
				autoComplete: "off",
				onChange: (event) => setPassword(event.target.value)
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
			onClick: async () => {
				if (!name.trim()) {
					show("Nome obrigatório.", true);
					return;
				}
				const res = await apiFetch("/api/admin/folders", "POST", {
					name: name.trim(),
					parent_id: parent ? Number(parent) : null,
					hidden,
					password: password.trim() || null
				}, adminToken);
				if (res?.ok) {
					setName("");
					setPassword("");
					setHidden(false);
					bumpFolders();
					show("Pasta criada.");
				} else show(res?.error || "Falhou.", true);
			},
			children: "Criar pasta"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, {
			text: fb?.text ?? null,
			err: fb?.err
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6 border-t border-line pt-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-3 text-xs tracking-widest text-dim uppercase",
					children: "Existentes"
				}),
				loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-dim",
					children: "carregando..."
				}) : null,
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-danger",
					children: error
				}) : null,
				!loading && folders.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-dim",
					children: "nenhuma pasta"
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "space-y-3",
					children: folders.map((folder) => {
						const isHidden = !!Number(folder.hidden);
						const draft = draftFor(folder.id, folder.name, folder.password || "");
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "border border-line p-3",
							style: { marginLeft: folder.depth * 12 },
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mb-2 text-xs text-dim",
									children: [
										folder.pathLabel,
										isHidden ? " · oculta" : "",
										folder.password ? " · com senha" : ""
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: `${fieldClass} mb-2`,
									value: draft.name,
									onChange: (event) => setDrafts((current) => ({
										...current,
										[folder.id]: {
											...draft,
											name: event.target.value
										}
									}))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mb-2 flex flex-wrap gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
											tone: "ghost",
											onClick: async () => {
												const res = await apiFetch(`/api/admin/folders/${folder.id}`, "PUT", { name: draft.name.trim() }, adminToken);
												if (res?.ok) {
													bumpFolders();
													show("Nome salvo.");
												} else show(res?.error || "Falhou.", true);
											},
											children: "Renomear"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
											tone: isHidden ? "danger" : "ok",
											onClick: async () => {
												if ((await apiFetch(`/api/admin/folders/${folder.id}`, "PUT", { hidden: !isHidden }, adminToken))?.ok) {
													bumpFolders();
													show(isHidden ? "Pasta visível." : "Pasta oculta.");
												} else show("Falhou.", true);
											},
											children: isHidden ? "Oculta" : "Visível"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
											tone: "danger",
											onClick: async () => {
												if (!window.confirm("Apagar esta pasta e os documentos diretos?")) return;
												if ((await apiFetch(`/api/admin/folders/${folder.id}`, "DELETE", void 0, adminToken))?.ok) {
													bumpFolders();
													show("Pasta apagada.");
												} else show("Falhou.", true);
											},
											children: "Apagar"
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: `${fieldClass} min-w-0 flex-1`,
										value: draft.password,
										placeholder: "senha da pasta",
										autoComplete: "off",
										onChange: (event) => setDrafts((current) => ({
											...current,
											[folder.id]: {
												...draft,
												password: event.target.value
											}
										}))
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
										tone: "amber",
										onClick: async () => {
											if ((await apiFetch(`/api/admin/folders/${folder.id}`, "PUT", { password: draft.password.trim() || null }, adminToken))?.ok) {
												bumpFolders();
												show(draft.password.trim() ? "Senha definida." : "Senha removida.");
											} else show("Falhou.", true);
										},
										children: "Salvar senha"
									})]
								})
							]
						}, folder.id);
					})
				})
			]
		})
	] });
}
function OverviewSection({ active, onJump }) {
	const { adminToken, clock, download, folderTick } = useOrion();
	const [users, setUsers] = (0, import_react.useState)([]);
	const [events, setEvents] = (0, import_react.useState)([]);
	const [messages, setMessages] = (0, import_react.useState)([]);
	const [error, setError] = (0, import_react.useState)(null);
	const { fb, show } = useFeedback();
	(0, import_react.useEffect)(() => {
		if (!active) return;
		let cancel = false;
		async function load() {
			const [userRaw, eventRaw, chatRaw] = await Promise.all([
				apiFetch("/api/admin/users", "GET", void 0, adminToken),
				apiFetch("/api/admin/events", "GET", void 0, adminToken),
				apiFetch("/api/chat?since=0", "GET", void 0, adminToken)
			]);
			if (cancel) return;
			const userParsed = readList(userRaw);
			if (userParsed.error) setError(userParsed.error);
			else setError(null);
			setUsers(userParsed.rows);
			setEvents(readList(eventRaw).rows);
			setMessages(readList(chatRaw).rows.slice(-6));
		}
		load();
		const id = window.setInterval(() => void load(), 4e3);
		return () => {
			cancel = true;
			window.clearInterval(id);
		};
	}, [
		active,
		adminToken,
		folderTick
	]);
	const recent = users.filter((item) => seenRecently(item.last_seen)).length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, { children: "Visão do terminal" }),
		error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-4 text-xs text-danger",
			children: error
		}) : null,
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-3 sm:grid-cols-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "border border-line p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs tracking-widest text-dim uppercase",
							children: "Relógio"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-bright",
							children: clock?.fictionalTime ? clock.running ? "correndo" : "pausado" : "hora real"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							tone: "ghost",
							className: "mt-3",
							onClick: () => onJump("clock"),
							children: "Ajustar"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "border border-line p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs tracking-widest text-dim uppercase",
							children: "Transferência"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-bright",
							children: download ? `${download.title} · ${Math.round(download.percent)}%` : "nenhuma"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							tone: "ghost",
							className: "mt-3",
							onClick: () => onJump("download"),
							children: "Controlar"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "border border-line p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs tracking-widest text-dim uppercase",
							children: "Operadores"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 text-sm text-bright",
							children: [
								recent,
								" vistos agora · ",
								users.length,
								" no registro"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-3 space-y-1",
							children: users.slice(0, 4).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "truncate text-xs text-dim",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-fg",
										children: item.current_name
									}),
									" · ",
									ago(item.last_seen)
								]
							}, item.ip))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							tone: "ghost",
							className: "mt-3",
							onClick: () => onJump("users"),
							children: "Permissões"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "border border-line p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs tracking-widest text-dim uppercase",
							children: "Canal"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "mt-2 space-y-2",
							children: [messages.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
								className: "text-xs text-dim",
								children: "sem mensagens"
							}) : null, messages.map((message) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "text-xs leading-relaxed text-dim",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-fg",
										children: message.sender_alias || message.sender
									}),
									" ",
									fmtTime(message.created_at),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "line-clamp-2 block text-fg",
										children: message.text
									})
								]
							}, message.id))]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							tone: "ghost",
							className: "mt-3",
							onClick: () => onJump("chat"),
							children: "Escrever"
						})
					]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-2 text-xs tracking-widest text-dim uppercase",
					children: "Mensagens prontas"
				}),
				events.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-dim",
					children: "nenhuma cadastrada"
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "space-y-2",
					children: events.map((event) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-3 border border-line px-3 py-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-sm text-bright",
								children: event.label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-xs text-dim",
								children: event.message || "sem texto"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
							disabled: !event.message,
							onClick: async () => {
								const res = await apiFetch("/api/chat", "POST", {
									sender: "[NPC]",
									text: event.message,
									sender_alias: event.sender_alias,
									sender_color: event.sender_color,
									text_color: event.text_color
								}, adminToken);
								show(res?.ok ? "Enviada." : res?.error || "Falhou.", !res?.ok);
							},
							children: "Disparar"
						})]
					}, event.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, {
					text: fb?.text ?? null,
					err: fb?.err
				})
			]
		})
	] });
}
var ADMIN_NAV = [
	{
		id: "overview",
		label: "Visão",
		icon: LayoutDashboard
	},
	{
		id: "chat",
		label: "Canal",
		icon: MessageSquare
	},
	{
		id: "download",
		label: "Envio",
		icon: Download
	},
	{
		id: "events",
		label: "Eventos",
		icon: Zap
	},
	{
		id: "folders",
		label: "Pastas",
		icon: FolderTree
	},
	{
		id: "docs",
		label: "Arquivos",
		icon: FileText
	},
	{
		id: "users",
		label: "Pessoas",
		icon: Users
	},
	{
		id: "clock",
		label: "Relógio",
		icon: Clock
	}
];
var PERMS = [
	{
		key: "can_view_chat",
		on: "Ver canal",
		off: "Sem canal"
	},
	{
		key: "can_write_chat",
		on: "Falar",
		off: "Mudo"
	},
	{
		key: "can_view_repository",
		on: "Arquivos on",
		off: "Arquivos off"
	}
];
function originalPerm(user, key) {
	if (key === "can_view_repository") return Number(user.can_view_repository ?? 1) ? 1 : 0;
	return Number(user[key]) ? 1 : 0;
}
function UsersSection({ active }) {
	const { adminToken } = useOrion();
	const [users, setUsers] = (0, import_react.useState)([]);
	const [pending, setPending] = (0, import_react.useState)({});
	const [query, setQuery] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(null);
	const { fb, show } = useFeedback();
	(0, import_react.useEffect)(() => {
		if (!active) return;
		let cancel = false;
		async function load() {
			const raw = await apiFetch("/api/admin/users", "GET", void 0, adminToken);
			if (cancel) return;
			const parsed = readList(raw);
			setError(parsed.error ?? null);
			setUsers(parsed.rows);
		}
		load();
		return () => {
			cancel = true;
		};
	}, [active, adminToken]);
	function effective(user, key) {
		const patch = pending[user.ip];
		if (patch && Object.prototype.hasOwnProperty.call(patch, key)) return patch[key] ? 1 : 0;
		return originalPerm(user, key);
	}
	function toggle(user, key) {
		const next = effective(user, key) ? 0 : 1;
		const original = originalPerm(user, key);
		setPending((current) => {
			const copy = { ...current };
			const patch = { ...copy[user.ip] || {} };
			if (next === original) delete patch[key];
			else patch[key] = next;
			if (Object.keys(patch).length === 0) delete copy[user.ip];
			else copy[user.ip] = patch;
			return copy;
		});
	}
	function setColor(user, color) {
		const original = user.name_color || null;
		setPending((current) => {
			const copy = { ...current };
			const patch = { ...copy[user.ip] || {} };
			if (color === original) delete patch.name_color;
			else patch.name_color = color;
			if (Object.keys(patch).length === 0) delete copy[user.ip];
			else copy[user.ip] = patch;
			return copy;
		});
	}
	const count = Object.values(pending).reduce((sum, patch) => sum + Object.keys(patch).length, 0);
	const shown = users.filter((user) => {
		return `${user.current_name} ${user.ip}`.toLowerCase().includes(query.trim().toLowerCase());
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, { children: "Operadores" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-3 text-xs leading-relaxed text-dim",
			children: "O identificador real é o endereço de rede. Trocar o nome não cria outro operador nem apaga a cor e as permissões."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-3 flex flex-wrap gap-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
					tone: "ghost",
					onClick: async () => {
						const parsed = readList(await apiFetch("/api/admin/users", "GET", void 0, adminToken));
						setError(parsed.error ?? null);
						setUsers(parsed.rows);
					},
					children: "Atualizar"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Btn, {
					disabled: !count,
					onClick: async () => {
						const entries = Object.entries(pending);
						let ok = 0;
						for (const [ip, patch] of entries) if ((await apiFetch(`/api/admin/users/${encodeURIComponent(ip)}`, "PUT", patch, adminToken))?.ok) ok += 1;
						setPending({});
						const raw = await apiFetch("/api/admin/users", "GET", void 0, adminToken);
						setUsers(readList(raw).rows);
						show(ok === entries.length ? `${ok} operador(es) atualizado(s).` : `${ok}/${entries.length} atualizado(s).`, ok !== entries.length);
					},
					children: ["Aplicar alterações", count ? ` (${count})` : ""]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
					tone: "ghost",
					disabled: !count,
					onClick: () => {
						setPending({});
						show("Alterações descartadas.");
					},
					children: "Descartar"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, {
			text: fb?.text ?? null,
			err: fb?.err
		}),
		error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 text-xs text-danger",
			children: error
		}) : null,
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			className: `${fieldClass} mt-4`,
			value: query,
			placeholder: "filtrar nome ou IP",
			onChange: (event) => setQuery(event.target.value)
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 space-y-3",
			children: [shown.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-dim",
				children: "nenhum operador registrado"
			}) : null, shown.map((user) => {
				const patch = pending[user.ip];
				const color = patch && "name_color" in patch ? patch.name_color : user.name_color;
				const swatch = safeColor(color) || "#5ad4ff";
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: patch ? "border border-violet p-3" : "border border-line p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm font-medium",
							style: safeColor(color) ? { color: safeColor(color) } : void 0,
							children: user.current_name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-dim",
							children: user.ip
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-xs text-dim",
							children: [
								"visto ",
								ago(user.last_seen),
								" · ",
								user.message_count || 0,
								" msgs"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "color",
									value: swatch,
									className: "size-11 border border-line bg-bg",
									onChange: (event) => setColor(user, event.target.value),
									"aria-label": `Cor de ${user.current_name}`
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
									tone: "ghost",
									onClick: () => setColor(user, null),
									children: "Cor padrão"
								}),
								PERMS.map((perm) => {
									const on = !!effective(user, perm.key);
									const dirty = !!patch && perm.key in patch;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Btn, {
										tone: dirty ? "violet" : on ? "ok" : "danger",
										onClick: () => toggle(user, perm.key),
										children: [on ? perm.on : perm.off, dirty ? " *" : ""]
									}, perm.key);
								})
							]
						})
					]
				}, user.ip);
			})]
		})
	] });
}
function AdminPanel({ onClose }) {
	const [section, setSection] = (0, import_react.useState)("overview");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-40 flex flex-col bg-bg text-fg lg:inset-y-0 lg:left-auto lg:w-admin lg:border-l lg:border-line",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex h-14 shrink-0 items-center justify-between border-b border-rose-dim px-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs tracking-widest text-rose",
				children: "CONTROLE"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
				tone: "ghost",
				onClick: onClose,
				children: "Fechar"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex min-h-0 flex-1 flex-col md:flex-row",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "flex gap-1 overflow-x-auto border-b border-line p-2 md:w-36 md:flex-col md:overflow-y-auto md:border-r md:border-b-0",
				children: ADMIN_NAV.map((item) => {
					const Icon = item.icon;
					const on = section === item.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setSection(item.id),
						className: cx("term-btn inline-flex min-h-11 shrink-0 items-center gap-2 px-3 md:w-full", on ? "bg-rose/10 text-rose" : "text-dim hover:text-bright"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
							className: "size-4",
							"aria-hidden": "true"
						}), item.label]
					}, item.id);
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-h-0 flex-1 overflow-y-auto p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: section === "overview" ? "block" : "hidden",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OverviewSection, {
							active: section === "overview",
							onJump: setSection
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: section === "chat" ? "block" : "hidden",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatSection, { active: section === "chat" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: section === "download" ? "block" : "hidden",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DownloadSection, { active: section === "download" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: section === "events" ? "block" : "hidden",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EventsSection, { active: section === "events" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: section === "folders" ? "block" : "hidden",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FoldersSection, { active: section === "folders" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: section === "docs" ? "block" : "hidden",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DocsSection, { active: section === "docs" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: section === "users" ? "block" : "hidden",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsersSection, { active: section === "users" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: section === "clock" ? "block" : "hidden",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClockSection, { active: section === "clock" })
					})
				]
			})]
		})]
	});
}
function ChatPanel({ visible }) {
	const { messages, user, playerName, sendPlayer, disconnect } = useOrion();
	const [text, setText] = (0, import_react.useState)("");
	const [stuck, setStuck] = (0, import_react.useState)(true);
	const [pending, setPending] = (0, import_react.useState)(false);
	const boxRef = (0, import_react.useRef)(null);
	const canView = !user || !!Number(user.can_view_chat);
	const canWrite = !user || !!Number(user.can_write_chat);
	(0, import_react.useEffect)(() => {
		const box = boxRef.current;
		if (!box || !stuck) return;
		box.scrollTop = box.scrollHeight;
	}, [
		messages,
		stuck,
		canView
	]);
	function onScroll() {
		const box = boxRef.current;
		if (!box) return;
		setStuck(box.scrollHeight - box.scrollTop - box.clientHeight < 48);
	}
	async function onSubmit(event) {
		event.preventDefault();
		if (!text.trim() || !canWrite || pending) return;
		const outgoing = text;
		setText("");
		setPending(true);
		const result = await sendPlayer(outgoing);
		setPending(false);
		if (!result.ok && result.code !== "CHAT_WRITE_BLOCKED") setText(outgoing);
		setStuck(true);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: cx("min-h-0 flex-col border-line bg-panel md:h-60 md:flex-none md:border-t", visible ? "flex flex-1" : "hidden md:flex"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-3 border-b border-line px-3 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs tracking-widest text-dim uppercase",
					children: "Canal de comunicação"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex items-center gap-2 text-xs text-dim",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "max-w-40 truncate text-cyan",
						children: ["operador: ", playerName]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: disconnect,
						className: "min-h-11 underline",
						children: "trocar"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				ref: boxRef,
				onScroll,
				className: "relative min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2",
				children: [canView ? messages.map((message) => {
					const sender = message.sender || "?";
					const npc = sender.startsWith("[");
					const name = message.sender_alias || sender;
					const nameColor = safeColor(message.sender_color) || (!npc ? safeColor(message.name_color) : void 0);
					const textColor = safeColor(message.text_color);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm leading-relaxed",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: cx("font-medium", !nameColor && (npc ? "text-rose" : "text-cyan")),
								style: nameColor ? { color: nameColor } : void 0,
								children: name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ml-2 text-xs text-dim",
								children: fmtTime(message.created_at)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: cx("text-bright", npc && !textColor && "text-rose-soft"),
								style: textColor ? { color: textColor } : void 0,
								children: [
									" ",
									"— ",
									message.text
								]
							})
						]
					}, message.id);
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-dim",
					children: "// acesso ao canal bloqueado pelo controle"
				}), canView && messages.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-dim",
					children: "// canal em silêncio"
				}) : null]
			}),
			!stuck && canView ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => {
					setStuck(true);
					if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
				},
				className: "mx-3 mb-2 min-h-11 border border-line text-xs text-cyan",
				children: "novas mensagens"
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit,
				className: "flex border-t border-line",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-center px-3 text-rose",
						"aria-hidden": "true",
						children: ">"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: text,
						onChange: (event) => setText(event.target.value),
						disabled: !canWrite,
						maxLength: 300,
						autoComplete: "off",
						spellCheck: false,
						placeholder: canWrite ? "enviar mensagem..." : "envio bloqueado pelo controle",
						className: "min-h-11 min-w-0 flex-1 bg-transparent text-sm text-bright outline-none placeholder:text-dim disabled:opacity-60"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						disabled: !canWrite || !text.trim(),
						className: "term-btn min-h-11 border-l border-line px-4 text-dim hover:text-rose disabled:opacity-40",
						children: "Enviar"
					})
				]
			})
		]
	});
}
function CredentialForm({ title, error, onSubmit, onBack }) {
	const [value, setValue] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const inputRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		inputRef.current?.focus();
	}, [error]);
	async function submit(event) {
		event.preventDefault();
		const password = value.trim();
		if (!password || busy) return;
		setBusy(true);
		await onSubmit(password);
		setBusy(false);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: submit,
		className: "mx-auto flex w-full max-w-sm flex-col items-center gap-4 px-4 pt-12 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, {
				className: "size-8 text-amber",
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs tracking-widest text-amber uppercase",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-dim",
				children: "Credencial necessária"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				ref: inputRef,
				value,
				onChange: (event) => setValue(event.target.value),
				autoComplete: "off",
				spellCheck: false,
				placeholder: "CREDENCIAL",
				className: "min-h-11 w-full border border-amber bg-bg px-3 text-center text-sm tracking-widest text-bright outline-none"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "submit",
				disabled: busy || !value.trim(),
				className: "term-btn min-h-11 w-full border border-amber text-amber hover:bg-amber/10 disabled:opacity-40",
				children: busy ? "..." : "Acessar"
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs tracking-wide text-danger",
				children: error
			}) : null,
			onBack ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onBack,
				className: "min-h-11 text-xs tracking-widest text-dim uppercase",
				children: "Voltar"
			}) : null
		]
	});
}
function Explorer({ activeId, visible, onOpenDoc, onNavigate }) {
	const { playerName, user, folderTick } = useOrion();
	const [stack, setStack] = (0, import_react.useState)([]);
	const [folders, setFolders] = (0, import_react.useState)([]);
	const [docs, setDocs] = (0, import_react.useState)([]);
	const [note, setNote] = (0, import_react.useState)("carregando...");
	const [prompt, setPrompt] = (0, import_react.useState)(null);
	const [filter, setFilter] = (0, import_react.useState)("");
	const passwords = (0, import_react.useRef)({});
	const repoBlocked = !!user && !Number(user.can_view_repository);
	(0, import_react.useEffect)(() => {
		let cancel = false;
		async function load() {
			if (!playerName) return;
			if (repoBlocked) {
				if (!cancel) {
					setFolders([]);
					setDocs([]);
					setPrompt(null);
					setNote("repositório bloqueado pelo controle");
				}
				return;
			}
			const parent = stack[stack.length - 1];
			const sender = `sender=${encodeURIComponent(playerName)}`;
			const pw = parent ? passwords.current[parent.id] || "" : "";
			const fp = pw ? `&folder_password=${encodeURIComponent(pw)}` : "";
			const folderPath = parent ? `/api/folders?parent_id=${parent.id}&${sender}${fp}` : `/api/folders?${sender}`;
			const [folderRaw, docRaw] = await Promise.all([apiFetch(folderPath), parent ? apiFetch(`/api/documents?folder_id=${parent.id}&${sender}${fp}`) : Promise.resolve([])]);
			if (cancel) return;
			const folderParsed = readList(folderRaw);
			const docParsed = readList(docRaw);
			const blocked = folderParsed.code === "FOLDER_PASSWORD_REQUIRED" ? folderParsed : docParsed.code === "FOLDER_PASSWORD_REQUIRED" ? docParsed : null;
			if (blocked && parent) {
				const had = passwords.current[parent.id];
				if (had) delete passwords.current[parent.id];
				setFolders([]);
				setDocs([]);
				setNote(null);
				setPrompt({
					id: Number(blocked.extra.folder_id ?? parent.id),
					name: String(blocked.extra.folder_name || parent.name),
					error: had ? "credencial inválida" : void 0
				});
				return;
			}
			if (folderParsed.code === "REPOSITORY_BLOCKED" || docParsed.code === "REPOSITORY_BLOCKED") {
				setPrompt(null);
				setNote("repositório bloqueado pelo controle");
				return;
			}
			if (folderRaw === null) {
				setPrompt(null);
				setNote("sem ligação com o sistema");
				return;
			}
			setPrompt(null);
			setFolders(folderParsed.rows);
			setDocs(docParsed.rows);
			setNote(!folderParsed.rows.length && !docParsed.rows.length ? stack.length ? "pasta vazia" : "nenhum arquivo disponível" : null);
		}
		load();
		return () => {
			cancel = true;
		};
	}, [
		playerName,
		folderTick,
		repoBlocked,
		stack
	]);
	function goRoot() {
		onNavigate();
		setFilter("");
		setStack([]);
	}
	function goTo(index) {
		onNavigate();
		setFilter("");
		setStack((current) => current.slice(0, index + 1));
	}
	function goBack() {
		onNavigate();
		setFilter("");
		setStack((current) => current.slice(0, -1));
	}
	const query = filter.trim().toLowerCase();
	const shownFolders = query ? folders.filter((folder) => folder.name.toLowerCase().includes(query)) : folders;
	const shownDocs = query ? docs.filter((doc) => doc.title.toLowerCase().includes(query)) : docs;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: cx("min-h-0 w-full shrink-0 flex-col border-line bg-panel md:w-72 md:border-r", visible ? "flex" : "hidden md:flex"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "border-b border-line px-3 py-3 text-xs tracking-widest text-dim uppercase",
				children: "Sistema de arquivos"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-11 flex-wrap items-center gap-1 border-b border-line px-2 py-1 text-xs",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: goRoot,
					className: "min-h-11 px-1 text-cyan-dim hover:text-cyan",
					children: "~/"
				}), stack.map((crumb, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex items-center gap-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-dim",
						children: "/"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => goTo(index),
						className: "min-h-11 px-1 text-cyan-dim hover:text-cyan",
						children: crumb.name
					})]
				}, crumb.id))]
			}),
			!prompt && (folders.length > 0 || docs.length > 0) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "border-b border-line px-3 py-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: filter,
					onChange: (event) => setFilter(event.target.value),
					placeholder: "filtrar nesta pasta",
					className: "min-h-11 w-full border border-line bg-bg px-3 text-sm text-bright outline-none focus:border-cyan"
				})
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "min-h-0 flex-1 overflow-y-auto",
				children: prompt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CredentialForm, {
					title: prompt.name,
					error: prompt.error,
					onBack: stack.length ? goBack : void 0,
					onSubmit: async (password) => {
						passwords.current[prompt.id] = password;
						setStack((current) => [...current]);
					}
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					stack.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: goBack,
						className: "flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm text-dim hover:bg-hover hover:text-bright",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, {
							className: "size-4",
							"aria-hidden": "true"
						}), ".."]
					}) : null,
					shownFolders.map((folder) => {
						const locked = !!Number(folder.password_protected);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => {
								onNavigate();
								setFilter("");
								setPrompt(null);
								setStack((current) => [...current, {
									id: folder.id,
									name: folder.name
								}]);
							},
							className: "file-in flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm text-fg hover:bg-hover",
							children: [locked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-4 shrink-0 text-amber" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Folder, { className: "size-4 shrink-0 text-violet" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "min-w-0 flex-1 truncate",
								children: folder.name
							})]
						}, folder.id);
					}),
					shownDocs.map((doc) => {
						const locked = !!Number(doc.password_protected);
						const corrupted = !!Number(doc.corrupted);
						const active = activeId === doc.id;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => onOpenDoc(doc),
							className: cx("file-in flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm hover:bg-hover", active ? "bg-cyan/10 text-cyan" : "text-fg", corrupted && "text-danger"),
							children: [
								locked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-4 shrink-0 text-amber" }) : corrupted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "size-4 shrink-0 text-danger" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "size-4 shrink-0 text-cyan-dim" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "min-w-0 flex-1 truncate",
									children: doc.title
								}),
								doc.file_size ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "shrink-0 text-xs text-dim",
									children: doc.file_size
								}) : null
							]
						}, doc.id);
					}),
					note ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "px-3 py-4 text-xs text-dim",
						children: ["// ", note]
					}) : null,
					!note && query && !shownFolders.length && !shownDocs.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-3 py-4 text-xs text-dim",
						children: "// nada com esse filtro"
					}) : null
				] })
			})
		]
	});
}
function HeaderBar({ adminOpen, onToggleAdmin }) {
	const { adminToken, clock, link } = useOrion();
	const [now, setNow] = (0, import_react.useState)(() => /* @__PURE__ */ new Date());
	(0, import_react.useEffect)(() => {
		setNow(fictionalNow(clock));
		const id = window.setInterval(() => setNow(fictionalNow(clock)), 1e3);
		return () => window.clearInterval(id);
	}, [clock]);
	const online = link === "on";
	const label = link === "on" ? "Online" : link === "off" ? "Sem sinal" : "Ligando";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "header-sheen flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-panel px-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "min-w-0 truncate text-xs tracking-widest text-cyan",
			children: "ORIONSOFTWARE"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2 sm:gap-3",
			children: [
				adminToken ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onToggleAdmin,
					className: cx("term-btn min-h-11 border px-3", adminOpen ? "border-rose text-rose" : "border-rose-dim text-rose hover:bg-rose/10"),
					children: adminOpen ? "Ocultar" : "Controle"
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-right",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm text-bright tabular-nums",
						children: now.toLocaleTimeString("pt-BR")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hidden text-xs text-dim sm:block",
						children: [now.toLocaleDateString("pt-BR", {
							day: "2-digit",
							month: "2-digit",
							year: "numeric"
						}), clock?.fictionalTime && !clock.running ? " · pausado" : ""]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 text-xs text-dim",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cx("size-2 rounded-full", online ? "bg-ok blink" : "bg-danger") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "hidden sm:inline",
						children: label
					})]
				})
			]
		})]
	});
}
function LoginGate() {
	const { connect, savedName } = useOrion();
	const [name, setName] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (savedName) setName(savedName);
	}, [savedName]);
	async function onSubmit(event) {
		event.preventDefault();
		if (busy) return;
		setBusy(true);
		setError(null);
		const message = await connect(name);
		setBusy(false);
		if (message) setError(message);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-40 flex items-center justify-center bg-bg px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit,
			className: "login-frame w-full max-w-md border bg-panel px-6 py-8 sm:px-10",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs tracking-widest text-dim uppercase",
					children: "OrionSoftware Systems"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-4 text-xl tracking-widest text-cyan",
					children: "Terminal"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 border-b border-line pb-5 text-xs leading-relaxed text-dim",
					children: "Acesso ao sistema requer identificação do operador"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "mt-6 block text-xs tracking-widest text-dim uppercase",
					htmlFor: "operator-name",
					children: "Identificador"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					id: "operator-name",
					value: name,
					onChange: (event) => setName(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 20)),
					maxLength: 20,
					autoComplete: "off",
					spellCheck: false,
					autoCapitalize: "characters",
					placeholder: "NOME_OPERADOR",
					className: "mt-2 min-h-11 w-full border border-line-lit bg-bg px-3 text-sm tracking-widest text-cyan outline-none focus:border-cyan"
				}),
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-xs text-danger",
					role: "alert",
					children: error
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: busy || !name,
					className: "term-btn mt-5 min-h-11 w-full border border-cyan-dim text-cyan hover:bg-cyan/10 disabled:opacity-40",
					children: busy ? "Conectando" : "Conectar"
				})
			]
		})
	});
}
var STATUS = {
	active: "Em curso",
	ok: "Concluída",
	fail: "Interrompida"
};
function TransferBar({ job, onDismiss }) {
	const [open, setOpen] = (0, import_react.useState)(true);
	const percent = Math.max(0, Math.min(100, Math.round(job.percent)));
	const filled = Math.round(percent / 5);
	(0, import_react.useEffect)(() => {
		setOpen(true);
	}, [job.id, job.status]);
	const tone = job.status === "fail" ? "text-danger" : job.status === "ok" ? "text-ok" : "text-cyan";
	const fill = job.status === "fail" ? "bg-danger" : job.status === "ok" ? "bg-ok" : "bg-cyan";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "shrink-0 border-b border-line bg-panel",
		"aria-live": "polite",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2 px-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => setOpen((value) => !value),
				className: "flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
						className: cx("size-4 shrink-0", tone),
						"aria-hidden": "true"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "min-w-0 flex-1 truncate text-xs tracking-widest text-dim uppercase",
						children: ["Transferência · ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: tone,
							children: STATUS[job.status]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: cx("text-sm tabular-nums", tone),
						children: [percent, "%"]
					})
				]
			}), job.status !== "active" && onDismiss ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onDismiss,
				className: "inline-flex size-11 items-center justify-center text-dim hover:text-bright",
				"aria-label": "Dispensar transferência",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
			}) : null]
		}), open ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "px-3 pb-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-baseline justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-bright",
						children: job.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-dim",
						children: [job.size, job.source].filter(Boolean).join(" · ")
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 flex gap-1",
					"aria-hidden": "true",
					children: Array.from({ length: 20 }, (_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cx("h-2 flex-1", index < filled ? fill : "bg-line") }, index))
				}),
				job.note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-xs text-fg",
					children: job.note
				}) : null
			]
		}) : null]
	});
}
function CorruptedBody() {
	const [text, setText] = (0, import_react.useState)(glitchBlock);
	(0, import_react.useEffect)(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const id = window.setInterval(() => setText(glitchBlock()), 160);
		return () => window.clearInterval(id);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
		className: "glitch-text mt-4 overflow-hidden text-xs leading-relaxed whitespace-pre-wrap text-danger",
		children: text
	});
}
function DocImage({ src }) {
	const [failed, setFailed] = (0, import_react.useState)(false);
	if (failed) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mt-4 text-xs text-dim",
		children: "imagem indisponível"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src,
		alt: "",
		className: "mt-5 max-w-full border border-line",
		onError: () => setFailed(true)
	});
}
function Viewer({ view, visible, onPassword }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: visible ? "relative min-h-0 flex-1 overflow-y-auto" : "relative hidden min-h-0 flex-1 overflow-y-auto md:block",
		children: [
			!view ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-center px-6 pt-16 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Terminal, {
						className: "size-8 text-line-lit",
						"aria-hidden": "true"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-sm text-fg",
						children: "Selecione um arquivo"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs tracking-widest text-dim uppercase",
						children: "navegue pelos arquivos"
					})
				]
			}) : null,
			view?.kind === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-6 py-8 text-xs text-dim",
				children: "carregando..."
			}) : null,
			view?.kind === "blocked" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-6 py-8 text-sm text-danger",
				children: "acesso ao repositório bloqueado"
			}) : null,
			view?.kind === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-6 py-8 text-sm text-danger",
				children: view.message
			}) : null,
			view?.kind === "password" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CredentialForm, {
				title: "Arquivo protegido",
				error: view.error,
				onSubmit: (password) => onPassword(view.id, password)
			}) : null,
			view?.kind === "corrupted" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "px-5 py-6 sm:px-7",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: "border-b border-line pb-3 text-sm tracking-wide text-danger",
						children: ["// ", view.title]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 text-xs tracking-wide text-dim",
						children: [
							view.fileSize ? `TAMANHO: ${view.fileSize} · ` : "",
							"STATUS: ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-danger",
								children: "CORROMPIDO"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex items-center gap-2 border border-danger px-3 py-2 text-xs tracking-widest text-danger",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
							className: "size-4 shrink-0",
							"aria-hidden": "true"
						}), "Leitura impossível — integridade comprometida"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CorruptedBody, {})
				]
			}) : null,
			view?.kind === "doc" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "doc-in relative px-5 py-6 sm:px-7",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "viewer-scan" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: "border-b border-line pb-3 text-sm tracking-wide text-cyan",
						children: [
							"// ",
							view.doc.title,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ml-2 inline-block size-2.5 animate-pulse bg-cyan-dim align-middle" })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 text-xs tracking-wide text-dim",
						children: [
							"REGISTRADO EM: ",
							formatDocDate(view.doc),
							view.doc.file_size ? ` · TAMANHO: ${view.doc.file_size}` : ""
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-5 text-sm leading-relaxed whitespace-pre-wrap break-words text-bright",
						children: view.doc.content || ""
					}),
					safeImage(view.doc.image_url) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DocImage, { src: safeImage(view.doc.image_url) || "" }) : null
				]
			}, view.doc.id) : null
		]
	});
}
function Shell() {
	const { playerName, adminToken, user, download } = useOrion();
	const [adminOpen, setAdminOpen] = (0, import_react.useState)(false);
	const [tab, setTab] = (0, import_react.useState)("files");
	const [activeId, setActiveId] = (0, import_react.useState)(null);
	const [view, setView] = (0, import_react.useState)(null);
	const [dismissed, setDismissed] = (0, import_react.useState)(null);
	const openedAdmin = (0, import_react.useRef)(false);
	const wasBlocked = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		if (playerName && adminToken && !openedAdmin.current) {
			openedAdmin.current = true;
			setAdminOpen(true);
		}
	}, [playerName, adminToken]);
	(0, import_react.useEffect)(() => {
		setDismissed(null);
		setView(null);
		setActiveId(null);
		setTab("files");
	}, [playerName]);
	(0, import_react.useEffect)(() => {
		const blocked = !!user && !Number(user.can_view_repository);
		if (blocked && !wasBlocked.current) setView({ kind: "blocked" });
		if (!blocked && wasBlocked.current && view?.kind === "blocked") setView(null);
		wasBlocked.current = blocked;
	}, [user, view?.kind]);
	async function fetchDoc(id, password) {
		setView({ kind: "loading" });
		const pw = password ? `&password=${encodeURIComponent(password)}` : "";
		const raw = await apiFetch(`/api/documents/${id}?sender=${encodeURIComponent(playerName)}${pw}`);
		if (!raw) {
			setView({
				kind: "error",
				message: "sem ligação com o sistema"
			});
			return;
		}
		if (raw.code === "PASSWORD_REQUIRED") {
			setView({
				kind: "password",
				id,
				error: password ? "credencial inválida" : void 0
			});
			return;
		}
		if (raw.code === "FILE_CORRUPTED") {
			setView({
				kind: "corrupted",
				title: raw.title || "ARQUIVO",
				fileSize: raw.file_size
			});
			return;
		}
		if (raw.code === "REPOSITORY_BLOCKED") {
			setView({ kind: "blocked" });
			return;
		}
		if (raw.error || !raw.title) {
			setView({
				kind: "error",
				message: raw.error || "erro ao carregar documento"
			});
			return;
		}
		setView({
			kind: "doc",
			doc: raw
		});
	}
	function openDoc(doc) {
		setActiveId(doc.id);
		setTab("read");
		if (Number(doc.corrupted)) {
			setView({
				kind: "corrupted",
				title: doc.title,
				fileSize: doc.file_size
			});
			return;
		}
		if (Number(doc.password_protected)) {
			setView({
				kind: "password",
				id: doc.id
			});
			return;
		}
		fetchDoc(doc.id, null);
	}
	const showTransfer = download && download.id !== dismissed;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh flex-col overflow-hidden bg-bg text-fg",
		children: [
			!playerName ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoginGate, {}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeaderBar, {
				adminOpen,
				onToggleAdmin: () => setAdminOpen((open) => !open)
			}),
			showTransfer && download ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TransferBar, {
				job: download,
				onDismiss: download.status === "active" ? void 0 : () => setDismissed(download.id)
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Explorer, {
					activeId,
					visible: tab === "files",
					onOpenDoc: openDoc,
					onNavigate: () => {
						setActiveId(null);
						setView(null);
					}
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: cx("min-w-0 flex-1 flex-col", tab === "files" ? "hidden md:flex" : "flex"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Viewer, {
						view,
						visible: tab === "read",
						onPassword: async (id, password) => {
							await fetchDoc(id, password);
						}
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatPanel, { visible: tab === "chat" })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "grid shrink-0 grid-cols-3 border-t border-line bg-panel md:hidden",
				children: [
					{
						id: "files",
						label: "Arquivos"
					},
					{
						id: "read",
						label: "Leitura"
					},
					{
						id: "chat",
						label: "Canal"
					}
				].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setTab(item.id),
					className: cx("term-btn min-h-11", tab === item.id ? "bg-cyan/10 text-cyan" : "text-dim"),
					children: item.label
				}, item.id))
			}),
			adminOpen && adminToken ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminPanel, { onClose: () => setAdminOpen(false) }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "scanlines pointer-events-none fixed inset-0 z-50",
				"aria-hidden": "true"
			})
		]
	});
}
function TerminalApp() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrionProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shell, {}) });
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TerminalApp, {});
}
//#endregion
export { Home as component };
