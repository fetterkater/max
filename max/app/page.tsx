"use client"; import { useState, useEffect, useCallback } from "react"; import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContain
const S = {   bg: "#f0ede8", card: "#ffffff", text: "#1a1a1a", muted: "#9a9590",   border: "#e8e4de", morning: "#e8651a", evening: "#3a4fd4",
};
const RISK_META = {   niedrig: { bg: "#e8f5e9", text: "#2e7d32", dot: "#4caf50" },   mittel:  { bg: "#fff8e1", text: "#e65100", dot: "#ff9800" },   hoch:    { bg: "#fce4ec", text: "#b71c1c", dot: "#f44336" },
};
const SUPPLEMENTS = {   morning: [
    { id:"m1",  name:"NAC",           dose:"600 mg",       effect:"Glutamat stabi
    { id:"m2",  name:"Vitamin C",      dose:"500 mg",       effect:"Antioxidativ,
    { id:"m3",  name:"Omega-3",        dose:"1000–1500 mg", effect:"Entzündungshe
    { id:"m4",  name:"Kreatin",        dose:"5 g",          effect:"Energie, Nerv
    { id:"m5",  name:"Vitamin B12",    dose:"1 Kapsel",     effect:"Energie, Nerv
    { id:"m6",  name:"Vitamin D3+K2",  dose:"1 Kapsel",     effect:"Stimmung, Imm
    { id:"m7",  name:"Zink",           dose:"25 mg",        effect:"Immunsystem, 
    { id:"m8",  name:"L-Theanin",      dose:"200 mg",       effect:"Angsthemmend,
    { id:"m9",  name:"Rhodiola",       dose:"200 mg",       effect:"Stressresiste     { id:"m10", name:"L-Tyrosin",      dose:"500 mg",       effect:"Dopamin, Foku
  ],   evening: [
    { id:"e1", name:"NAC",               dose:"600 mg",     effect:"Glutamat/Dopa
    { id:"e2", name:"Glycin",            dose:"3 g",        effect:"Schlafqualitä
    { id:"e3", name:"Omega-3 Rest",      dose:"Rest",       effect:"Stimmung stab
    { id:"e4", name:"Magnesium",         dose:"200 mg",     effect:"Entspannung,     { id:"e5", name:"Phosphatidylserin", dose:"100–150 mg", effect:"Cortisol ↓, S
  ], }; const TOTAL_SUPPS = 15;
const CHECKIN_SYSTEM = `Du bist ein nüchternes, nicht-urtelendes Rückfall-Prävent Antworte IMMER exakt in diesem Format:
## Risiko: [niedrig / mittel / hoch]
**Was ich höre:**
[2–3 Sätze: Muster benennen, keine Floskeln]
**Jetzt sofort:**
[Eine einzige konkrete Handlung. 1 Satz.]
**Anerkennung:**
[Ein echter Satz. Kein Coaching-Speak.] Keine Floskeln. Direkt.`;
const PATTERN_SYSTEM = `Du bist ein Recovery-Analyse-Tool. Du bekommst Check-in-D Antworte NUR in diesem Format:
## Muster erkannt
**Risiko-Trend:** [steigend / stabil / sinkend] – [1 Satz]
**Kritische Zeiten/Trigger:**
-	[Muster 1]
-	[Muster 2]
-	[Muster 3]
**Diese Woche fokussieren auf:**
[Eine Empfehlung. Max. 2 Sätze.] Kein Coaching-Speak. Nur was die Daten zeigen.`;
const DENK_MODI = [
  {     id: "analyse", label: "Analyse", icon: " ",
    system: `Du bist ein präzises Analyse-Tool. Extrahiere die wichtigsten Fakten Antworte in diesem Format:
## Kernaussage
[1 Satz]
**Wichtigste Punkte:**
-	[Punkt 1]
-	[Punkt 2]
-	[Punkt 3]
**Widersprüche / Lücken:** [1–2 Sätze oder "Keine erkannt."]
Kein Fülltext.`,     placeholder: "Text, Artikel, Recherche-Ergebnis hier einfügen…",
  },
  {     id: "entscheidung", label: "Entscheidung", icon: " ",     system: `Du bist ein nüchternes Entscheidungs-Tool. Antworte in diesem Format: ## Entscheidung: [kurz benennen]
**Dafür:**
-	[Argument 1]
-	[Argument 2]
**Dagegen:**
-	[Argument 1]
-	[Argument 2]
**Empfehlung:**
[1 klarer Satz. Keine Weichspüler.]
Direkt. Kein Coaching.`,     placeholder: "Welche Entscheidung steht an? Kontext beschreiben…",
  },   {     id: "impuls", label: "Impuls", icon: " ",
    system: `Du bist ein Sofort-Interventions-Tool für akute Drang- oder Impulssi Antworte in diesem Format:
## Stopp.
**Was gerade passiert:** [1 Satz — benennen ohne zu werten]
**Jetzt:**
[Eine einzige Handlung. 1 Satz.]
**Danach:**
[1 Satz — was als nächstes.]
Kein Coaching. Keine Motivation. Nur Orientierung.`,     placeholder: "Was ist gerade los? Einfach rausschreiben…",
  }, ];
const TABS = [
  { id:"supps",   label:"Supplements", icon:"" },
  { id:"checkin", label:"Check-in",    icon:"" },
  { id:"verlauf", label:"Verlauf",     icon:"" },
  { id:"denken",  label:"Denken",      icon:"" },
];
// ── STORAGE ────────────────────────────────────────────────────────────────── const DAY_KEY = () => new Date().toDateString(); const ls = {   get: (k, fb = "{}") => { try { return localStorage.getItem(k) ?? fb; } catch {   set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
// ── HELPERS ─────────────────────────────────────────────────────────────────── function parseRisk(t) {   return t.match(/##\s*Risiko:\s*(niedrig|mittel|hoch)/i)?.[1]?.toLowerCase() ?? 
}
function mdHtml(t) {   return t
    .replace(/^## (.+)$/gm, '<h3 style="font-size:15px;font-weight:800;margin:14p
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, '<div style="padding:3px 0 3px 12px;border-left:2px so
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e8e4de;marg
    .replace(/\n/g, "<br>");
}
function fmtDate(iso) {   return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-di }
// ── COMPONENTS ──────────────────────────────────────────────────────────────── function Card({ children, style }) {   return <div style={{ background: S.card, borderRadius: 14, padding: "16px 18px"
}
function Spinner() {   return <span style={{ display:"inline-block", width:16, height:16, border:"2.5p
}
function SliderField({ label, min, max, low, high, value, onChange }) {   return (
    <div style={{ marginBottom: 14 }}>       <div style={{ display:"flex", justifyContent:"space-between", alignItems:"c
        <span style={{ fontSize:13, fontWeight:700 }}>{label}</span>
        <span style={{ fontSize:16, fontWeight:800, fontFamily:"monospace" }}>{va
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:10, color:S.muted, width:56, flexShrink:0 }}>{low         <input type="range" min={min} max={max} value={value}           onChange={e => onChange(Number(e.target.value))}           style={{ flex:1, accentColor:S.text, cursor:"pointer" }} />
        <span style={{ fontSize:10, color:S.muted, width:56, flexShrink:0, textAl
      </div>
    </div>
  ); }
function SuppItem({ item, checked, onToggle, accent }) {   return (
    <div onClick={onToggle} style={{ display:"flex", alignItems:"center", gap:14,
      <div style={{ width:24, height:24, borderRadius:"50%", flexShrink:0, border         {checked && <svg width="11" height="9" viewBox="0 0 13 10" fill="none"><p
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:700, textDecoration:checked?"line-t         <div style={{ fontSize:11, color:S.muted, marginTop:1 }}>{item.effect}</d       </div>
      <div style={{ fontSize:11, fontFamily:"monospace", color:S.muted }}>{item.d
    </div>
  ); }
function ErrorBox({ msg }) {   return <div style={{ background:"#fce4ec", color:"#b71c1c", borderRadius:10, pa
}
function Btn({ onClick, disabled, children, outline }) {   return (
    <button onClick={onClick} disabled={disabled} style={{       width:"100%", padding:"15px", border: outline ? `2px solid ${S.text}` : "no       background: outline ? "transparent" : (disabled ? "#ccc" : S.text),       color: outline ? S.text : (disabled ? "#999" : S.bg),       borderRadius:14, fontSize:15, fontWeight:800, fontFamily:"inherit",       cursor: disabled ? "default" : "pointer", marginBottom:4,
    }}>{children}</button>
  );
}
// ── MAIN APP ────────────────────────────────────────────────────────────────── export default function App() {   const [tab, setTab] = useState("supps");   const [suppChecked, setSuppChecked] = useState({});   const [ci, setCi] = useState({ mood:6, urge:3, trigger:"", context:"" });   const [ciStep, setCiStep] = useState("form");   const [ciResult, setCiResult] = useState("");   const [ciRisk, setCiRisk] = useState(null);   const [ciError, setCiError] = useState("");   const [checkins, setCheckins] = useState([]);
  const [patternResult, setPatternResult] = useState("");   const [patternLoading, setPatternLoading] = useState(false);   const [patternError, setPatternError] = useState("");   const [notifStatus, setNotifStatus] = useState("idle");   const [denkModus, setDenkModus] = useState("analyse");   const [denkInput, setDenkInput] = useState("");   const [denkResult, setDenkResult] = useState("");   const [denkLoading, setDenkLoading] = useState(false);   const [denkError, setDenkError] = useState("");
  // Hydrate from localStorage   useEffect(() => {     setSuppChecked(JSON.parse(ls.get("supp_" + DAY_KEY())));     setCheckins(JSON.parse(ls.get("checkins", "[]")));     if (!("Notification" in window)) setNotifStatus("unsupported");     else if (Notification.permission === "granted") setNotifStatus("granted");     else if (Notification.permission === "denied") setNotifStatus("denied");
  }, []);
  const today = new Date().toLocaleDateString("de-DE", { weekday:"long", day:"num   const doneSupps = Object.values(suppChecked).filter(Boolean).length;
  const toggleSupp = useCallback((id) => {     setSuppChecked(prev => {       const next = { ...prev, [id]: !prev[id] };       ls.set("supp_" + DAY_KEY(), JSON.stringify(next));       return next;
    });
  }, []);
  // ── Central Claude call — FIXED model string ──   const callClaude = useCallback(async (system, content) => {     const res = await fetch("https://api.anthropic.com/v1/messages", {       method: "POST",       headers: { "Content-Type": "application/json" },       body: JSON.stringify({         model: "claude-sonnet-4-5",  //   FIXED (was: claude-sonnet-4-20250514)         max_tokens: 600,         system,         messages: [{ role: "user", content }]
      }),     });     const data = await res.json();     if (data.error) throw new Error(data.error.message);     return (data.content || []).map(b => b.text ?? "").join("");
  }, []);
  // ── Check-in ──   async function submitCheckin() {     if (!ci.trigger.trim()) return;     setCiStep("loading"); setCiError("");     try {       const msg = `Check-in:\n- Wohlbefinden: ${ci.mood}/10\n- Drang: ${ci.urge}/       const txt = await callClaude(CHECKIN_SYSTEM, msg);       const risk = parseRisk(txt);       setCiResult(txt); setCiRisk(risk); setCiStep("result");       const entry = { date:new Date().toISOString(), mood:ci.mood, urge:ci.urge,       setCheckins(prev => {         const next = [...prev, entry];         ls.set("checkins", JSON.stringify(next.slice(-30)));         return next;
      });       setPatternResult("");     } catch (e) {       setCiError(e instanceof Error ? e.message : "Unbekannter Fehler");       setCiStep("form");
    }   }
  function resetCheckin() {     setCiStep("form"); setCiResult(""); setCiRisk(null);     setCi({ mood:6, urge:3, trigger:"", context:"" });
  }
  // ── Pattern ──   async function runPattern() {     if (checkins.length < 2) return;     setPatternLoading(true); setPatternError("");     try {       const payload = checkins.slice(-14).map(c => ({ date:fmtDate(c.date), mood:       setPatternResult(await callClaude(PATTERN_SYSTEM, JSON.stringify(payload)))
    } catch (e) {       setPatternError(e instanceof Error ? e.message : "Fehler");
    }     setPatternLoading(false);
  }
  // ── Denken ──   async function submitDenken() {     if (!denkInput.trim()) return;     setDenkLoading(true); setDenkError(""); setDenkResult("");     const modus = DENK_MODI.find(m => m.id === denkModus);     try {       setDenkResult(await callClaude(modus.system, denkInput));     } catch (e) {       setDenkError(e instanceof Error ? e.message : "Fehler");
    }     setDenkLoading(false);
  }
  // ── Reminder ──   async function enableReminder() {     if (!("Notification" in window)) return;     const perm = await Notification.requestPermission();     if (perm === "granted") {       setNotifStatus("granted");       setTimeout(() => new Notification("max · Check-in", { body:"Dein täglicher     } else setNotifStatus("denied");
  }
  // ── CSV Export ──   function exportCSV() {     const rows = checkins.map(c => {       const d = new Date(c.date);       return [fmtDate(c.date), d.toLocaleDateString("de-DE",{weekday:"long"}), c.
    });     const csv = "Datum,Wochentag,Stimmung,Drang,Risiko,Supplements,Trigger\n" + r     const a = Object.assign(document.createElement("a"), { href: URL.createObject     document.body.appendChild(a);
    a.click();     document.body.removeChild(a);
  }
  const chartData = checkins.slice(-14).map(c => ({ date:fmtDate(c.date), Stimmun   const avgMood = checkins.length ? (checkins.reduce((s,c) => s+c.mood, 0)/checki   const avgUrge = checkins.length ? (checkins.reduce((s,c) => s+c.urge, 0)/checki   const highRisk = checkins.filter(c => c.risk === "hoch").length;
  return (
    <div style={{ minHeight:"100vh", background:S.bg, fontFamily:"-apple-system,'
      <style>{`
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}         input[type=range]{-webkit-appearance:none;height:4px;border-radius:4px;ba         input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22p         textarea{resize:none;outline:none;border:none;font-family:inherit}         @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
      <div style={{ flex:1, overflowY:"auto", padding:"28px 16px 96px" }}>
        {/* Header */}
        <div style={{ marginBottom:22, animation:"fadeUp 0.4s ease both" }}>
          <div style={{ fontSize:10, fontFamily:"monospace", color:S.muted, lette
          <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:"-0.03em", line             {{ supps:"Supplements", checkin:"Check-in", verlauf:"Verlauf", denken
          </h1>
        </div>
        {/* ══ SUPPLEMENTS ══ */}
        {tab === "supps" && (           <div style={{ animation:"fadeUp 0.35s ease both" }}>
            <Card style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", margi
                <span style={{ fontSize:11, fontWeight:600, color:S.muted, letter                 <span style={{ fontFamily:"monospace", fontSize:13 }}>{doneSupps}               </div>
              <div style={{ height:5, background:S.border, borderRadius:10, overf                 <div style={{ height:"100%", borderRadius:10, background:`linear-
              </div>
            </Card>
            {[
              { label:"10:00 Uhr", sub:"mit Essen", items:SUPPLEMENTS.morning, ac
              { label:"19–20 Uhr", sub:"zum Abendbrot", items:SUPPLEMENTS.evening
            ].map(sec => (
              <div key={sec.label} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, padding
                  <div style={{ width:9, height:9, borderRadius:"50%", background
                  <span style={{ fontSize:16, fontWeight:800, color:sec.accent }}
                  <span style={{ fontSize:11, color:S.muted, marginLeft:"auto" }}                 </div>
                <div style={{ borderRadius:14, overflow:"hidden", background:S.ca
                  {sec.items.map(s => <SuppItem key={s.id} item={s} checked={!!su
                </div>
              </div>
            ))}
            {doneSupps === TOTAL_SUPPS && (               <Card style={{ textAlign:"center", background:S.text, color:S.bg, m
                <div style={{ fontSize:24, marginBottom:6 }}>✓</div>
                <div style={{ fontWeight:800 }}>Alles erledigt!</div>
              </Card>
            )}
            <button onClick={() => { setSuppChecked({}); ls.set("supp_"+DAY_KEY()               style={{ width:"100%", padding:"13px", background:"transparent", bo
              ↺ Zurücksetzen
            </button>
          </div>
        )}
        {/* ══ CHECK-IN ══ */}
        {tab === "checkin" && (           <div style={{ animation:"fadeUp 0.35s ease both" }}>
            {ciStep === "form" && <>
              <Card style={{ marginBottom:10 }}>
                <SliderField label="Wohlbefinden" min={1} max={10} low="Sehr schl                 <SliderField label="Drang-Stärke" min={0} max={10} low="Gar nicht
              </Card>
              <Card style={{ marginBottom:10 }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>Was                 <textarea rows={3} placeholder="z.B. Stress, Langeweile, Schlafma                   value={ci.trigger} onChange={e => setCi(c => ({...c, trigger:e.                   style={{ width:"100%", background:"#f7f5f2", borderRadius:8, pa
              </Card>
              <Card style={{ marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>Kont                 <textarea rows={2} placeholder="Schlaf, Essen, besonderes Ereigni                   value={ci.context} onChange={e => setCi(c => ({...c, context:e.                   style={{ width:"100%", background:"#f7f5f2", borderRadius:8, pa               </Card>
              <div style={{ fontSize:12, color:S.muted, textAlign:"center", margi
                  {doneSupps}/{TOTAL_SUPPS} Supplements heute
              </div>
              {ciError && <ErrorBox msg={ciError} />}
              <Btn onClick={submitCheckin} disabled={!ci.trigger.trim()}>Auswerte
            </>}
            {ciStep === "loading" && (
              <div style={{ textAlign:"center", padding:"70px 0" }}>
                <div style={{ width:34, height:34, border:"3px solid #ddd", borde                 <p style={{ color:S.muted, fontSize:13 }}>Analyse läuft…</p>
              </div>
            )}
            {ciStep === "result" && <>
              {ciRisk && (
                <div style={{ background:RISK_META[ciRisk].bg, borderRadius:14, p
                  <div style={{ width:10, height:10, borderRadius:"50%", backgrou
                  <span style={{ fontSize:13, fontWeight:700, color:RISK_META[ciR
                </div>
              )}
              <Card style={{ marginBottom:14, lineHeight:1.7, fontSize:14 }}>
                <div dangerouslySetInnerHTML={{ __html:mdHtml(ciResult) }} />
              </Card>
              <Btn onClick={resetCheckin} outline>↺ Neuer Check-in</Btn>
            </>}
          </div>
        )}
        {/* ══ VERLAUF ══ */}
        {tab === "verlauf" && (           <div style={{ animation:"fadeUp 0.35s ease both" }}>
            {checkins.length === 0 ? (
              <Card style={{ textAlign:"center", padding:"40px 20px", color:S.mut                 <div style={{ fontSize:32, marginBottom:10 }}> </div>
                <div style={{ fontWeight:700, marginBottom:6 }}>Noch keine Daten<                 <div style={{ fontSize:13 }}>Mach deinen ersten Check-in.</div>
              </Card>
            ) : <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", ga
                {[{label:"Ø Stimmung",value:avgMood},{label:"Ø Drang",value:avgUr
                  <Card key={s.label} style={{ textAlign:"center", padding:"12px                     <div style={{ fontSize:20, fontWeight:800, letterSpacing:"-0.
                    <div style={{ fontSize:10, color:S.muted, marginTop:3, fontWe
                  </Card>
                ))}
              </div>
              <Card style={{ marginBottom:14, paddingLeft:8, paddingRight:8 }}>
                <div style={{ fontSize:11, fontWeight:700, color:S.muted, letterS
                  Letzte {chartData.length} Einträge
                </div>
                <ResponsiveContainer width="100%" height={190}>
                  <LineChart data={chartData} margin={{top:4,right:12,left:-20,bo
                    <CartesianGrid strokeDasharray="3 3" stroke={S.border} />
                    <XAxis dataKey="date" tick={{fontSize:10,fill:S.muted}} />
                    <YAxis domain={[0,10]} tick={{fontSize:10,fill:S.muted}} />
                    <Tooltip contentStyle={{fontFamily:"inherit",fontSize:12,bord
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSiz
                    <Line type="monotone" dataKey="Stimmung" stroke={S.morning} s
                    <Line type="monotone" dataKey="Drang" stroke={S.evening} stro
                  </LineChart>
                </ResponsiveContainer>
              </Card>
              <Card style={{ marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent                   <div>
                    <div style={{ fontSize:13, fontWeight:800 }}>Muster-Analyse</
                    <div style={{ fontSize:11, color:S.muted }}>KI · letzte {Math                   </div>
                  <button onClick={runPattern} disabled={patternLoading || checki                     style={{ background:S.text, color:S.bg, border:"none", border                     {patternLoading ? <Spinner /> : "Analysieren"}
                  </button>
                </div>
                {patternError && <ErrorBox msg={patternError} />}
                {checkins.length < 2 && <div style={{ fontSize:12, color:S.muted,
                {patternResult && (                   <div style={{ fontSize:13, lineHeight:1.7, borderTop:`1px solid                     dangerouslySetInnerHTML={{ __html:mdHtml(patternResult) }} />
                )}
              </Card>
              <div style={{ fontSize:11, fontWeight:700, color:S.muted, letterSpa               {[...checkins].reverse().slice(0,7).map((c,i) => {                 const rm = c.risk ? RISK_META[c.risk] : null;                 return (
                  <Card key={i} style={{ marginBottom:8, display:"flex", alignIte
                    <div style={{ fontFamily:"monospace", fontSize:11, color:S.mu
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, marginBottom:2, 
                      <div style={{ fontSize:11, color:S.muted }}>  {c.mood} ·  
                    </div>
                    {rm && <div style={{ background:rm.bg, color:rm.text, fontSiz
                  </Card>
                );
              })}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8,
                <button onClick={exportCSV} style={{ padding:"13px 10px", backgro
                    CSV Export
                </button>
                <button onClick={enableReminder} disabled={notifStatus==="denied"                   style={{ padding:"13px 10px", background:notifStatus==="granted
                  {notifStatus==="granted" ? "  Aktiv" : "  Reminder"}
                </button>
              </div>
              {notifStatus==="denied" && <div style={{ fontSize:11, color:"#b71c1               {notifStatus==="granted" && <div style={{ fontSize:11, color:"#2e7d
            </>}
          </div>
        )}
        {/* ══ DENKEN ══ */}
        {tab === "denken" && (
          <div style={{ animation:"fadeUp 0.35s ease both" }}>             <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:
              {DENK_MODI.map(m => (                 <button key={m.id} onClick={() => { setDenkModus(m.id); setDenkRe                   style={{                     padding:"10px 6px", borderRadius:12,                     border:`1.5px solid ${denkModus===m.id ? S.text : S.border}`,                     background: denkModus===m.id ? S.text : "transparent",                     color: denkModus===m.id ? S.bg : S.text,                     fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"in                     display:"flex", flexDirection:"column", alignItems:"center", 
                  }}>
                  <span style={{ fontSize:18 }}>{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
            <Card style={{ marginBottom:10 }}>               <textarea rows={6}                 placeholder={DENK_MODI.find(m => m.id===denkModus)?.placeholder}                 value={denkInput}                 onChange={e => { setDenkInput(e.target.value); setDenkResult("");                 style={{ width:"100%", background:"#f7f5f2", borderRadius:8, padd
            </Card>
            {denkError && <ErrorBox msg={denkError} />}
            <Btn onClick={submitDenken} disabled={!denkInput.trim() || denkLoadin               {denkLoading ? <Spinner /> : `${DENK_MODI.find(m=>m.id===denkModus)
            </Btn>
            {denkResult && (
              <Card style={{ lineHeight:1.7, fontSize:14, marginTop:10, animation                 <div dangerouslySetInnerHTML={{ __html:mdHtml(denkResult) }} />
              </Card>
            )}
          </div>
        )}
      </div>
      {/* ── TAB BAR ── */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}             style={{ flex:1, background:"none", border:"none", cursor:"pointer",             <span style={{ fontSize:20 }}>{t.icon}</span>
            <span style={{ fontSize:10, fontWeight:700, color:tab===t.id?S.text:S             {tab === t.id && <div style={{ width:4, height:4, borderRadius:"50%",
          </button>
        ))}
      </div>
    </div>
  );
}
