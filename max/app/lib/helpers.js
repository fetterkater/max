import { DEF_SUPPS } from “./constants”;

// ─── localStorage ─────────────────────────────────────────────────────────────
export const ls = {
get: (k, fb) => { try { const v = localStorage.getItem(k); return v != null ? v : fb; } catch { return fb; } },
set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
j:   (k, fb) => { try { return JSON.parse(ls.get(k, null) ?? JSON.stringify(fb)); } catch { return fb; } },
};

// ─── Haptic ───────────────────────────────────────────────────────────────────
export const haptic = {
l: () => { try { navigator.vibrate?.(10);             } catch {} },
m: () => { try { navigator.vibrate?.(25);             } catch {} },
e: () => { try { navigator.vibrate?.([60, 30, 60]);   } catch {} },
s: () => { try { navigator.vibrate?.([20, 10, 40]);   } catch {} },
t: () => { try { navigator.vibrate?.(6);              } catch {} },
};

// ─── Formatting ───────────────────────────────────────────────────────────────
export const fmt = (iso) =>
new Date(iso).toLocaleDateString(“de-DE”, { day: “2-digit”, month: “2-digit” });

export const parseRisk = (t) =>
t.match(/##\s*Risiko:\s*(niedrig|mittel|hoch)/i)?.[1]?.toLowerCase() ?? null;

export const md = (t, c = “#b44dff”) =>
t
.replace(/^## (.+)$/gm, `<h3 style="font-size:13px;font-weight:800;margin:12px 0 6px;color:${c};letter-spacing:0.06em;text-transform:uppercase">$1</h3>`)
.replace(/**(.+?)**/g, `<strong style="color:#f0eaff">$1</strong>`)
.replace(/^- (.+)$/gm, `<div style="padding:4px 0 4px 10px;border-left:2px solid ${c}44;margin:3px 0;color:#c0b8d4">$1</div>`)
.replace(/\n/g, “<br>”);

// ─── Sober days ───────────────────────────────────────────────────────────────
export function soberDays(checkins, relapses) {
const last  = relapses.length ? new Date(relapses[relapses.length - 1].date) : null;
const first = checkins.length ? new Date(checkins[0].date) : new Date();
const start = last && last > first ? last : first;
return Math.max(0, Math.floor((new Date() - start) / 864e5));
}

// ─── Streaks ──────────────────────────────────────────────────────────────────
export function calcStreaks(checkins, totalSupps) {
if (!checkins.length) return { ci: 0, su: 0 };
const today = new Date(); today.setHours(0, 0, 0, 0);
const byDay = {};
checkins.forEach((c) => {
const d = new Date(c.date); d.setHours(0, 0, 0, 0);
const k = d.toDateString();
if (!byDay[k]) byDay[k] = { ci: false, su: 0 };
byDay[k].ci = true;
byDay[k].su = Math.max(byDay[k].su, c.suppsDone || 0);
});
let ci = 0, su = 0, d = new Date(today);
for (let i = 0; i < 365; i++) {
const k = d.toDateString();
if (byDay[k]?.ci) ci++; else if (i > 0) break;
d.setDate(d.getDate() - 1);
}
d = new Date(today);
for (let i = 0; i < 365; i++) {
const k = d.toDateString();
if (byDay[k]?.su >= totalSupps) su++; else if (i > 0) break;
d.setDate(d.getDate() - 1);
}
return { ci, su };
}

// ─── Day key ─────────────────────────────────────────────────────────────────
export const DAY = () => new Date().toDateString();

// ─── iOS-safe download ────────────────────────────────────────────────────────
export async function iosSafeDownload(content, type, filename) {
const blob = new Blob([content], { type });
if (navigator.share && navigator.canShare) {
try {
const file = new File([blob], filename, { type });
if (navigator.canShare({ files: [file] })) {
await navigator.share({ files: [file], title: filename });
return;
}
} catch {}
}
const url = URL.createObjectURL(blob);
const a = Object.assign(document.createElement(“a”), { href: url, download: filename });
document.body.appendChild(a); a.click(); document.body.removeChild(a);
setTimeout(() => URL.revokeObjectURL(url), 1000);
}