"use client";
import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const S = {
  bg:"#080810", bgCard:"#0e0e1a", bgInput:"#12121f",
  neon:"#b44dff", neonDim:"#7b2dcc", neonGlow:"rgba(180,77,255,0.18)", neonBorder:"rgba(180,77,255,0.35)",
  cyan:"#00f5ff", cyanGlow:"rgba(0,245,255,0.15)",
  text:"#f0eaff", muted:"#6b6485", border:"rgba(180,77,255,0.15)",
  danger:"#ff4d6d", success:"#00ff9d", morning:"#ff6b35", evening:"#b44dff",
};

const RISK_META = {
  niedrig:{ bg:"rgba(0,255,157,0.08)",  text:"#00ff9d", dot:"#00ff9d", border:"rgba(0,255,157,0.3)" },
  mittel: { bg:"rgba(7, 7, 5, 0.08)",  text:"#ffc107", dot:"#ffc107", border:"rgba(255,193,7,0.3)" },
  hoch:   { bg:"rgba(255,77,109,0.08)", text:"#ff4d6d", dot:"#ff4d6d", border:"rgba(255,77,109,0.3)" },
};

const SUPPLEMENTS = {
  morning:[
    {id:"m1", name:"NAC",           dose:"600 mg",       effect:"Glutamat stabilisieren, Craving ↓"},
    {id:"m2", name:"Vitamin C",     dose:"500 mg",       effect:"Antioxidativ, NAC unterstützen"},
    {id:"m3", name:"Omega-3",       dose:"1000–1500 mg", effect:"Entzündungshemmend, Stimmung"},
    {id:"m4", name:"Kreatin",       dose:"5 g",          effect:"Energie, Nervensystem"},
    {id:"m5", name:"Vitamin B12",   dose:"1 Kapsel",     effect:"Energie, Nervensystem"},
    {id:"m6", name:"Vitamin D3+K2", dose:"1 Kapsel",     effect:"Stimmung, Immunsystem"},
    {id:"m7", name:"Zink",          dose:"25 mg",        effect:"Immunsystem, Neurotransmitter"},
    {id:"m8", name:"L-Theanin",     dose:"200 mg",       effect:"Angsthemmend, beruhigend"},
    {id:"m9", name:"Rhodiola",      dose:"200 mg",       effect:"Stressresistenz, Energie"},
    {id:"m10",name:"L-Tyrosin",     dose:"500 mg",       effect:"Dopamin, Fokus"},
  ],
  evening:[
    {id:"e1", name:"NAC",               dose:"600 mg",     effect:"Glutamat/Dopamin stabilisieren"},
    {id:"e2", name:"Glycin",            dose:"3 g",        effect:"Schlafqualität ↑"},
    {id:"e3", name:"Omega-3 Rest",      dose:"Rest",       effect:"Stimmung stabilisieren"},
    {id:"e4", name:"Magnesium",         dose:"200 mg",     effect:"Entspannung, Nervensystem"},
    {id:"e5", name:"Phosphatidylserin", dose:"100–150 mg", effect:"Cortisol ↓, Stressreduktion"},
  ],
};

const TOTAL_SUPPS = 15;

const CHECKIN_SYSTEM = `Du bist ein nüchternes, nicht-urtelendes Rückfall-Präventions-Tool.
Antworte IMMER exakt in diesem Format:

## Risiko: [niedrig / mittel / hoch]

**Was ich höre:**
[2–3 Sätze: Muster benennen, keine Floskeln]

**Jetzt sofort:**
[Eine einzige konkrete Handlung. 1 Satz.]

**Anerkennung:**
[Ein echter Satz. Kein Coaching-Speak.]

Keine Floskeln. Direkt.`;

const PATTERN_SYSTEM = `Du bist ein Recovery-Analyse-Tool. Du bekommst Check-in-Daten der letzten Tage.
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

const DENK_MODI = [
  {
    id:"analyse", label:"Analyse", icon:"◈",
    system:`Du bist ein präzises Analyse-Tool.
Antworte in diesem Format:

## Kernaussage
[1 Satz]

**Wichtigste Punkte:**
- [Punkt 1]
- [Punkt 2]
- [Punkt 3]

**Widersprüche / Lücken:** [1–2 Sätze oder "Keine erkannt."]

Kein Fülltext.`,
    placeholder:"Text, Artikel, Recherche-Ergebnis hier einfügen…",
  },
  {
    id:"entscheidung", label:"Entscheid", icon:"⊕",
    system:`Du bist ein nüchternes Entscheidungs-Tool.
Antworte in diesem Format:

## Entscheidung: [kurz benennen]

**Dafür:**
- [Argument 1]
- [Argument 2]

**Dagegen:**
- [Argument 1]
- [Argument 2]

**Empfehlung:**
[1 klarer Satz.]

Direkt. Kein Coaching.`,
    placeholder:"Welche Entscheidung steht an? Kontext beschreiben…",
  },
  {
    id:"impuls", label:"Impuls", icon:"⚡",
    system:`Du bist ein Sofort-Interventions-Tool für akute Impulssituationen.
Antworte in diesem Format:

## Stopp.

**Was gerade passiert:** [1 Satz]

**Jetzt:**
[Eine einzige Handlung. 1 Satz.]

**Danach:**
[1 Satz]

Kein Coaching. Nur Orientierung.`,
    placeholder:"Was ist gerade los? Einfach rausschreiben…",
  },
];

const TABS = [
  {id:"supps",   label:"Supps",   icon:"◎"},
  {id:"checkin", label:"Check",   icon:"◈"},
  {id:"verlauf", label:"Verlauf", icon:"▲"},
  {id:"denken",  label:"Denken",  icon:"⊕"},
];

const DAY_KEY = () => new Date().toDateString();
const ls = {
  get:(k,fb="{}") => { try { return localStorage.getItem(k) ?? fb; } catch { return fb; } },
  set:(k,v) => { try { localStorage.setItem(k,v); } catch {} },
};

function parseRisk(t) {
  return t.match(/##\s*Risiko:\s*(niedrig|mittel|hoch)/i)?.[1]?.toLowerCase() ?? null;
}

function mdHtml(t) {
  return t
    .replace(/^## (.+)$/gm, `<h3 style="font-size:13px;font-weight:800;margin:14px 0 8px;color:#b44dff;letter-spacing:0.06em;text-transform:uppercase">$1</h3>`)
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:#f0eaff">$1</strong>`)
    .replace(/^- (.+)$/gm, `<div style="padding:4px 0 4px 12px;border-left:2px solid rgba(180,77,255,0.35);margin:4px 0;color:#c0b8d4">$1</div>`)
    .replace(/\n/g, "<br>");
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
}

function NeonCard({children, style, glow}) {
  return (
    <div style={{
      background:S.bgCard, borderRadius:14, padding:"16px 18px", marginBottom:10,
      border:`1px solid ${glow ? S.neonBorder : S.border}`,
      boxShadow: glow ? `0 0 28px ${S.neonGlow}, inset 0 0 20px rgba(180,77,255,0.04)` : "none",
      ...style,
    }}>{children}</div>
  );
}

function GlowBtn({onClick, disabled, children}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:"100%", padding:"15px",
      border:`1px solid ${disabled ? S.muted : S.neon}`,
      background:"transparent",
      color: disabled ? S.muted : S.neon,
      borderRadius:12, fontSize:12, fontWeight:800, fontFamily:"inherit",
      cursor: disabled ? "default" : "pointer",
      letterSpacing:"0.12em", textTransform:"uppercase",
      boxShadow: disabled ? "none" : `0 0 20px ${S.neonGlow}`,
      transition:"all 0.2s", marginBottom:4,
    }}>{children}</button>
  );
}

function Spinner() {
  return <span style={{display:"inline-block",width:14,height:14,border:`2px solid ${S.neonBorder}`,borderTopColor:S.neon,borderRadius:"50%",animation:"spin 0.6s linear infinite"}} />;
}

function SliderField({label, min, max, low, high, value, onChange, color}) {
  const col = color || S.neon;
  return (
    <div style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase"}}>{label}</span>
        <span style={{fontSize:22,fontWeight:800,fontFamily:"monospace",color:col,textShadow:`0 0 12px ${col}`}}>{value}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:9,color:S.muted,width:48,flexShrink:0}}>{low}</span>
        <input type="range" min={min} max={max} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{flex:1,appearance:"none",WebkitAppearance:"none",height:3,borderRadius:3,
            background:`linear-gradient(90deg, ${col} ${(value-min)/(max-min)*100}%, ${S.bgInput} 0%)`,
            outline:"none",cursor:"pointer"}} />
        <span style={{fontSize:9,color:S.muted,width:48,flexShrink:0,textAlign:"right"}}>{high}</span>
      </div>
    </div>
  );
}

function SuppItem({item, checked, onToggle, accent}) {
  return (
    <div onClick={onToggle} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 0",borderBottom:`1px solid ${S.border}`,cursor:"pointer"}}>
      <div style={{
        width:22,height:22,borderRadius:6,flexShrink:0,
        border:`1.5px solid ${checked ? accent : S.muted}`,
        background: checked ? accent+"22" : "transparent",
        display:"flex",alignItems:"center",justifyContent:"center",
        transition:"all 0.2s",
        boxShadow: checked ? `0 0 10px ${accent}66` : "none",
      }}>
        {checked && <span style={{color:accent,fontSize:11,fontWeight:900}}>✓</span>}
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:14,fontWeight:700,color:checked?S.muted:S.text,textDecoration:checked?"line-through":"none",transition:"all 0.2s"}}>{item.name}</div>
        <div style={{fontSize:11,color:S.muted,marginTop:2}}>{item.effect}</div>
      </div>
      <div style={{fontSize:11,fontFamily:"monospace",color:checked?accent:S.muted}}>{item.dose}</div>
    </div>
  );
}

function ErrorBox({msg}) {
  return <div style={{background:"rgba(255,77,109,0.08)",color:S.danger,borderRadius:10,padding:"12px 14px",fontSize:12,marginBottom:10,border:"1px solid rgba(255,77,109,0.3)"}}>{msg}</div>;
}

export default function App() {
  const [tab, setTab] = useState("supps");
  const [suppChecked, setSuppChecked] = useState({});
  const [ci, setCi] = useState({mood:6, urge:3, trigger:"", context:""});
  const [ciStep, setCiStep] = useState("form");
  const [ciResult, setCiResult] = useState("");
  const [ciRisk, setCiRisk] = useState(null);
  const [ciError, setCiError] = useState("");
  const [checkins, setCheckins] = useState([]);
  const [patternResult, setPatternResult] = useState("");
  const [patternLoading, setPatternLoading] = useState(false);
  const [patternError, setPatternError] = useState("");
  const [notifStatus, setNotifStatus] = useState("idle");
  const [denkModus, setDenkModus] = useState("analyse");
  const [denkInput, setDenkInput] = useState("");
  const [denkResult, setDenkResult] = useState("");
  const [denkLoading, setDenkLoading] = useState(false);
  const [denkError, setDenkError] = useState("");

  useEffect(() => {
    setSuppChecked(JSON.parse(ls.get("supp_"+DAY_KEY())));
    setCheckins(JSON.parse(ls.get("checkins","[]")));
    if (!("Notification" in window)) setNotifStatus("unsupported");
    else if (Notification.permission==="granted") setNotifStatus("granted");
    else if (Notification.permission==="denied") setNotifStatus("denied");
  }, []);

  const today = new Date().toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long"});
  const doneSupps = Object.values(suppChecked).filter(Boolean).length;

  const toggleSupp = useCallback((id) => {
    setSuppChecked(prev => {
      const next = {...prev, [id]:!prev[id]};
      ls.set("supp_"+DAY_KEY(), JSON.stringify(next));
      return next;
    });
  }, []);

  const callClaude = useCallback(async (system, content) => {
    const res = await fetch("/api/claude", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ system, prompt: content }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "API Fehler");
    return data.text ?? "";
  }, []);

  async function submitCheckin() {
    if (!ci.trigger.trim()) return;
    setCiStep("loading"); setCiError("");
    try {
      const msg = `Check-in:\n- Wohlbefinden: ${ci.mood}/10\n- Drang: ${ci.urge}/10\n- Trigger: ${ci.trigger}\n- Kontext: ${ci.context||"–"}`;
      const txt = await callClaude(CHECKIN_SYSTEM, msg);
      const risk = parseRisk(txt);
      setCiResult(txt); setCiRisk(risk); setCiStep("result");
      const entry = {date:new Date().toISOString(), mood:ci.mood, urge:ci.urge, risk, trigger:ci.trigger, response:txt, suppsDone:doneSupps};
      setCheckins(prev => {
        const next = [...prev, entry];
        ls.set("checkins", JSON.stringify(next.slice(-30)));
        return next;
      });
      setPatternResult("");
    } catch(e) {
      setCiError(e instanceof Error ? e.message : "Fehler");
      setCiStep("form");
    }
  }

  function resetCheckin() {
    setCiStep("form"); setCiResult(""); setCiRisk(null);
    setCi({mood:6, urge:3, trigger:"", context:""});
  }

  async function runPattern() {
    if (checkins.length < 2) return;
    setPatternLoading(true); setPatternError("");
    try {
      const payload = checkins.slice(-14).map(c => ({date:fmtDate(c.date), mood:c.mood, urge:c.urge, risk:c.risk, trigger:c.trigger}));
      setPatternResult(await callClaude(PATTERN_SYSTEM, JSON.stringify(payload)));
    } catch(e) {
      setPatternError(e instanceof Error ? e.message : "Fehler");
    }
    setPatternLoading(false);
  }

  async function submitDenken() {
    if (!denkInput.trim()) return;
    setDenkLoading(true); setDenkError(""); setDenkResult("");
    const modus = DENK_MODI.find(m => m.id===denkModus);
    try {
      setDenkResult(await callClaude(modus.system, denkInput));
    } catch(e) {
      setDenkError(e instanceof Error ? e.message : "Fehler");
    }
    setDenkLoading(false);
  }

  async function enableReminder() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    if (perm==="granted") {
      setNotifStatus("granted");
      setTimeout(() => new Notification("max · Check-in",{body:"Dein täglicher Check-in wartet."}), 100);
    } else setNotifStatus("denied");
  }

  function exportCSV() {
    const rows = checkins.map(c => {
      const d = new Date(c.date);
      return [fmtDate(c.date), d.toLocaleDateString("de-DE",{weekday:"long"}), c.mood, c.urge, c.risk||"", c.suppsDone, `"${c.trigger.replace(/"/g,'""')}"`].join(",");
    });
    const csv = "Datum,Wochentag,Stimmung,Drang,Risiko,Supplements,Trigger\n"+rows.join("\n");
    const a = Object.assign(document.createElement("a"),{href:URL.createObjectURL(new Blob([csv],{type:"text/csv"})),download:"recovery-export.csv"});
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  const chartData = checkins.slice(-14).map(c => ({date:fmtDate(c.date), Stimmung:c.mood, Drang:c.urge}));
  const avgMood = checkins.length ? (checkins.reduce((s,c)=>s+c.mood,0)/checkins.length).toFixed(1) : "–";
  const avgUrge = checkins.length ? (checkins.reduce((s,c)=>s+c.urge,0)/checkins.length).toFixed(1) : "–";
  const highRisk = checkins.filter(c=>c.risk==="hoch").length;
  const tabLabels = {supps:"Supplements", checkin:"Check-in", verlauf:"Verlauf", denken:"Denken"};

  return (
    <div style={{minHeight:"100vh",background:S.bg,fontFamily:"'SF Mono','Fira Code',monospace",color:S.text,maxWidth:430,margin:"0 auto",position:"relative",display:"flex",flexDirection:"column"}}>
      <style>{`
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        input[type=range]{-webkit-appearance:none;appearance:none;cursor:pointer}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:4px;background:${S.neon};box-shadow:0 0 10px ${S.neon}}
        textarea{resize:none;outline:none;border:none;font-family:inherit}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}
        @keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(200vh)}}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:${S.bg}}
        ::-webkit-scrollbar-thumb{background:${S.neonBorder};border-radius:2px}
      `}</style>

      {/* Scanline */}
      <div style={{position:"fixed",top:0,left:0,right:0,height:"120px",background:`linear-gradient(transparent,${S.neon}22,transparent)`,animation:"scanline 5s linear infinite",pointerEvents:"none",zIndex:999}} />
      {/* Top glow line */}
      <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"60%",height:1,background:S.neon,boxShadow:`0 0 40px 6px ${S.neon}`,opacity:0.5,pointerEvents:"none",zIndex:998}} />

      <div style={{flex:1,overflowY:"auto",padding:"28px 16px 96px"}}>

        {/* Header */}
        <div style={{marginBottom:24,animation:"fadeUp 0.4s ease both"}}>
          <div style={{fontSize:9,color:S.muted,letterSpacing:"0.2em",marginBottom:8,textTransform:"uppercase"}}>▸ {today}</div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:3,height:30,background:S.neon,borderRadius:2,boxShadow:`0 0 12px ${S.neon}`}} />
            <h1 style={{fontSize:22,fontWeight:800,letterSpacing:"0.06em",margin:0,textTransform:"uppercase",color:S.text}}>
              {tabLabels[tab]}
            </h1>
          </div>
        </div>

        {/* SUPPLEMENTS */}
        {tab==="supps" && (
          <div style={{animation:"fadeUp 0.35s ease both"}}>
            <NeonCard glow style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase"}}>Fortschritt</span>
                <span style={{fontFamily:"monospace",fontSize:14,color:S.neon,textShadow:`0 0 10px ${S.neon}`}}>{doneSupps} / {TOTAL_SUPPS}</span>
              </div>
              <div style={{height:3,background:S.bgInput,borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:4,background:`linear-gradient(90deg,${S.neon},${S.cyan})`,width:`${(doneSupps/TOTAL_SUPPS)*100}%`,boxShadow:`0 0 8px ${S.neon}`,transition:"width 0.4s ease"}} />
              </div>
            </NeonCard>

            {[
              {label:"10:00 Uhr", sub:"mit Essen", items:SUPPLEMENTS.morning, accent:S.morning},
              {label:"19–20 Uhr", sub:"zum Abendbrot", items:SUPPLEMENTS.evening, accent:S.evening},
            ].map(sec => (
              <div key={sec.label} style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:8,paddingBottom:8}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:sec.accent,boxShadow:`0 0 8px ${sec.accent}`}} />
                  <span style={{fontSize:12,fontWeight:800,color:sec.accent,letterSpacing:"0.08em",textTransform:"uppercase",textShadow:`0 0 8px ${sec.accent}88`}}>{sec.label}</span>
                  <span style={{fontSize:9,color:S.muted,marginLeft:"auto"}}>{sec.sub}</span>
                </div>
                <NeonCard style={{padding:"0 16px"}}>
                  {sec.items.map(s => <SuppItem key={s.id} item={s} checked={!!suppChecked[s.id]} onToggle={() => toggleSupp(s.id)} accent={sec.accent} />)}
                </NeonCard>
              </div>
            ))}

            {doneSupps===TOTAL_SUPPS && (
              <NeonCard glow style={{textAlign:"center",padding:"24px",marginBottom:14,border:`1px solid ${S.neon}`}}>
                <div style={{fontSize:26,color:S.neon,textShadow:`0 0 20px ${S.neon}`,marginBottom:6}}>✓</div>
                <div style={{fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",color:S.neon}}>System vollständig</div>
              </NeonCard>
            )}

            <button onClick={() => {setSuppChecked({}); ls.set("supp_"+DAY_KEY(),"{}");}}
              style={{width:"100%",padding:"13px",background:"transparent",border:`1px solid ${S.border}`,borderRadius:10,fontSize:10,fontWeight:700,cursor:"pointer",color:S.muted,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"inherit"}}>
              ↺ Reset
            </button>
          </div>
        )}

        {/* CHECK-IN */}
        {tab==="checkin" && (
          <div style={{animation:"fadeUp 0.35s ease both"}}>
            {ciStep==="form" && <>
              <NeonCard glow style={{marginBottom:10}}>
                <SliderField label="Wohlbefinden" min={1} max={10} low="Schlecht" high="Gut" value={ci.mood} onChange={v=>setCi(c=>({...c,mood:v}))} color={S.cyan} />
                <SliderField label="Drang-Stärke" min={0} max={10} low="Keiner" high="Stark" value={ci.urge} onChange={v=>setCi(c=>({...c,urge:v}))} color={S.danger} />
              </NeonCard>
              <NeonCard style={{marginBottom:10}}>
                <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>Was hat heute getriggert?</div>
                <textarea rows={3} placeholder="z.B. Stress, Langeweile, Schlafmangel…"
                  value={ci.trigger} onChange={e=>setCi(c=>({...c,trigger:e.target.value}))}
                  style={{width:"100%",background:S.bgInput,borderRadius:8,padding:"10px 12px",fontSize:13,lineHeight:1.6,color:S.text}} />
              </NeonCard>
              <NeonCard style={{marginBottom:14}}>
                <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>Kontext (optional)</div>
                <textarea rows={2} placeholder="Schlaf, Essen, besonderes Ereignis…"
                  value={ci.context} onChange={e=>setCi(c=>({...c,context:e.target.value}))}
                  style={{width:"100%",background:S.bgInput,borderRadius:8,padding:"10px 12px",fontSize:13,lineHeight:1.6,color:S.text}} />
              </NeonCard>
              <div style={{fontSize:9,color:S.muted,textAlign:"center",marginBottom:12,letterSpacing:"0.1em"}}>◎ {doneSupps}/{TOTAL_SUPPS} Supplements heute</div>
              {ciError && <ErrorBox msg={ciError} />}
              <GlowBtn onClick={submitCheckin} disabled={!ci.trigger.trim()}>◈ Auswerten</GlowBtn>
            </>}

            {ciStep==="loading" && (
              <div style={{textAlign:"center",padding:"70px 0"}}>
                <div style={{width:40,height:40,border:`2px solid ${S.neonBorder}`,borderTopColor:S.neon,borderRadius:"50%",animation:"spin 0.6s linear infinite",margin:"0 auto 16px",boxShadow:`0 0 20px ${S.neonGlow}`}} />
                <p style={{color:S.muted,fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase",animation:"pulse 1.5s ease infinite"}}>Analyse läuft…</p>
              </div>
            )}

            {ciStep==="result" && <>
              {ciRisk && (
                <div style={{background:RISK_META[ciRisk].bg,borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,marginBottom:12,border:`1px solid ${RISK_META[ciRisk].border}`}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:RISK_META[ciRisk].dot,boxShadow:`0 0 10px ${RISK_META[ciRisk].dot}`,flexShrink:0}} />
                  <span style={{fontSize:10,fontWeight:800,color:RISK_META[ciRisk].text,letterSpacing:"0.1em",textTransform:"uppercase"}}>Risiko: {ciRisk}</span>
                </div>
              )}
              <NeonCard glow style={{marginBottom:14,lineHeight:1.8,fontSize:13}}>
                <div dangerouslySetInnerHTML={{__html:mdHtml(ciResult)}} />
              </NeonCard>
              <GlowBtn onClick={resetCheckin}>↺ Neuer Check-in</GlowBtn>
            </>}
          </div>
        )}

        {/* VERLAUF */}
        {tab==="verlauf" && (
          <div style={{animation:"fadeUp 0.35s ease both"}}>
            {checkins.length===0 ? (
              <NeonCard style={{textAlign:"center",padding:"50px 20px",color:S.muted}}>
                <div style={{fontSize:28,marginBottom:12,opacity:0.3}}>▲</div>
                <div style={{fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Keine Daten</div>
                <div style={{fontSize:11}}>Mach deinen ersten Check-in.</div>
              </NeonCard>
            ) : <>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
                {[
                  {label:"Ø Stimmung",value:avgMood,color:S.cyan},
                  {label:"Ø Drang",value:avgUrge,color:S.danger},
                  {label:"Hoch-Risiko",value:highRisk,color:S.neon},
                ].map(stat => (
                  <NeonCard key={stat.label} style={{textAlign:"center",padding:"14px 8px",marginBottom:0}}>
                    <div style={{fontSize:20,fontWeight:800,color:stat.color,textShadow:`0 0 12px ${stat.color}`}}>{stat.value}</div>
                    <div style={{fontSize:8,color:S.muted,marginTop:4,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>{stat.label}</div>
                  </NeonCard>
                ))}
              </div>

              <NeonCard style={{marginBottom:14,paddingLeft:6,paddingRight:6}}>
                <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:12}}>▲ Letzte {chartData.length} Einträge</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData} margin={{top:4,right:8,left:-24,bottom:4}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={S.border} />
                    <XAxis dataKey="date" tick={{fontSize:9,fill:S.muted,fontFamily:"monospace"}} />
                    <YAxis domain={[0,10]} tick={{fontSize:9,fill:S.muted,fontFamily:"monospace"}} />
                    <Tooltip contentStyle={{fontFamily:"monospace",fontSize:11,background:S.bgCard,border:`1px solid ${S.neonBorder}`,borderRadius:8,color:S.text}} />
                    <Legend iconType="circle" iconSize={6} wrapperStyle={{fontSize:10,fontFamily:"monospace"}} />
                    <Line type="monotone" dataKey="Stimmung" stroke={S.cyan} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Drang" stroke={S.danger} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </NeonCard>

              <NeonCard glow style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:800,letterSpacing:"0.05em"}}>Muster-Analyse</div>
                    <div style={{fontSize:9,color:S.muted,marginTop:2}}>KI · letzte {Math.min(checkins.length,14)} Einträge</div>
                  </div>
                  <button onClick={runPattern} disabled={patternLoading||checkins.length<2}
                    style={{background:"transparent",color:patternLoading?S.muted:S.neon,border:`1px solid ${patternLoading?S.border:S.neonBorder}`,borderRadius:8,padding:"8px 14px",fontSize:9,fontWeight:800,cursor:"pointer",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,boxShadow:patternLoading?"none":`0 0 12px ${S.neonGlow}`}}>
                    {patternLoading ? <Spinner /> : "◈ Scan"}
                  </button>
                </div>
                {patternError && <ErrorBox msg={patternError} />}
                {checkins.length<2 && <div style={{fontSize:11,color:S.muted}}>Mind. 2 Check-ins nötig.</div>}
                {patternResult && (
                  <div style={{fontSize:12,lineHeight:1.8,borderTop:`1px solid ${S.border}`,paddingTop:12}} dangerouslySetInnerHTML={{__html:mdHtml(patternResult)}} />
                )}
              </NeonCard>

              <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:8}}>Letzte Einträge</div>
              {[...checkins].reverse().slice(0,7).map((c,i) => {
                const rm = c.risk ? RISK_META[c.risk] : null;
                return (
                  <NeonCard key={i} style={{marginBottom:8,display:"flex",alignItems:"center",gap:12,padding:"12px 14px"}}>
                    <div style={{fontFamily:"monospace",fontSize:10,color:S.muted,flexShrink:0}}>{fmtDate(c.date)}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.trigger}</div>
                      <div style={{fontSize:10,color:S.muted,fontFamily:"monospace"}}>↑{c.mood} · ↑{c.urge}</div>
                    </div>
                    {rm && <div style={{background:rm.bg,color:rm.text,fontSize:8,fontWeight:800,padding:"3px 8px",borderRadius:20,flexShrink:0,textTransform:"uppercase",letterSpacing:"0.08em",border:`1px solid ${rm.border}`}}>{c.risk}</div>}
                  </NeonCard>
                );
              })}

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
                <button onClick={exportCSV} style={{padding:"13px",background:"transparent",border:`1px solid ${S.border}`,borderRadius:10,fontSize:9,fontWeight:800,cursor:"pointer",color:S.muted,fontFamily:"inherit",letterSpacing:"0.1em",textTransform:"uppercase"}}>▼ CSV Export</button>
                <button onClick={enableReminder} disabled={notifStatus==="denied"} style={{padding:"13px",background:notifStatus==="granted"?S.neonGlow:"transparent",border:`1px solid ${notifStatus==="granted"?S.neonBorder:S.border}`,borderRadius:10,fontSize:9,fontWeight:800,cursor:"pointer",color:notifStatus==="granted"?S.neon:S.muted,fontFamily:"inherit",letterSpacing:"0.1em",textTransform:"uppercase"}}>
                  {notifStatus==="granted" ? "◎ Aktiv" : "◎ Reminder"}
                </button>
              </div>
              {notifStatus==="denied" && <div style={{fontSize:9,color:S.danger,textAlign:"center",marginTop:8}}>Benachrichtigungen blockiert.</div>}
              {notifStatus==="granted" && <div style={{fontSize:9,color:S.success,textAlign:"center",marginTop:8}}>◎ Erinnerung aktiv</div>}
            </>}
          </div>
        )}

        {/* DENKEN */}
        {tab==="denken" && (
          <div style={{animation:"fadeUp 0.35s ease both"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {DENK_MODI.map(m => (
                <button key={m.id} onClick={() => {setDenkModus(m.id); setDenkResult(""); setDenkError("");}}
                  style={{
                    padding:"12px 6px",borderRadius:10,
                    border:`1px solid ${denkModus===m.id?S.neon:S.border}`,
                    background:denkModus===m.id?S.neonGlow:"transparent",
                    color:denkModus===m.id?S.neon:S.muted,
                    fontSize:8,fontWeight:800,cursor:"pointer",fontFamily:"inherit",
                    display:"flex",flexDirection:"column",alignItems:"center",gap:5,
                    letterSpacing:"0.1em",textTransform:"uppercase",
                    boxShadow:denkModus===m.id?`0 0 16px ${S.neonGlow}`:"none",
                    transition:"all 0.2s",
                  }}>
                  <span style={{fontSize:16}}>{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>

            <NeonCard glow={denkInput.length>0} style={{marginBottom:10}}>
              <textarea rows={6}
                placeholder={DENK_MODI.find(m=>m.id===denkModus)?.placeholder}
                value={denkInput}
                onChange={e=>{setDenkInput(e.target.value); setDenkResult("");}}
                style={{width:"100%",background:S.bgInput,borderRadius:8,padding:"10px 12px",fontSize:13,lineHeight:1.6,color:S.text}} />
            </NeonCard>

            {denkError && <ErrorBox msg={denkError} />}
            <GlowBtn onClick={submitDenken} disabled={!denkInput.trim()||denkLoading}>
              {denkLoading ? <Spinner /> : `${DENK_MODI.find(m=>m.id===denkModus)?.icon} Analysieren`}
            </GlowBtn>

            {denkResult && (
              <NeonCard glow style={{lineHeight:1.8,fontSize:13,marginTop:10,animation:"fadeUp 0.3s ease both"}}>
                <div dangerouslySetInnerHTML={{__html:mdHtml(denkResult)}} />
              </NeonCard>
            )}
          </div>
        )}
      </div>

      {/* TAB BAR */}
      <div style={{
        position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:430,
        background:S.bgCard,
        borderTop:`1px solid ${S.neonBorder}`,
        boxShadow:`0 -8px 32px ${S.neonGlow}`,
        display:"flex",
        paddingBottom:"env(safe-area-inset-bottom,0)",
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{flex:1,background:"none",border:"none",cursor:"pointer",padding:"12px 0 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <span style={{fontSize:16,color:tab===t.id?S.neon:S.muted,textShadow:tab===t.id?`0 0 10px ${S.neon}`:"none",transition:"all 0.2s"}}>{t.icon}</span>
            <span style={{fontSize:8,fontWeight:800,color:tab===t.id?S.neon:S.muted,letterSpacing:"0.1em",textTransform:"uppercase",transition:"all 0.2s"}}>{t.label}</span>
            {tab===t.id && <div style={{width:16,height:2,borderRadius:2,background:S.neon,boxShadow:`0 0 8px ${S.neon}`}} />}
          </button>
        ))}
      </div>
    </div>
  );
}
