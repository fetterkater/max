"use client";
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const S = {
  bg: "#f0ede8", card: "#ffffff", text: "#1a1a1a", muted: "#9a9590",
  border: "#e8e4de", morning: "#e8651a", evening: "#3a4fd4",
};

const RISK_META: Record<string, { bg: string; text: string; dot: string }> = {
  niedrig: { bg: "#e8f5e9", text: "#2e7d32", dot: "#4caf50" },
  mittel:  { bg: "#fff8e1", text: "#e65100", dot: "#ff9800" },
  hoch:    { bg: "#fce4ec", text: "#b71c1c", dot: "#f44336" },
};

const SUPPLEMENTS = {
  morning: [
    { id:"m1",  name:"NAC",           dose:"600 mg",       effect:"Glutamat stabilisieren, Craving ↓" },
    { id:"m2",  name:"Vitamin C",      dose:"500 mg",       effect:"Antioxidativ, NAC unterstützen" },
    { id:"m3",  name:"Omega-3",        dose:"1000–1500 mg", effect:"Entzündungshemmend, Stimmung" },
    { id:"m4",  name:"Kreatin",        dose:"5 g",          effect:"Energie, Nervensystem" },
    { id:"m5",  name:"Vitamin B12",    dose:"1 Kapsel",     effect:"Energie, Nervensystem" },
    { id:"m6",  name:"Vitamin D3+K2",  dose:"1 Kapsel",     effect:"Stimmung, Immunsystem" },
    { id:"m7",  name:"Zink",           dose:"25 mg",        effect:"Immunsystem, Neurotransmitter" },
    { id:"m8",  name:"L-Theanin",      dose:"200 mg",       effect:"Angsthemmend, beruhigend" },
    { id:"m9",  name:"Rhodiola",       dose:"200 mg",       effect:"Stressresistenz, Energie" },
    { id:"m10", name:"L-Tyrosin",      dose:"500 mg",       effect:"Dopamin, Fokus" },
  ],
  evening: [
    { id:"e1", name:"NAC",               dose:"600 mg",     effect:"Glutamat/Dopamin stabilisieren" },
    { id:"e2", name:"Glycin",            dose:"3 g",        effect:"Schlafqualität ↑" },
    { id:"e3", name:"Omega-3 Rest",      dose:"Rest",       effect:"Stimmung stabilisieren" },
    { id:"e4", name:"Magnesium",         dose:"200 mg",     effect:"Entspannung, Nervensystem" },
    { id:"e5", name:"Phosphatidylserin", dose:"100–150 mg", effect:"Cortisol ↓, Stressreduktion" },
  ],
};
const TOTAL_SUPPS = 15;

const CHECKIN_SYSTEM = `Du bist ein nüchternes, nicht-urtelendes Rückfall-Präventions-Tool (Recovery/ADHS-Kontext).
Antworte IMMER exakt in diesem Format:

## Risiko: [niedrig / mittel / hoch]

**Was ich höre:**
[2–3 Sätze: Muster benennen, keine Floskeln]

**Jetzt sofort:**
[Eine einzige konkrete Handlung. 1 Satz.]

**Anerkennung:**
[Ein echter Satz. Kein Coaching-Speak.]

Keine Floskeln. Direkt.`;

const PATTERN_SYSTEM = `Du bist ein Recovery-Analyse-Tool. Du bekommst Check-in-Daten als JSON.
Antworte NUR in diesem Format:

## Muster erkannt

**Risiko-Trend:** [steigend / stabil / sinkend] – [1 Satz]

**Kritische Zeiten/Trigger:**
- [Muster 1]
- [Muster 2]
- [Muster 3]

**Diese Woche fokussieren auf:**
[Eine Empfehlung. Max. 2 Sätze.]

Kein Coaching-Speak. Nur was die Daten zeigen.`;

// ── TYPES ────────────────────────────────────────────────────────────────────
interface Checkin {
  date: string;
  mood: number;
  urge: number;
  risk: string | null;
  trigger: string;
  response: string;
  suppsDone: number;
}

// ── STORAGE ──────────────────────────────────────────────────────────────────
const DAY_KEY = () => new Date().toDateString();
function loadSupps(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("supp_" + DAY_KEY()) || "{}"); } catch { return {}; }
}
function saveSupps(d: Record<string, boolean>) {
  try { localStorage.setItem("supp_" + DAY_KEY(), JSON.stringify(d)); } catch {}
}
function loadCheckins(): Checkin[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("checkins") || "[]"); } catch { return []; }
}
function saveCheckins(a: Checkin[]) {
  try { localStorage.setItem("checkins", JSON.stringify(a.slice(-30))); } catch {}
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function parseRisk(t: string) {
  const m = t.match(/##\s*Risiko:\s*(niedrig|mittel|hoch)/i);
  return m ? m[1].toLowerCase() : null;
}
function mdHtml(t: string) {
  return t
    .replace(/^## (.+)$/gm, '<h3 style="font-size:15px;font-weight:800;margin:14px 0 5px;letter-spacing:-0.02em">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, '<div style="padding:3px 0 3px 12px;border-left:2px solid #e8e4de;margin:4px 0;font-size:13px">$1</div>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e8e4de;margin:12px 0">')
    .replace(/\n/g, "<br>");
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

// ── SUB-COMPONENTS ───────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: S.card, borderRadius: 14, padding: "16px 18px", ...style }}>{children}</div>;
}

function SliderField({ label, min, max, low, high, value, onChange }: {
  label: string; min: number; max: number; low: string; high: string;
  value: number; onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace" }}>{value}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, color: S.muted, width: 56, flexShrink: 0 }}>{low}</span>
        <input type="range" min={min} max={max} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: S.text, cursor: "pointer" }} />
        <span style={{ fontSize: 10, color: S.muted, width: 56, flexShrink: 0, textAlign: "right" }}>{high}</span>
      </div>
    </div>
  );
}

function SuppItem({ item, checked, onToggle, accent }: {
  item: { name: string; dose: string; effect: string };
  checked: boolean; onToggle: () => void; accent: string;
}) {
  return (
    <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", background: S.card, cursor: "pointer", borderBottom: `1px solid ${S.border}`, opacity: checked ? 0.42 : 1, transition: "opacity 0.2s" }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, border: checked ? "none" : `2px solid ${S.border}`, background: checked ? accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
        {checked && <svg width="11" height="9" viewBox="0 0 13 10" fill="none"><path d="M1.5 5L5 8.5L11.5 1.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, textDecoration: checked ? "line-through" : "none", textDecorationColor: S.muted }}>{item.name}</div>
        <div style={{ fontSize: 11, color: S.muted, marginTop: 1 }}>{item.effect}</div>
      </div>
      <div style={{ fontSize: 11, fontFamily: "monospace", color: S.muted }}>{item.dose}</div>
    </div>
  );
}

const TABS = [
  { id: "supps",   label: "Supplements", icon: "💊" },
  { id: "checkin", label: "Check-in",    icon: "🧠" },
  { id: "verlauf", label: "Verlauf",     icon: "📈" },
];

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("supps");
  const [suppChecked, setSuppChecked] = useState<Record<string, boolean>>({});
  const [ci, setCi] = useState({ mood: 6, urge: 3, trigger: "", context: "" });
  const [ciStep, setCiStep] = useState<"form"|"loading"|"result">("form");
  const [ciResult, setCiResult] = useState("");
  const [ciRisk, setCiRisk] = useState<string|null>(null);
  const [ciError, setCiError] = useState("");
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [patternResult, setPatternResult] = useState("");
  const [patternLoading, setPatternLoading] = useState(false);
  const [patternError, setPatternError] = useState("");
  const [notifStatus, setNotifStatus] = useState<"idle"|"granted"|"denied"|"unsupported">("idle");

  useEffect(() => {
    setSuppChecked(loadSupps());
    setCheckins(loadCheckins());
    if (!("Notification" in window)) setNotifStatus("unsupported");
    else if (Notification.permission === "granted") setNotifStatus("granted");
    else if (Notification.permission === "denied") setNotifStatus("denied");
  }, []);

  const today = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  const doneSupps = Object.values(suppChecked).filter(Boolean).length;

  function toggleSupp(id: string) {
    const next = { ...suppChecked, [id]: !suppChecked[id] };
    setSuppChecked(next); saveSupps(next);
  }

  async function callClaude(system: string, userMsg: string) {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 500, system, messages: [{ role: "user", content: userMsg }] }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.content.map((b: { text?: string }) => b.text || "").join("");
  }

  async function submitCheckin() {
    if (!ci.trigger.trim()) return;
    setCiStep("loading"); setCiError("");
    try {
      const msg = `Check-in:\n- Wohlbefinden: ${ci.mood}/10\n- Drang: ${ci.urge}/10\n- Trigger: ${ci.trigger}\n- Kontext: ${ci.context || "–"}\n- Supplements: ${doneSupps}/${TOTAL_SUPPS}`;
      const txt = await callClaude(CHECKIN_SYSTEM, msg);
      const risk = parseRisk(txt);
      setCiResult(txt); setCiRisk(risk); setCiStep("result");
      const entry: Checkin = { date: new Date().toISOString(), mood: ci.mood, urge: ci.urge, risk, trigger: ci.trigger, response: txt, suppsDone: doneSupps };
      const next = [...checkins, entry];
      setCheckins(next); saveCheckins(next);
      setPatternResult("");
    } catch (e: unknown) {
      setCiError(e instanceof Error ? e.message : "Fehler");
      setCiStep("form");
    }
  }

  async function runPatternAnalysis() {
    setPatternLoading(true); setPatternError("");
    try {
      const last14 = checkins.slice(-14).map(c => ({ date: fmtDate(c.date), mood: c.mood, urge: c.urge, risk: c.risk, trigger: c.trigger, suppsDone: c.suppsDone }));
      const txt = await callClaude(PATTERN_SYSTEM, JSON.stringify(last14));
      setPatternResult(txt);
    } catch (e: unknown) {
      setPatternError(e instanceof Error ? e.message : "Fehler");
    }
    setPatternLoading(false);
  }

  async function enableReminder() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setNotifStatus("granted");
      setTimeout(() => {
        new Notification("Recovery OS · Check-in", { body: "Dein täglicher Check-in wartet auf dich." });
      }, 5000);
    } else setNotifStatus("denied");
  }

  function exportCSV() {
    const header = "Datum,Wochentag,Stimmung,Drang,Risiko,Supplements,Trigger\n";
    const rows = checkins.map(c => {
      const d = new Date(c.date);
      return [fmtDate(c.date), d.toLocaleDateString("de-DE", { weekday: "long" }), c.mood, c.urge, c.risk || "", `${c.suppsDone}/${TOTAL_SUPPS}`, `"${(c.trigger || "").replace(/"/g, "'")}"`].join(",");
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `recovery_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const chartData = checkins.slice(-14).map(c => ({ date: fmtDate(c.date), Stimmung: c.mood, Drang: c.urge }));
  const avgMood = checkins.length ? (checkins.reduce((s, c) => s + c.mood, 0) / checkins.length).toFixed(1) : "–";
  const avgUrge = checkins.length ? (checkins.reduce((s, c) => s + c.urge, 0) / checkins.length).toFixed(1) : "–";
  const highRisk = checkins.filter(c => c.risk === "hoch").length;

  return (
    <div style={{ minHeight: "100vh", background: S.bg, maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 16px 96px" }}>
        {/* Header */}
        <div style={{ marginBottom: 22, animation: "fadeUp 0.4s ease both" }}>
          <div style={{ fontSize: 10, fontFamily: "monospace", color: S.muted, letterSpacing: "0.08em", marginBottom: 3 }}>{today.toUpperCase()}</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
            {tab === "supps" ? "Supplements" : tab === "checkin" ? "Check-in" : "Verlauf"}
          </h1>
        </div>

        {/* ── SUPPLEMENTS ── */}
        {tab === "supps" && (
          <div style={{ animation: "fadeUp 0.35s ease both" }}>
            <Card style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: S.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Fortschritt</span>
                <span style={{ fontFamily: "monospace", fontSize: 13 }}>{doneSupps} / {TOTAL_SUPPS}</span>
              </div>
              <div style={{ height: 5, background: S.border, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 10, background: `linear-gradient(90deg,${S.morning},${S.evening})`, width: `${(doneSupps / TOTAL_SUPPS) * 100}%`, transition: "width 0.4s cubic-bezier(0.34,1.56,0.64,1)" }} />
              </div>
            </Card>
            {[{ label: "10:00 Uhr", sub: "mit Essen", items: SUPPLEMENTS.morning, accent: S.morning }, { label: "19–20 Uhr", sub: "zum Abendbrot", items: SUPPLEMENTS.evening, accent: S.evening }].map(sec => (
              <div key={sec.label} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px", marginBottom: 8 }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: sec.accent }} />
                  <span style={{ fontSize: 16, fontWeight: 800, color: sec.accent }}>{sec.label}</span>
                  <span style={{ fontSize: 11, color: S.muted, marginLeft: "auto" }}>{sec.sub}</span>
                </div>
                <div style={{ borderRadius: 14, overflow: "hidden" }}>
                  {sec.items.map(s => <SuppItem key={s.id} item={s} checked={!!suppChecked[s.id]} onToggle={() => toggleSupp(s.id)} accent={sec.accent} />)}
                </div>
              </div>
            ))}
            {doneSupps === TOTAL_SUPPS && <Card style={{ textAlign: "center", background: S.text, color: S.bg, marginBottom: 12 }}><div style={{ fontSize: 24, marginBottom: 6 }}>✅</div><div style={{ fontWeight: 800 }}>Alles erledigt!</div></Card>}
            <button onClick={() => { setSuppChecked({}); saveSupps({}); }} style={{ width: "100%", padding: "13px", background: "transparent", border: `1.5px solid ${S.border}`, borderRadius: 12, fontSize: 13, fontWeight: 600, fontFamily: "inherit", color: S.muted, cursor: "pointer" }}>↺ Zurücksetzen</button>
          </div>
        )}

        {/* ── CHECK-IN ── */}
        {tab === "checkin" && (
          <div style={{ animation: "fadeUp 0.35s ease both" }}>
            {ciStep === "form" && <>
              <Card style={{ marginBottom: 10 }}>
                <SliderField label="Wohlbefinden" min={1} max={10} low="Sehr schlecht" high="Sehr gut" value={ci.mood} onChange={v => setCi(c => ({ ...c, mood: v }))} />
                <SliderField label="Drang-Stärke" min={0} max={10} low="Gar nicht" high="Sehr stark" value={ci.urge} onChange={v => setCi(c => ({ ...c, urge: v }))} />
              </Card>
              <Card style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Was hat heute getriggert?</div>
                <textarea rows={3} placeholder="z.B. Stress, Langeweile, Schlafmangel…" value={ci.trigger} onChange={e => setCi(c => ({ ...c, trigger: e.target.value }))} style={{ width: "100%", background: "#f7f5f2", borderRadius: 8, padding: "10px 12px", fontSize: 13, lineHeight: 1.55 }} />
              </Card>
              <Card style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Kontext (optional)</div>
                <textarea rows={2} placeholder="Schlaf, Essen, besonderes Ereignis…" value={ci.context} onChange={e => setCi(c => ({ ...c, context: e.target.value }))} style={{ width: "100%", background: "#f7f5f2", borderRadius: 8, padding: "10px 12px", fontSize: 13, lineHeight: 1.55 }} />
              </Card>
              <div style={{ fontSize: 12, color: S.muted, textAlign: "center", marginBottom: 12 }}>💊 {doneSupps}/{TOTAL_SUPPS} Supplements heute</div>
              {ciError && <div style={{ background: "#fce4ec", color: "#b71c1c", borderRadius: 10, padding: "11px 14px", fontSize: 13, marginBottom: 12 }}>⚠ {ciError}</div>}
              <button onClick={submitCheckin} disabled={!ci.trigger.trim()} style={{ width: "100%", padding: "16px", background: ci.trigger.trim() ? S.text : "#ccc", color: ci.trigger.trim() ? S.bg : "#999", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, fontFamily: "inherit", cursor: ci.trigger.trim() ? "pointer" : "default" }}>Auswerten →</button>
            </>}
            {ciStep === "loading" && <div style={{ textAlign: "center", padding: "70px 0" }}><div style={{ width: 34, height: 34, border: "3px solid #ddd", borderTopColor: S.text, borderRadius: "50%", margin: "0 auto 14px", animation: "spin 0.8s linear infinite" }} /><p style={{ color: S.muted, fontSize: 13 }}>Analyse läuft…</p></div>}
            {ciStep === "result" && <>
              {ciRisk && <div style={{ background: RISK_META[ciRisk].bg, borderRadius: 14, padding: "13px 18px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: RISK_META[ciRisk].dot }} /><span style={{ fontSize: 13, fontWeight: 700, color: RISK_META[ciRisk].text }}>Risiko: {ciRisk}</span></div>}
              <Card style={{ marginBottom: 14, lineHeight: 1.7, fontSize: 14 }}><div dangerouslySetInnerHTML={{ __html: mdHtml(ciResult) }} /></Card>
              <button onClick={() => { setCiStep("form"); setCiResult(""); setCiRisk(null); setCi({ mood: 6, urge: 3, trigger: "", context: "" }); }} style={{ width: "100%", padding: "14px", background: "transparent", color: S.text, border: `2px solid ${S.text}`, borderRadius: 14, fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>↺ Neuer Check-in</button>
            </>}
          </div>
        )}

        {/* ── VERLAUF ── */}
        {tab === "verlauf" && (
          <div style={{ animation: "fadeUp 0.35s ease both" }}>
            {checkins.length === 0 ? (
              <Card style={{ textAlign: "center", padding: "40px 20px", color: S.muted }}><div style={{ fontSize: 32, marginBottom: 10 }}>📈</div><div style={{ fontWeight: 700, marginBottom: 6 }}>Noch keine Daten</div><div style={{ fontSize: 13 }}>Mach deinen ersten Check-in.</div></Card>
            ) : <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                {[{ label: "Ø Stimmung", value: avgMood }, { label: "Ø Drang", value: avgUrge }, { label: "⚠ Hoch-Risiko", value: highRisk + "d" }].map(s => (
                  <Card key={s.label} style={{ textAlign: "center", padding: "12px 8px" }}><div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em" }}>{s.value}</div><div style={{ fontSize: 10, color: S.muted, marginTop: 3, fontWeight: 600 }}>{s.label}</div></Card>
                ))}
              </div>
              <Card style={{ marginBottom: 14, paddingLeft: 8, paddingRight: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14, paddingLeft: 10 }}>Letzte {chartData.length} Einträge</div>
                <ResponsiveContainer width="100%" height={190}>
                  <LineChart data={chartData} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={S.border} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: S.muted }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: S.muted }} />
                    <Tooltip contentStyle={{ fontFamily: "inherit", fontSize: 12, borderRadius: 8, border: `1px solid ${S.border}` }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Line type="monotone" dataKey="Stimmung" stroke={S.morning} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Drang" stroke={S.evening} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
              <Card style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: patternResult ? 12 : 0 }}>
                  <div><div style={{ fontSize: 13, fontWeight: 800 }}>Muster-Analyse</div><div style={{ fontSize: 11, color: S.muted }}>KI · letzte {Math.min(checkins.length, 14)} Check-ins</div></div>
                  <button onClick={runPatternAnalysis} disabled={patternLoading || checkins.length < 2} style={{ background: S.text, color: S.bg, border: "none", borderRadius: 20, padding: "8px 14px", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", opacity: checkins.length < 2 ? 0.4 : 1 }}>
                    {patternLoading ? "…" : "Analysieren"}
                  </button>
                </div>
                {patternError && <div style={{ background: "#fce4ec", color: "#b71c1c", borderRadius: 8, padding: "10px 12px", fontSize: 13, marginTop: 10 }}>⚠ {patternError}</div>}
                {patternResult && <div style={{ fontSize: 13, lineHeight: 1.7, borderTop: `1px solid ${S.border}`, paddingTop: 12 }} dangerouslySetInnerHTML={{ __html: mdHtml(patternResult) }} />}
              </Card>
              <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10, paddingLeft: 4 }}>Letzte Einträge</div>
              {[...checkins].reverse().slice(0, 7).map((c, i) => {
                const rm = c.risk ? RISK_META[c.risk] : null;
                return (
                  <Card key={i} style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontFamily: "monospace", fontSize: 11, color: S.muted, width: 38, flexShrink: 0 }}>{fmtDate(c.date)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.trigger}</div>
                      <div style={{ fontSize: 11, color: S.muted }}>😊 {c.mood} · ⚡ {c.urge} · 💊 {c.suppsDone}/{TOTAL_SUPPS}</div>
                    </div>
                    {rm && <div style={{ background: rm.bg, color: rm.text, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, flexShrink: 0 }}>{c.risk}</div>}
                  </Card>
                );
              })}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                <button onClick={exportCSV} style={{ padding: "13px 10px", background: "transparent", border: `1.5px solid ${S.border}`, borderRadius: 12, fontSize: 12, fontWeight: 700, fontFamily: "inherit", color: S.text, cursor: "pointer" }}>⬇ CSV Export</button>
                <button onClick={enableReminder} disabled={notifStatus === "denied" || notifStatus === "unsupported"} style={{ padding: "13px 10px", background: notifStatus === "granted" ? "#e8f5e9" : "transparent", border: `1.5px solid ${notifStatus === "granted" ? "#4caf50" : S.border}`, borderRadius: 12, fontSize: 12, fontWeight: 700, fontFamily: "inherit", color: notifStatus === "granted" ? "#2e7d32" : S.text, cursor: "pointer" }}>
                  {notifStatus === "granted" ? "🔔 Aktiv" : "🔔 Reminder"}
                </button>
              </div>
              {notifStatus === "denied" && <div style={{ fontSize: 11, color: "#b71c1c", textAlign: "center", marginTop: 8 }}>Benachrichtigungen blockiert.</div>}
            </>}
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)", borderTop: `1px solid ${S.border}`, display: "flex", padding: "8px 0 20px" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0", fontFamily: "inherit" }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: tab === t.id ? S.text : S.muted }}>{t.label}</span>
            {tab === t.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: S.text, marginTop: 1 }} />}
          </button>
        ))}
      </div>
    </div>
  );
}