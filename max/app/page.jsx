"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ─── Dynamic theme ────────────────────────────────────────────────────────────
function buildTheme(risk) {
  const base = {
    bg:"#080810", bgCard:"#0e0e1a", bgInput:"#12121f",
    neon:"#b44dff", neonDim:"#7b2dcc", neonGlow:"rgba(180,77,255,0.18)", neonBorder:"rgba(180,77,255,0.35)",
    cyan:"#00f5ff", text:"#f0eaff", muted:"#6b6485", border:"rgba(180,77,255,0.15)",
    danger:"#ff4d6d", success:"#00ff9d", morning:"#ff6b35", evening:"#b44dff", gold:"#ffd700",
    scanlineColor:"rgba(180,77,255,0.12)", glowColor:"#b44dff",
  };
  if (risk === "hoch")   return { ...base, neon:"#ff4d6d", neonDim:"#cc2244", neonGlow:"rgba(255,77,109,0.20)", neonBorder:"rgba(255,77,109,0.45)", border:"rgba(255,77,109,0.18)", scanlineColor:"rgba(255,77,109,0.14)", glowColor:"#ff4d6d", bgCard:"#100810" };
  if (risk === "mittel") return { ...base, neon:"#ffc107", neonDim:"#cc9900", neonGlow:"rgba(255,193,7,0.16)",  neonBorder:"rgba(255,193,7,0.40)",  border:"rgba(255,193,7,0.15)",  scanlineColor:"rgba(255,193,7,0.10)",  glowColor:"#ffc107", bgCard:"#0f0e09" };
  return base;
}

const RISK_META = {
  niedrig:{ bg:"rgba(0,255,157,0.08)",  text:"#00ff9d", dot:"#00ff9d", border:"rgba(0,255,157,0.3)" },
  mittel: { bg:"rgba(255,193,7,0.08)",  text:"#ffc107", dot:"#ffc107", border:"rgba(255,193,7,0.3)" },
  hoch:   { bg:"rgba(255,77,109,0.08)", text:"#ff4d6d", dot:"#ff4d6d", border:"rgba(255,77,109,0.3)" },
};

const DEFAULT_SUPPLEMENTS = {
  morning:[
    {id:"m1",name:"NAC",           dose:"600 mg",       effect:"Glutamat stabilisieren, Craving ↓"},
    {id:"m2",name:"Vitamin C",     dose:"500 mg",       effect:"Antioxidativ, NAC unterstützen"},
    {id:"m3",name:"Omega-3",       dose:"1000–1500 mg", effect:"Entzündungshemmend, Stimmung"},
    {id:"m4",name:"Kreatin",       dose:"5 g",          effect:"Energie, Nervensystem"},
    {id:"m5",name:"Vitamin B12",   dose:"1 Kapsel",     effect:"Energie, Nervensystem"},
    {id:"m6",name:"Vitamin D3+K2", dose:"1 Kapsel",     effect:"Stimmung, Immunsystem"},
    {id:"m7",name:"Zink",          dose:"25 mg",        effect:"Immunsystem, Neurotransmitter"},
    {id:"m8",name:"L-Theanin",     dose:"200 mg",       effect:"Angsthemmend, beruhigend"},
    {id:"m9",name:"Rhodiola",      dose:"200 mg",       effect:"Stressresistenz, Energie"},
    {id:"m10",name:"L-Tyrosin",    dose:"500 mg",       effect:"Dopamin, Fokus"},
  ],
  evening:[
    {id:"e1",name:"NAC",               dose:"600 mg",     effect:"Glutamat/Dopamin stabilisieren"},
    {id:"e2",name:"Glycin",            dose:"3 g",        effect:"Schlafqualität ↑"},
    {id:"e3",name:"Omega-3 Rest",      dose:"Rest",       effect:"Stimmung stabilisieren"},
    {id:"e4",name:"Magnesium",         dose:"200 mg",     effect:"Entspannung, Nervensystem"},
    {id:"e5",name:"Phosphatidylserin", dose:"100–150 mg", effect:"Cortisol ↓, Stressreduktion"},
  ],
};

// ─── KI-Persönlichkeitsmodi ───────────────────────────────────────────────────
const KI_MODI = [
  { id:"direkt",       label:"Direkt",       icon:"▸", desc:"Klar. Ohne Umschweife." },
  { id:"ruhig",        label:"Ruhig",        icon:"◌", desc:"Ruhig. Stabilisierend." },
  { id:"haerter",      label:"Härter",       icon:"⚡", desc:"Direkt. Kein Weichspülen." },
  { id:"therapeutisch",label:"Therapeutisch",icon:"◎", desc:"Reflektierend. Einfühlsam." },
];

const KI_MODUS_INSTRUCTIONS = {
  direkt:        "Sei direkt und klar. Keine Füllwörter. Auf den Punkt.",
  ruhig:         "Sei ruhig, stabil, beruhigend. Kein Druck. Klare Orientierung.",
  haerter:       "Sei direkt und konfrontativ. Kein Beschönigen. Realistisch bis auf die Knochen.",
  therapeutisch: "Sei einfühlsam und reflektierend. Stelle Verbindungen her. Keine Ratschläge ohne Einladung.",
};

// ─── AI Prompts ───────────────────────────────────────────────────────────────
function buildCheckinSystem(modus) {
  return `Du bist ein nüchternes, nicht-urtelendes Rückfall-Präventions-Tool.
${KI_MODUS_INSTRUCTIONS[modus] || KI_MODUS_INSTRUCTIONS.direkt}

Antworte IMMER exakt in diesem Format:

## Risiko: [niedrig / mittel / hoch]

**Was ich höre:**
[2–3 Sätze: Muster benennen, keine Floskeln]

**Jetzt sofort:**
[Eine einzige konkrete Handlung. 1 Satz.]

**Anerkennung:**
[Ein echter Satz. Kein Coaching-Speak.]

Keine Floskeln. Direkt.`;
}

function buildGreetingSystem(modus) {
  return `Du bist ein persönliches Recovery-Begleittool.
${KI_MODUS_INSTRUCTIONS[modus] || KI_MODUS_INSTRUCTIONS.direkt}
Generiere eine adaptive Tagesbegrüßung — kurz, persönlich, konkret.

Antworte NUR in diesem Format (kein Markdown, keine Überschriften):
[Vorname], [eine direkte Aussage zum Tag basierend auf den Daten. Max. 12 Wörter.]

Beispiele:
- "Max, heute Fokus auf Stabilität — Drang war gestern hoch."
- "Max, guter Trend — halte das Momentum."
- "Max, Schlaf niedrig erkannt — achtsam bleiben heute."
Kein Coaching. Kein Lob. Nur Orientierung.`;
}

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

function buildMorgenSystem(modus) {
  return `Du bist ein persönliches Morgen-Protokoll-Tool für Recovery.
${KI_MODUS_INSTRUCTIONS[modus] || KI_MODUS_INSTRUCTIONS.direkt}
Du bekommst Name, Tagesstatus und optionalen Fokus.
Antworte NUR in diesem Format:

## Morgen-Protokoll

**Fokus heute:**
[Eine konkrete Aussage zum Tagesziel. 1 Satz. Keine Motivationsfloskeln.]

**Risiko-Check:**
[Basierend auf den Daten: Was könnte heute schwierig werden? 1 Satz.]

**Eine Sache:**
[Die eine konkrete Handlung für heute. Nicht allgemein.]

Kein Coaching. Direkt.`;
}

function buildDebriefSystem(modus) {
  return `Du bist ein persönliches Abend-Debrief-Tool für Recovery.
${KI_MODUS_INSTRUCTIONS[modus] || KI_MODUS_INSTRUCTIONS.direkt}
Du bekommst Name, Tagesverlauf und was der Nutzer eingetragen hat.
Antworte NUR in diesem Format:

## Tages-Debrief

**Was heute war:**
[Ehrliche Einordnung des Tages in 1–2 Sätzen. Keine Bewertung.]

**Stärkster Moment:**
[Den einen Moment oder die eine Handlung benennen, die Stärke gezeigt hat. 1 Satz.]

**Für morgen:**
[Eine einzige Sache, die morgen anders oder besser sein kann. 1 Satz.]

Kein Coaching. Kein Lob. Nur Klarheit.`;
}

const SUPP_INFO = {
  NAC:           { wirkung:"N-Acetylcystein erhöht Glutathion und stabilisiert Glutamat-Signalwege. Reduziert Craving durch Normalisierung des Nucleus-accumbens-Glutamats.", timing:"Morgens mit Essen, Abends vor Schlaf. Nicht auf leeren Magen.", quelle:"Studienlage: mehrere RCTs bei Sucht und OCD" },
  "Vitamin C":   { wirkung:"Antioxidans, schützt Neuronen vor oxidativem Stress durch Suchtmittel. Unterstützt NAC-Wirkung durch Glutathion-Regeneration.", timing:"Morgens mit NAC gleichzeitig.", quelle:"Synergie mit NAC gut dokumentiert" },
  "Omega-3":     { wirkung:"EPA/DHA verbessern synaptische Plastizität, reduzieren Neuroinflammation, stabilisieren Stimmung durch Einfluss auf Serotonin und Dopamin.", timing:"Morgens + Abends mit fetthaltiger Mahlzeit für beste Absorption.", quelle:"Meta-Analysen: positive Wirkung bei Depression und Impulsivität" },
  Kreatin:       { wirkung:"Erhöht Phosphokreatin im Gehirn, verbessert Energieversorgung von Neuronen. Wirkt besonders bei kognitiver Erschöpfung und grauem Wetter.", timing:"Morgens, timing-unabhängig. Mit Wasser.", quelle:"RCTs zeigen kognitive Verbesserung, besonders bei Schlafmangel" },
  "Vitamin B12": { wirkung:"Essentiell für Myelinisierung und Neurotransmitter-Synthese. Sucht und Alkohol depleting B12 stark. Energie und Nervenfunktion.", timing:"Morgens, am besten sublingual für bessere Absorption.", quelle:"Depletion bei Alkohol/Sucht gut belegt" },
  "Vitamin D3+K2":{ wirkung:"D3 reguliert Serotonin-Synthese, beeinflusst über 1000 Gene. K2 leitet Calcium richtig ein. Niedrige D3-Spiegel korrelieren stark mit Depression.", timing:"Morgens mit fetthaltiger Mahlzeit. K2 verhindert Arterienverkalkung.", quelle:"D3-Mangel bei 70% der Bevölkerung in Deutschland" },
  Zink:          { wirkung:"Cofaktor für über 300 Enzyme. Moduliert NMDA-Rezeptoren (Glutamat). Sucht depleting Zink stark — niedrige Spiegel erhöhen Impulsivität.", timing:"Morgens mit Essen. Nicht zusammen mit Kupfer-reichen Mahlzeiten.", quelle:"Zink-Depletion bei Sucht mehrfach belegt" },
  "L-Theanin":   { wirkung:"Erhöht GABA, Serotonin, Dopamin. Reduziert Angst ohne Sedierung. Synergie mit Koffein: Fokus ohne Jitteriness.", timing:"Morgens. Bei Angst auch tagsüber zusätzlich.", quelle:"Gut replizierte Studien bei Angst und Fokus" },
  Rhodiola:      { wirkung:"Adaptogen — normalisiert Stressachse (HPA-Achse). Erhöht Stressresistenz, reduziert Erschöpfung, verbessert Stimmung via Serotonin/Dopamin.", timing:"Morgens, nicht abends (aktivierend). Nicht bei Bipolar ohne Absprache.", quelle:"Mehrere RCTs bei Burnout und Erschöpfung" },
  "L-Tyrosin":   { wirkung:"Dopamin-Vorläufer. Verbessert Fokus und Motivation besonders unter Stress und bei niedrigem Dopamin-Baseline (typisch in früher Recovery).", timing:"Morgens auf leeren Magen oder 30 Min vor Essen. Nicht abends.", quelle:"Wirkung bei Stress und Dopamin-Depletion belegt" },
  Glycin:        { wirkung:"Hemmender Neurotransmitter. Verbessert Schlafqualität und -tiefe, reduziert Körpertemperatur zum Schlafen. Sicher in hohen Dosen.", timing:"Abends 30–60 Min vor Schlaf.", quelle:"RCTs zeigen verbesserte Schlafqualität und morgendliche Wachheit" },
  "Omega-3 Rest":{ wirkung:"Zweite Dosis für optimalen EPA/DHA-Spiegel. Abendliche Dosis kann Schlaf durch antiinflammatorische Wirkung verbessern.", timing:"Abends zum Abendbrot mit Fett.", quelle:"Aufteilung Morgen/Abend für bessere Verträglichkeit" },
  Magnesium:     { wirkung:"NMDA-Rezeptor-Antagonist. Entspannung, Nervenfunktion, besserer Schlaf. Depletion durch Stress und Alkohol. Glycinat-Form am besten verträglich.", timing:"Abends, kann schläfrig machen. Glycinat oder Malat bevorzugen.", quelle:"Magnesium-Mangel bei 30–40% der westlichen Bevölkerung" },
  Phosphatidylserin:{ wirkung:"Phospholipid der Zellmembran. Senkt Cortisol, verbessert kognitive Funktion unter Stress. Unterstützt HPA-Achsen-Regulation.", timing:"Abends mit Essen. Nicht morgens (kann Cortisol-Rhythmus stören).", quelle:"RCTs zeigen Cortisol-Reduktion nach körperlichem und mentalem Stress" },
};

const RELAPSE_SYSTEM = `Du bist ein nicht-urtelendes Relapse-Analyse-Tool. Kein Vorwurf, keine Moral.
Antworte NUR in diesem Format:

## Rückfall analysiert

**Muster:**
[Was hat sich wiederholt? Konkret benennen — ohne Wertung. 2–3 Sätze.]

**Kritischer Moment:**
[Den einen Punkt benennen, an dem die Entscheidung fiel. 1 Satz.]

**Was du gelernt hast:**
- [Lernpunkt 1]
- [Lernpunkt 2]

**Konkrete Vorbereitung für nächste Mal:**
[Eine einzige Handlung. 1 Satz.]

Kein Coaching-Speak. Keine Ermutigung. Nur Klarheit.`;

const DENK_MODI = [
  { id:"analyse",     label:"Analyse",  icon:"◈",
    system:`Du bist ein präzises Analyse-Tool.\n## Kernaussage\n[1 Satz]\n**Wichtigste Punkte:**\n- [Punkt 1]\n- [Punkt 2]\n- [Punkt 3]\n**Widersprüche / Lücken:** [1–2 Sätze]\nKein Fülltext.`,
    placeholder:"Text, Artikel, Recherche-Ergebnis hier einfügen…" },
  { id:"entscheidung",label:"Entscheid",icon:"⊕",
    system:`Du bist ein nüchternes Entscheidungs-Tool.\n## Entscheidung: [kurz benennen]\n**Dafür:**\n- [Argument 1]\n- [Argument 2]\n**Dagegen:**\n- [Argument 1]\n- [Argument 2]\n**Empfehlung:**\n[1 klarer Satz.]\nDirekt. Kein Coaching.`,
    placeholder:"Welche Entscheidung steht an?" },
  { id:"impuls",      label:"Impuls",   icon:"⚡",
    system:`Du bist ein Sofort-Interventions-Tool.\n## Stopp.\n**Was gerade passiert:** [1 Satz]\n**Jetzt:**\n[Eine einzige Handlung. 1 Satz.]\n**Danach:**\n[1 Satz]\nKein Coaching.`,
    placeholder:"Was ist gerade los? Einfach rausschreiben…" },
  { id:"reframe",     label:"Reframe",  icon:"⟳",
    system:`Du bist ein kognitives Reframing-Tool. Kein Toxic Positivity.\n## Gedanke analysiert\n**Was der Gedanke tut:**\n[Kognitives Muster. 1–2 Sätze.]\n**Was stimmt daran:**\n[Was ist real? Kein Kleinreden.]\n**Was übertrieben ist:**\n[Wo geht der Gedanke zu weit?]\n**Reframe:**\n[Realistische Formulierung. Nicht positiver — genauer.]\n**Eine Frage zum Weiterdenken:**\n[Offene Frage.]\nNur Präzision.`,
    placeholder:"Welcher Gedanke dreht sich im Kreis?" },
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

const haptic = {
  light:  () => { try { navigator.vibrate?.(10); } catch {} },
  medium: () => { try { navigator.vibrate?.(25); } catch {} },
  heavy:  () => { try { navigator.vibrate?.([40,20,40]); } catch {} },
  error:  () => { try { navigator.vibrate?.([60,30,60,30,60]); } catch {} },
  success:() => { try { navigator.vibrate?.([20,10,40]); } catch {} },
  tick:   () => { try { navigator.vibrate?.(6); } catch {} },
};

function parseRisk(t) { return t.match(/##\s*Risiko:\s*(niedrig|mittel|hoch)/i)?.[1]?.toLowerCase() ?? null; }

function mdHtml(t, neonColor="#b44dff") {
  return t
    .replace(/^## (.+)$/gm, `<h3 style="font-size:13px;font-weight:800;margin:14px 0 8px;color:${neonColor};letter-spacing:0.06em;text-transform:uppercase">$1</h3>`)
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:#f0eaff">$1</strong>`)
    .replace(/^- (.+)$/gm, `<div style="padding:4px 0 4px 12px;border-left:2px solid ${neonColor}55;margin:4px 0;color:#c0b8d4">$1</div>`)
    .replace(/\n/g, "<br>");
}

function fmtDate(iso) { return new Date(iso).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}); }
function fmtTime(iso) { return new Date(iso).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}); }

// ─── Milestones ───────────────────────────────────────────────────────────────
const MILESTONES = [
  { days:1,  label:"1 Tag",   msg:(n)=>`${n}, der erste Tag ist der schwerste. Du hast ihn.` },
  { days:3,  label:"3 Tage",  msg:(n)=>`${n}, 3 Tage. Das Nervensystem beginnt sich zu stabilisieren.` },
  { days:7,  label:"7 Tage",  msg:(n)=>`${n}, eine Woche. Dopamin-Rezeptoren erholen sich bereits.` },
  { days:14, label:"14 Tage", msg:(n)=>`${n}, zwei Wochen. Neue neuronale Muster entstehen.` },
  { days:30, label:"30 Tage", msg:(n)=>`${n}, 30 Tage. Das ist keine Willenskraft — das ist ein neues System.` },
  { days:60, label:"60 Tage", msg:(n)=>`${n}, 60 Tage. Was du aufgebaut hast, gehört dir.` },
  { days:90, label:"90 Tage", msg:(n)=>`${n}, 90 Tage. Die Wissenschaft sagt: nachhaltige Veränderung.` },
  { days:180,label:"180 Tage",msg:(n)=>`${n}, ein halbes Jahr. Das hier ist wer du bist.` },
  { days:365,label:"1 Jahr",  msg:(n)=>`${n}, ein Jahr. Jeder Tag war eine Entscheidung.` },
];

function calcSoberDays(checkins, relapses) {
  // Find last relapse date, count sober days since
  if (!relapses.length && !checkins.length) return 0;
  const lastRelapse = relapses.length
    ? new Date(relapses[relapses.length-1].date)
    : null;
  const firstCheckin = checkins.length ? new Date(checkins[0].date) : new Date();
  const start = lastRelapse && lastRelapse > firstCheckin ? lastRelapse : firstCheckin;
  const now = new Date();
  return Math.max(0, Math.floor((now - start) / (1000*60*60*24)));
}

function getNextMilestone(days) {
  return MILESTONES.find(m => m.days > days) || null;
}

function getReachedMilestones(days) {
  return MILESTONES.filter(m => m.days <= days);
}

// ─── Adaptive greeting ────────────────────────────────────────────────────────
function buildGreetingContext(name, checkins, relapses, doneSupps) {
  const soberDays = calcSoberDays(checkins, relapses);
  const last = checkins.length ? checkins[checkins.length-1] : null;
  const last3 = checkins.slice(-3);
  const avgUrge = last3.length ? (last3.reduce((s,c)=>s+c.urge,0)/last3.length).toFixed(1) : null;
  const trend = last3.length >= 2
    ? (last3[last3.length-1].urge > last3[0].urge ? "steigend" : "sinkend")
    : "unbekannt";

  return JSON.stringify({
    name,
    soberDays,
    letzterCheckin: last ? { mood: last.mood, urge: last.urge, risk: last.risk } : null,
    drangTrend: trend,
    avgDrang3Tage: avgUrge,
    supplementsHeute: `${doneSupps}/${totalSupps}`,
  });
}

// ─── UI Atoms ─────────────────────────────────────────────────────────────────
function NeonCard({children,style,glow,S}) {
  return <div style={{background:S.bgCard,borderRadius:14,padding:"16px 18px",marginBottom:10,border:`1px solid ${glow?S.neonBorder:S.border}`,boxShadow:glow?`0 0 28px ${S.neonGlow},inset 0 0 20px ${S.neonGlow}`:"none",transition:"all 0.6s",...style}}>{children}</div>;
}

function GlowBtn({onClick,disabled,children,color,S:theme}) {
  const S=theme; const c=color||S.neon; const [p,setP]=useState(false);
  return <button onPointerDown={()=>{setP(true);haptic.medium();}} onPointerUp={()=>setP(false)} onPointerLeave={()=>setP(false)} onClick={onClick} disabled={disabled}
    style={{width:"100%",padding:"15px",border:`1px solid ${disabled?S.muted:c}`,background:p?`${c}18`:"transparent",color:disabled?S.muted:c,borderRadius:12,fontSize:12,fontWeight:800,fontFamily:"inherit",cursor:disabled?"default":"pointer",letterSpacing:"0.12em",textTransform:"uppercase",boxShadow:disabled?"none":`0 0 20px ${c}33`,transform:p?"scale(0.98)":"scale(1)",transition:"all 0.15s",marginBottom:4}}>
    {children}
  </button>;
}

function Spinner({S}) { return <span style={{display:"inline-block",width:14,height:14,border:`2px solid ${S.neonBorder}`,borderTopColor:S.neon,borderRadius:"50%",animation:"spin 0.6s linear infinite"}}/>; }

function SliderField({label,min,max,low,high,value,onChange,color,S:theme}) {
  const S=theme; const col=color||S.neon;
  return <div style={{marginBottom:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <span style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase"}}>{label}</span>
      <span style={{fontSize:22,fontWeight:800,fontFamily:"monospace",color:col,textShadow:`0 0 12px ${col}`,transition:"color 0.4s"}}>{value}</span>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:9,color:S.muted,width:48,flexShrink:0}}>{low}</span>
      <input type="range" min={min} max={max} value={value} onChange={e=>{onChange(Number(e.target.value));haptic.tick();}}
        style={{flex:1,appearance:"none",WebkitAppearance:"none",height:3,borderRadius:3,background:`linear-gradient(90deg,${col} ${(value-min)/(max-min)*100}%,${S.bgInput} 0%)`,outline:"none",cursor:"pointer"}}/>
      <span style={{fontSize:9,color:S.muted,width:48,flexShrink:0,textAlign:"right"}}>{high}</span>
    </div>
  </div>;
}

function SuppItem({item,checked,onToggle,accent,S}) {
  const [flash,setFlash]=useState(false);
  return <div onClick={()=>{haptic.light();setFlash(true);setTimeout(()=>setFlash(false),300);onToggle();}}
    style={{display:"flex",alignItems:"center",gap:14,padding:"14px 0",borderBottom:`1px solid ${S.border}`,cursor:"pointer",background:flash?`${accent}08`:"transparent",transition:"background 0.3s"}}>
    <div style={{width:22,height:22,borderRadius:6,flexShrink:0,border:`1.5px solid ${checked?accent:S.muted}`,background:checked?accent+"22":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",boxShadow:checked?`0 0 10px ${accent}66`:"none"}}>
      {checked&&<span style={{color:accent,fontSize:11,fontWeight:900}}>✓</span>}
    </div>
    <div style={{flex:1}}>
      <div style={{fontSize:14,fontWeight:700,color:checked?S.muted:S.text,textDecoration:checked?"line-through":"none",transition:"all 0.2s"}}>{item.name}</div>
      <div style={{fontSize:11,color:S.muted,marginTop:2}}>{item.effect}</div>
    </div>
    <div style={{fontSize:11,fontFamily:"monospace",color:checked?accent:S.muted}}>{item.dose}</div>
  </div>;
}

function ErrorBox({msg,S}) { return <div style={{background:"rgba(255,77,109,0.08)",color:S.danger,borderRadius:10,padding:"12px 14px",fontSize:12,marginBottom:10,border:"1px solid rgba(255,77,109,0.3)"}}>{msg}</div>; }

function RiskOverlay({risk}) {
  if(risk!=="hoch") return null;
  return <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:1,background:"radial-gradient(ellipse at 50% 0%,rgba(255,77,109,0.06) 0%,transparent 70%)",animation:"riskPulse 3s ease-in-out infinite"}}/>;
}

function TabBar({tab,setTab,risk,hasRelapse,S}) {
  return <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:S.bgCard,borderTop:`1px solid ${S.neonBorder}`,boxShadow:`0 -8px 32px ${S.neonGlow}`,display:"flex",paddingBottom:"env(safe-area-inset-bottom,0)",transition:"all 0.6s"}}>
    {TABS.map(t=>(
      <button key={t.id} onPointerDown={()=>haptic.light()} onClick={()=>setTab(t.id)}
        style={{flex:1,background:"none",border:"none",cursor:"pointer",padding:"12px 0 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative"}}>
        {t.id==="checkin"&&risk&&RISK_META[risk]&&<div style={{position:"absolute",top:8,right:"50%",transform:"translateX(10px)",width:6,height:6,borderRadius:"50%",background:RISK_META[risk].dot,boxShadow:`0 0 6px ${RISK_META[risk].dot}`,animation:"pulseDot 2s ease-in-out infinite"}}/>}
        {t.id==="checkin"&&hasRelapse&&<div style={{position:"absolute",top:6,left:"50%",transform:"translateX(-14px)",width:5,height:5,borderRadius:"50%",background:S.danger,boxShadow:`0 0 5px ${S.danger}`}}/>}
        <span style={{fontSize:16,color:tab===t.id?S.neon:S.muted,textShadow:tab===t.id?`0 0 10px ${S.neon}`:"none",transition:"all 0.3s"}}>{t.icon}</span>
        <span style={{fontSize:8,fontWeight:800,color:tab===t.id?S.neon:S.muted,letterSpacing:"0.1em",textTransform:"uppercase",transition:"all 0.3s"}}>{t.label}</span>
        {tab===t.id&&<div style={{width:16,height:2,borderRadius:2,background:S.neon,boxShadow:`0 0 8px ${S.neon}`,transition:"all 0.4s"}}/>}
      </button>
    ))}
  </div>;
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
function Onboarding({onDone}) {
  const [step, setStep]       = useState(0);
  const [name, setName]       = useState("");
  const [identity, setIdentity] = useState("");
  const [kiModus, setKiModus] = useState("direkt");
  const [soberStart, setSoberStart] = useState("");

  const IDENTITY_SUGGESTIONS = [
    "Ich bin stabil.",
    "Ich baue Kontrolle auf.",
    "Ich wähle Klarheit.",
    "Ich bin stärker als der Drang.",
    "Ich entscheide mich täglich neu.",
  ];

  function finish() {
    ls.set("profile", JSON.stringify({ name: name.trim(), identity, kiModus, soberStart: soberStart || new Date().toISOString() }));
    onDone();
  }

  const steps = [
    // Step 0: Name
    <div key="name" style={{animation:"fadeUp 0.4s ease both"}}>
      <div style={{fontSize:9,color:"#6b6485",letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:20}}>01 / 04</div>
      <div style={{fontSize:24,fontWeight:900,color:"#f0eaff",letterSpacing:"0.04em",marginBottom:8}}>Wie heißt du?</div>
      <div style={{fontSize:12,color:"#6b6485",marginBottom:32,lineHeight:1.7}}>Diese App spricht dich direkt an.<br/>Kein Account. Nur lokal.</div>
      <input value={name} onChange={e=>setName(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&name.trim()&&(haptic.medium(),setStep(1))}
        placeholder="Vorname…" autoFocus
        style={{width:"100%",background:"#12121f",border:"1px solid rgba(180,77,255,0.35)",borderRadius:10,padding:"14px 16px",fontSize:18,fontWeight:700,color:"#f0eaff",fontFamily:"inherit",outline:"none",marginBottom:16,letterSpacing:"0.02em"}}/>
      <button onPointerDown={()=>haptic.medium()} onClick={()=>name.trim()&&setStep(1)} disabled={!name.trim()}
        style={{width:"100%",padding:"15px",border:`1px solid ${name.trim()?"#b44dff":"#6b6485"}`,background:"transparent",color:name.trim()?"#b44dff":"#6b6485",borderRadius:12,fontSize:12,fontWeight:800,fontFamily:"inherit",cursor:name.trim()?"pointer":"default",letterSpacing:"0.12em",textTransform:"uppercase",boxShadow:name.trim()?"0 0 20px rgba(180,77,255,0.2)":"none",transition:"all 0.2s"}}>
        Weiter →
      </button>
    </div>,

    // Step 1: Identity
    <div key="identity" style={{animation:"fadeUp 0.4s ease both"}}>
      <div style={{fontSize:9,color:"#6b6485",letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:20}}>02 / 04</div>
      <div style={{fontSize:24,fontWeight:900,color:"#f0eaff",letterSpacing:"0.04em",marginBottom:8}}>Deine Recovery-Identität</div>
      <div style={{fontSize:12,color:"#6b6485",marginBottom:24,lineHeight:1.7}}>Ein Satz, der beschreibt, wer du gerade wirst.<br/>Erscheint wenn du ihn brauchst.</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
        {IDENTITY_SUGGESTIONS.map(s=>(
          <button key={s} onPointerDown={()=>haptic.light()} onClick={()=>setIdentity(s)}
            style={{padding:"12px 16px",borderRadius:10,border:`1px solid ${identity===s?"#b44dff":"rgba(180,77,255,0.15)"}`,background:identity===s?"rgba(180,77,255,0.1)":"transparent",color:identity===s?"#b44dff":"#6b6485",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all 0.15s"}}>
            {s}
          </button>
        ))}
      </div>
      <input value={identity} onChange={e=>setIdentity(e.target.value)} placeholder="Oder eigenen Satz schreiben…"
        style={{width:"100%",background:"#12121f",border:"1px solid rgba(180,77,255,0.25)",borderRadius:10,padding:"12px 16px",fontSize:13,color:"#f0eaff",fontFamily:"inherit",outline:"none",marginBottom:16}}/>
      <button onPointerDown={()=>haptic.medium()} onClick={()=>identity.trim()&&setStep(2)} disabled={!identity.trim()}
        style={{width:"100%",padding:"15px",border:`1px solid ${identity.trim()?"#b44dff":"#6b6485"}`,background:"transparent",color:identity.trim()?"#b44dff":"#6b6485",borderRadius:12,fontSize:12,fontWeight:800,fontFamily:"inherit",cursor:identity.trim()?"pointer":"default",letterSpacing:"0.12em",textTransform:"uppercase",transition:"all 0.2s"}}>
        Weiter →
      </button>
      <button onPointerDown={()=>haptic.light()} onClick={()=>setStep(2)} style={{width:"100%",padding:"10px",marginTop:6,background:"none",border:"none",color:"#6b6485",fontSize:10,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.1em"}}>
        Überspringen
      </button>
    </div>,

    // Step 2: KI-Modus
    <div key="modus" style={{animation:"fadeUp 0.4s ease both"}}>
      <div style={{fontSize:9,color:"#6b6485",letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:20}}>03 / 04</div>
      <div style={{fontSize:24,fontWeight:900,color:"#f0eaff",letterSpacing:"0.04em",marginBottom:8}}>Wie soll die KI mit dir sprechen?</div>
      <div style={{fontSize:12,color:"#6b6485",marginBottom:24,lineHeight:1.7}}>Jederzeit in den Einstellungen änderbar.</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
        {KI_MODI.map(m=>(
          <button key={m.id} onPointerDown={()=>haptic.light()} onClick={()=>setKiModus(m.id)}
            style={{padding:"14px 16px",borderRadius:12,border:`1px solid ${kiModus===m.id?"#b44dff":"rgba(180,77,255,0.15)"}`,background:kiModus===m.id?"rgba(180,77,255,0.1)":"transparent",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:12,textAlign:"left",transition:"all 0.15s"}}>
            <span style={{fontSize:20,color:kiModus===m.id?"#b44dff":"#6b6485",width:24,flexShrink:0}}>{m.icon}</span>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:kiModus===m.id?"#b44dff":"#f0eaff",marginBottom:2}}>{m.label}</div>
              <div style={{fontSize:10,color:"#6b6485"}}>{m.desc}</div>
            </div>
          </button>
        ))}
      </div>
      <button onPointerDown={()=>haptic.medium()} onClick={()=>setStep(3)}
        style={{width:"100%",padding:"15px",border:"1px solid #b44dff",background:"transparent",color:"#b44dff",borderRadius:12,fontSize:12,fontWeight:800,fontFamily:"inherit",cursor:"pointer",letterSpacing:"0.12em",textTransform:"uppercase",boxShadow:"0 0 20px rgba(180,77,255,0.2)"}}>
        Weiter →
      </button>
    </div>,

    // Step 3: Sober start date
    <div key="sober" style={{animation:"fadeUp 0.4s ease both"}}>
      <div style={{fontSize:9,color:"#6b6485",letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:20}}>04 / 04</div>
      <div style={{fontSize:24,fontWeight:900,color:"#f0eaff",letterSpacing:"0.04em",marginBottom:8}}>Seit wann bist du nüchtern?</div>
      <div style={{fontSize:12,color:"#6b6485",marginBottom:24,lineHeight:1.7}}>Für Milestones und Streaks.<br/>Optional — du kannst es jederzeit ändern.</div>
      <input type="date" value={soberStart ? soberStart.split("T")[0] : ""} onChange={e=>setSoberStart(new Date(e.target.value).toISOString())}
        style={{width:"100%",background:"#12121f",border:"1px solid rgba(180,77,255,0.35)",borderRadius:10,padding:"14px 16px",fontSize:14,fontFamily:"monospace",fontWeight:800,color:"#b44dff",outline:"none",marginBottom:20,colorScheme:"dark"}}/>
      <button onPointerDown={()=>haptic.success()} onClick={finish}
        style={{width:"100%",padding:"18px",border:"1px solid #b44dff",background:"rgba(180,77,255,0.1)",color:"#b44dff",borderRadius:12,fontSize:13,fontWeight:900,fontFamily:"inherit",cursor:"pointer",letterSpacing:"0.12em",textTransform:"uppercase",boxShadow:"0 0 30px rgba(180,77,255,0.25)"}}>
        Starten →
      </button>
      <button onPointerDown={()=>haptic.light()} onClick={finish} style={{width:"100%",padding:"10px",marginTop:6,background:"none",border:"none",color:"#6b6485",fontSize:10,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.1em"}}>
        Überspringen
      </button>
    </div>,
  ];

  return (
    <div style={{minHeight:"100vh",background:"#080810",fontFamily:"'SF Mono','Fira Code',monospace",color:"#f0eaff",maxWidth:430,margin:"0 auto",display:"flex",flexDirection:"column",justifyContent:"center",padding:"40px 24px"}}>
      <style>{`*{box-sizing:border-box} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}} input{font-family:inherit}`}</style>
      <div style={{marginBottom:40}}>
        <div style={{fontSize:11,color:"rgba(180,77,255,0.6)",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:6}}>BALANX</div>
        <div style={{width:40,height:2,background:"#b44dff",borderRadius:2,boxShadow:"0 0 10px #b44dff"}}/>
      </div>
      {steps[step]}
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function SettingsPanel({profile,onSave,onClose,S}) {
  const [name,setName]         = useState(profile.name||"");
  const [identity,setIdentity] = useState(profile.identity||"");
  const [kiModus,setKiModus]   = useState(profile.kiModus||"direkt");

  function save() {
    haptic.success();
    onSave({...profile,name:name.trim(),identity,kiModus});
    onClose();
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(8,8,16,0.95)",backdropFilter:"blur(8px)",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:430,background:S.bgCard,border:`1px solid ${S.neonBorder}`,borderRadius:"20px 20px 0 0",padding:"24px 16px 32px",maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <span style={{fontSize:12,fontWeight:800,color:S.neon,letterSpacing:"0.1em",textTransform:"uppercase"}}>Einstellungen</span>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${S.border}`,borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer",color:S.muted,fontFamily:"inherit"}}>×</button>
        </div>

        {/* Name */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:9,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Name</div>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Vorname"
            style={{width:"100%",background:S.bgInput,border:`1px solid ${S.border}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:S.text,fontFamily:"inherit",outline:"none"}}/>
        </div>

        {/* Identity */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:9,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Recovery-Identität</div>
          <input value={identity} onChange={e=>setIdentity(e.target.value)} placeholder="Ich bin…"
            style={{width:"100%",background:S.bgInput,border:`1px solid ${S.border}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:S.text,fontFamily:"inherit",outline:"none"}}/>
        </div>

        {/* KI-Modus */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:9,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>KI-Gesprächsstil</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {KI_MODI.map(m=>(
              <button key={m.id} onPointerDown={()=>haptic.light()} onClick={()=>setKiModus(m.id)}
                style={{padding:"10px",borderRadius:10,border:`1px solid ${kiModus===m.id?S.neon:S.border}`,background:kiModus===m.id?S.neonGlow:"transparent",color:kiModus===m.id?S.neon:S.muted,fontSize:9,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.15s"}}>
                <span style={{fontSize:14}}>{m.icon}</span>{m.label}
              </button>
            ))}
          </div>
        </div>

        <GlowBtn onClick={save} S={S}>Speichern</GlowBtn>
      </div>
    </div>
  );
}

// ─── Adaptive Greeting ────────────────────────────────────────────────────────
function AdaptiveGreeting({profile,checkins,relapses,doneSupps,callClaude,S}) {
  const [greeting,setGreeting] = useState(()=>{
    const cached=ls.get("greeting_cache","null");
    if(cached==="null") return null;
    try{const c=JSON.parse(cached);if(c.day===new Date().toDateString())return c.text;}catch{}
    return null;
  });
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    if(!greeting&&checkins.length>0&&profile.name) loadGreeting();
  },[checkins.length,profile.name]);

  async function loadGreeting() {
    if(loading||!profile.name) return;
    setLoading(true);
    try{
      const ctx=buildGreetingContext(profile.name,checkins,relapses,doneSupps);
      const txt=await callClaude(buildGreetingSystem(profile.kiModus||"direkt"),ctx);
      const clean=txt.replace(/^"|"$/g,"").trim();
      setGreeting(clean);
      ls.set("greeting_cache",JSON.stringify({day:new Date().toDateString(),text:clean}));
    }catch{}
    setLoading(false);
  }

  if(!profile.name) return null;

  // Static fallback greeting based on time of day
  const hour=new Date().getHours();
  const timeGreet = hour<12?"Guten Morgen":hour<18?"Guten Tag":"Guten Abend";
  const display = greeting || `${timeGreet}, ${profile.name}.`;

  return (
    <div style={{marginBottom:20,animation:"fadeUp 0.5s ease both",animationDelay:"0.1s"}}>
      <div style={{fontSize:14,fontWeight:700,color:S.text,lineHeight:1.6,letterSpacing:"0.01em"}}>
        {loading ? (
          <span style={{color:S.muted,fontSize:11,animation:"pulse 1.5s ease infinite"}}>…</span>
        ) : display}
      </div>
      {profile.identity&&(
        <div style={{fontSize:10,color:S.neon,marginTop:6,opacity:0.8,fontStyle:"italic",letterSpacing:"0.04em"}}>
          „{profile.identity}"
        </div>
      )}
    </div>
  );
}

// ─── Milestone Card ───────────────────────────────────────────────────────────
function MilestoneCard({soberDays,name,S}) {
  const reached   = getReachedMilestones(soberDays);
  const next      = getNextMilestone(soberDays);
  const latest    = reached[reached.length-1];
  const [show,setShow] = useState(false);

  if(!soberDays) return null;

  const pct = next ? Math.min((soberDays/next.days)*100,100) : 100;
  const r=28, circ=2*Math.PI*r;

  return (
    <NeonCard S={S} glow style={{marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        {/* Ring */}
        <div style={{position:"relative",width:70,height:70,flexShrink:0}}>
          <svg width="70" height="70" style={{transform:"rotate(-90deg)"}}>
            <circle cx="35" cy="35" r={r} fill="none" stroke={S.border} strokeWidth="3"/>
            <circle cx="35" cy="35" r={r} fill="none" stroke={S.success} strokeWidth="3"
              strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)}
              style={{transition:"stroke-dashoffset 1s ease",filter:`drop-shadow(0 0 4px ${S.success})`}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:18,fontWeight:900,fontFamily:"monospace",color:S.success,textShadow:`0 0 10px ${S.success}`,lineHeight:1}}>{soberDays}</span>
            <span style={{fontSize:7,color:S.success,letterSpacing:"0.1em",textTransform:"uppercase"}}>Tage</span>
          </div>
        </div>
        {/* Info */}
        <div style={{flex:1}}>
          {latest&&<div style={{fontSize:10,fontWeight:800,color:S.success,marginBottom:3,letterSpacing:"0.05em"}}>✓ {latest.label} erreicht</div>}
          {next&&<div style={{fontSize:10,color:S.muted,marginBottom:8}}>Nächstes Ziel: <span style={{color:S.text}}>{next.label}</span> ({next.days-soberDays} Tage)</div>}
          <div style={{height:2,background:S.bgInput,borderRadius:2}}>
            <div style={{height:"100%",borderRadius:2,background:S.success,width:`${pct}%`,boxShadow:`0 0 6px ${S.success}`,transition:"width 1s ease"}}/>
          </div>
        </div>
        {/* Expand */}
        <button onPointerDown={()=>haptic.light()} onClick={()=>setShow(s=>!s)}
          style={{background:"transparent",border:`1px solid ${S.border}`,borderRadius:6,padding:"4px 8px",fontSize:9,cursor:"pointer",color:S.muted,fontFamily:"inherit"}}>
          {show?"▲":"▼"}
        </button>
      </div>

      {/* Milestone message */}
      {latest&&(
        <div style={{marginTop:12,padding:"10px 14px",background:`${S.success}09`,border:`1px solid ${S.success}22`,borderRadius:10,fontSize:11,color:S.text,lineHeight:1.7,fontStyle:"italic"}}>
          „{latest.msg(name)}"
        </div>
      )}

      {/* All milestones */}
      {show&&(
        <div style={{marginTop:12,borderTop:`1px solid ${S.border}`,paddingTop:12}}>
          <div style={{fontSize:8,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Alle Milestones</div>
          {MILESTONES.map(m=>{
            const done=soberDays>=m.days;
            return <div key={m.days} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0"}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:done?S.success:S.border,flexShrink:0,boxShadow:done?`0 0 5px ${S.success}`:"none"}}/>
              <span style={{fontSize:10,color:done?S.success:S.muted,fontWeight:done?700:400}}>{m.label}</span>
              {done&&<span style={{fontSize:8,color:S.muted,marginLeft:"auto"}}>✓</span>}
              {!done&&<span style={{fontSize:8,color:S.muted,marginLeft:"auto"}}>{m.days-soberDays} Tage</span>}
            </div>;
          })}
        </div>
      )}
    </NeonCard>
  );
}

// ─── Relapse Review ───────────────────────────────────────────────────────────
const RELAPSE_FIELDS = [
  {id:"trigger",    label:"Trigger",            placeholder:"Was hat es ausgelöst?",             rows:2},
  {id:"thought",    label:"Gedanke davor",       placeholder:"z.B. „nur einmal", "ich verdiene es:" rows:2},
  {id:"emotion",    label:"Emotion",             placeholder:"Was hast du gefühlt?",              rows:1},
  {id:"location",   label:"Ort",                placeholder:"Wo warst du?",                      rows:1},
  {id:"people",     label:"Personen",            placeholder:"Allein oder mit wem?",              rows:1},
  {id:"cost_money", label:"Kosten (€)",          placeholder:"Ungefähre Kosten",                  rows:1},
  {id:"cost_mental",label:"Kosten (psychisch)",  placeholder:"Was hat es mental gekostet?",       rows:2},
  {id:"cost_body",  label:"Kosten (körperlich)", placeholder:"Körperliche Auswirkungen",          rows:1},
];

function RelapseReview({onDone,callClaude,S}) {
  const [form,setForm]=useState(Object.fromEntries(RELAPSE_FIELDS.map(f=>[f.id,""])));
  const [step,setStep]=useState("form");
  const [result,setResult]=useState("");
  const [error,setError]=useState("");

  async function submit(){
    haptic.medium();setStep("loading");setError("");
    const payload=RELAPSE_FIELDS.map(f=>`${f.label}: ${form[f.id]||"–"}`).join("\n");
    try{
      const txt=await callClaude(RELAPSE_SYSTEM,payload);
      setResult(txt);setStep("result");haptic.success();
      const prev=JSON.parse(ls.get("relapses","[]"));
      ls.set("relapses",JSON.stringify([...prev,{date:new Date().toISOString(),form,analysis:txt}].slice(-20)));
    }catch(e){haptic.error();setError(e instanceof Error?e.message:"Fehler");setStep("form");}
  }

  if(step==="loading") return <div style={{textAlign:"center",padding:"60px 0"}}><div style={{width:40,height:40,border:`2px solid ${S.neonBorder}`,borderTopColor:S.neon,borderRadius:"50%",animation:"spin 0.6s linear infinite",margin:"0 auto 16px"}}/><p style={{color:S.muted,fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase",animation:"pulse 1.5s ease infinite"}}>Analyse läuft…</p></div>;

  if(step==="result") return <div style={{animation:"fadeUp 0.3s ease both"}}>
    <NeonCard S={S} glow style={{marginBottom:12,lineHeight:1.8,fontSize:13}}><div dangerouslySetInnerHTML={{__html:mdHtml(result,S.neon)}}/></NeonCard>
    <GlowBtn onClick={onDone} S={S}>✓ Weiter zum Check-in</GlowBtn>
  </div>;

  return <div style={{animation:"fadeUp 0.3s ease both"}}>
    <div style={{background:"rgba(180,77,255,0.06)",border:`1px solid ${S.neonBorder}`,borderRadius:12,padding:"12px 16px",marginBottom:16}}>
      <div style={{fontSize:11,color:S.text,lineHeight:1.8}}>Kein Vorwurf. Kein Urteil.<br/><span style={{color:S.muted,fontSize:10}}>Jede Antwort hilft beim nächsten Mal.</span></div>
    </div>
    {RELAPSE_FIELDS.map(f=>(
      <div key={f.id} style={{marginBottom:12}}>
        <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6}}>{f.label}</div>
        <textarea rows={f.rows} placeholder={f.placeholder} value={form[f.id]} onChange={e=>setForm(p=>({...p,[f.id]:e.target.value}))}
          style={{width:"100%",background:S.bgInput,border:`1px solid ${S.border}`,borderRadius:8,padding:"8px 12px",fontSize:12,lineHeight:1.6,color:S.text,fontFamily:"inherit",outline:"none",resize:"none"}}/>
      </div>
    ))}
    {error&&<ErrorBox msg={error} S={S}/>}
    <GlowBtn onClick={submit} disabled={!form.trigger.trim()} S={S} color={S.danger}>Analysieren</GlowBtn>
    <button onPointerDown={()=>haptic.light()} onClick={onDone} style={{width:"100%",padding:"12px",marginTop:4,background:"transparent",border:`1px solid ${S.border}`,borderRadius:10,fontSize:9,fontWeight:700,cursor:"pointer",color:S.muted,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"inherit"}}>
      Überspringen → direkt zum Check-in
    </button>
  </div>;
}

// ─── Micro Journal ────────────────────────────────────────────────────────────
function MicroJournal({S}) {
  const [entries,setEntries]=useState(()=>JSON.parse(ls.get("journal","[]")));
  const [form,setForm]=useState({hard:"",helped:""});
  const [saved,setSaved]=useState(false);
  const todayKey=new Date().toDateString();

  function save(){
    if(!form.hard.trim()&&!form.helped.trim()) return;
    haptic.success();
    const entry={date:new Date().toISOString(),...form};
    const next=[entry,...entries.filter(e=>new Date(e.date).toDateString()!==todayKey)].slice(0,60);
    setEntries(next);ls.set("journal",JSON.stringify(next));
    setForm({hard:"",helped:""});setSaved(true);setTimeout(()=>setSaved(false),2000);
  }

  return <div style={{animation:"fadeUp 0.35s ease both"}}>
    <NeonCard S={S} glow style={{marginBottom:16}}>
      <div style={{fontSize:9,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:14}}>Heute · 30 Sekunden</div>
      {[{id:"hard",label:"Was war schwer?",placeholder:"Kurz. Ehrlich.",color:"#ff6b85"},{id:"helped",label:"Was hat geholfen?",placeholder:"Auch kleine Dinge zählen.",color:"#00ff9d"}].map(q=>(
        <div key={q.id} style={{marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:800,color:q.color,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>{q.label}</div>
          <textarea rows={2} placeholder={q.placeholder} value={form[q.id]} onChange={e=>setForm(p=>({...p,[q.id]:e.target.value}))}
            style={{width:"100%",background:S.bgInput,border:`1px solid ${S.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,lineHeight:1.6,color:S.text,fontFamily:"inherit",outline:"none",resize:"none"}}/>
        </div>
      ))}
      {saved?<div style={{textAlign:"center",padding:"10px",color:S.success,fontSize:12,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase"}}>✓ Gespeichert</div>
        :<GlowBtn onClick={save} disabled={!form.hard.trim()&&!form.helped.trim()} S={S} color={S.success}>✦ Speichern</GlowBtn>}
    </NeonCard>
    {entries.length>0&&<>
      <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:8}}>Letzte Einträge</div>
      {entries.slice(0,10).map((e,i)=>(
        <NeonCard key={i} S={S} style={{marginBottom:8,padding:"12px 14px"}}>
          <div style={{fontSize:9,color:S.muted,fontFamily:"monospace",marginBottom:8}}>{fmtDate(e.date)} · {fmtTime(e.date)}</div>
          {e.hard&&<div style={{marginBottom:6}}><div style={{fontSize:8,color:"#ff6b85",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:3}}>Schwer</div><div style={{fontSize:12,color:S.text,lineHeight:1.5}}>{e.hard}</div></div>}
          {e.helped&&<div><div style={{fontSize:8,color:"#00ff9d",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:3}}>Geholfen</div><div style={{fontSize:12,color:S.text,lineHeight:1.5}}>{e.helped}</div></div>}
        </NeonCard>
      ))}
    </>}
  </div>;
}

// ─── Wenn-Dann-Pläne ──────────────────────────────────────────────────────────
const PLAN_SUGGESTIONS=[
  {wenn:"Einsamkeit",dann:"Freund anrufen"},
  {wenn:"Suchtdruck",dann:"Dusche + 10 Min Walk"},
  {wenn:"Stress nach Arbeit",dann:"Musik + 5 Min draußen"},
  {wenn:"Langeweile abends",dann:"Workout oder Hobby"},
  {wenn:"Streit / Konflikt",dann:"Raum verlassen + atmen"},
];

function WennDannPlaene({S}) {
  const [plans,setPlans]=useState(()=>JSON.parse(ls.get("wenn_dann","[]")));
  const [adding,setAdding]=useState(false);
  const [form,setForm]=useState({wenn:"",dann:"",reminder:false,reminderTime:"20:00"});
  const [editId,setEditId]=useState(null);

  function save(){
    if(!form.wenn.trim()||!form.dann.trim()) return;
    haptic.success();
    const next=editId!==null?plans.map(p=>p.id===editId?{...p,...form}:p):[...plans,{id:Date.now(),...form}];
    setPlans(next);ls.set("wenn_dann",JSON.stringify(next));
    setForm({wenn:"",dann:"",reminder:false,reminderTime:"20:00"});setAdding(false);setEditId(null);
    if(form.reminder&&"Notification" in window&&Notification.permission==="granted"){
      const [h,m]=form.reminderTime.split(":").map(Number);
      const target=new Date();target.setHours(h,m,0,0);
      const ms=target-new Date();
      if(ms>0) setTimeout(()=>new Notification("BALANX · Wenn-Dann",{body:`Wenn ${form.wenn} → ${form.dann}`}),ms);
    }
  }

  function remove(id){haptic.light();const next=plans.filter(p=>p.id!==id);setPlans(next);ls.set("wenn_dann",JSON.stringify(next));}
  function startEdit(p){setForm({wenn:p.wenn,dann:p.dann,reminder:p.reminder||false,reminderTime:p.reminderTime||"20:00"});setEditId(p.id);setAdding(true);}

  return <div style={{animation:"fadeUp 0.35s ease both"}}>
    {!adding&&plans.length===0&&(
      <NeonCard S={S} style={{marginBottom:14}}>
        <div style={{fontSize:9,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>Vorschläge</div>
        {PLAN_SUGGESTIONS.map((s,i)=>(
          <div key={i} onClick={()=>{haptic.light();setForm(f=>({...f,wenn:s.wenn,dann:s.dann}));setAdding(true);}}
            style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<PLAN_SUGGESTIONS.length-1?`1px solid ${S.border}`:"none",cursor:"pointer"}}>
            <span style={{fontSize:10,color:S.muted,fontFamily:"monospace",width:18}}>{i+1}.</span>
            <div style={{flex:1}}><span style={{fontSize:11,color:S.cyan}}>Wenn {s.wenn}</span><span style={{fontSize:11,color:S.muted}}> → </span><span style={{fontSize:11,color:S.text}}>{s.dann}</span></div>
            <span style={{fontSize:10,color:S.neonBorder}}>+</span>
          </div>
        ))}
      </NeonCard>
    )}
    {plans.length>0&&!adding&&<>
      <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:8}}>Deine Pläne</div>
      {plans.map(p=>(
        <NeonCard key={p.id} S={S} glow style={{marginBottom:8,padding:"12px 14px"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,lineHeight:1.7}}><span style={{color:S.muted,fontSize:9,textTransform:"uppercase"}}>Wenn </span><span style={{color:S.cyan,fontWeight:700}}>{p.wenn}</span><span style={{color:S.muted}}> → </span><span style={{color:S.text,fontWeight:700}}>{p.dann}</span></div>
              {p.reminder&&<div style={{fontSize:9,color:S.neon,marginTop:3}}>◎ {p.reminderTime}</div>}
            </div>
            <div style={{display:"flex",gap:5,flexShrink:0}}>
              <button onClick={()=>startEdit(p)} style={{width:26,height:26,borderRadius:6,border:`1px solid ${S.border}`,background:"transparent",color:S.muted,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>✎</button>
              <button onClick={()=>remove(p.id)} style={{width:26,height:26,borderRadius:6,border:"1px solid rgba(255,77,109,0.3)",background:"rgba(255,77,109,0.08)",color:S.danger,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
          </div>
        </NeonCard>
      ))}
    </>}
    {adding?(
      <NeonCard S={S} glow style={{marginBottom:10}}>
        <div style={{fontSize:10,fontWeight:800,color:S.neon,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:14}}>{editId!==null?"Plan bearbeiten":"Neuer Plan"}</div>
        {[{k:"wenn",l:"Wenn…",p:"z.B. Einsamkeit, Stress"},{k:"dann",l:"Dann…",p:"z.B. Freund anrufen"}].map(f=>(
          <div key={f.k} style={{marginBottom:12}}>
            <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>{f.l}</div>
            <input value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p}
              style={{width:"100%",background:S.bgInput,border:`1px solid ${S.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,color:S.text,fontFamily:"inherit",outline:"none"}}/>
          </div>
        ))}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderTop:`1px solid ${S.border}`,marginBottom:12}}>
          <div><div style={{fontSize:10,fontWeight:700,color:S.text}}>Täglicher Reminder</div><div style={{fontSize:9,color:S.muted}}>Push Notification</div></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {form.reminder&&<input type="time" value={form.reminderTime} onChange={e=>setForm(p=>({...p,reminderTime:e.target.value}))} style={{background:S.bgInput,border:`1px solid ${S.neonBorder}`,borderRadius:6,padding:"4px 8px",fontSize:11,fontFamily:"monospace",fontWeight:800,color:S.neon,outline:"none",colorScheme:"dark"}}/>}
            <button onPointerDown={()=>haptic.light()} onClick={()=>setForm(p=>({...p,reminder:!p.reminder}))}
              style={{width:40,height:22,borderRadius:11,border:`1px solid ${form.reminder?S.neon:S.border}`,background:form.reminder?S.neonGlow:"transparent",cursor:"pointer",position:"relative",transition:"all 0.2s"}}>
              <div style={{position:"absolute",top:3,left:form.reminder?20:3,width:14,height:14,borderRadius:"50%",background:form.reminder?S.neon:S.muted,transition:"all 0.2s"}}/>
            </button>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <GlowBtn onClick={save} disabled={!form.wenn.trim()||!form.dann.trim()} S={S}>{editId!==null?"Speichern":"+ Hinzufügen"}</GlowBtn>
          <button onPointerDown={()=>haptic.light()} onClick={()=>{setAdding(false);setEditId(null);setForm({wenn:"",dann:"",reminder:false,reminderTime:"20:00"});}}
            style={{padding:"15px",background:"transparent",border:`1px solid ${S.border}`,borderRadius:12,fontSize:12,fontWeight:800,cursor:"pointer",color:S.muted,fontFamily:"inherit",letterSpacing:"0.12em",textTransform:"uppercase"}}>
            Abbrechen
          </button>
        </div>
      </NeonCard>
    ):(
      <button onPointerDown={()=>haptic.light()} onClick={()=>setAdding(true)}
        style={{width:"100%",padding:"13px",background:"transparent",border:`1px dashed ${S.neonBorder}`,borderRadius:10,fontSize:10,fontWeight:800,cursor:"pointer",color:S.neon,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"inherit",boxShadow:`0 0 12px ${S.neonGlow}`}}>
        + Neuer Wenn-Dann-Plan
      </button>
    )}
  </div>;
}

// ─── Morgen-Protokoll ─────────────────────────────────────────────────────────
function MorgenProtokoll({profile, checkins, doneSupps, callClaude, S}) {
  const todayKey = new Date().toDateString();
  const [form, setForm]     = useState({focus:"", ziel:""});
  const [result, setResult] = useState(()=>{
    try { const c=JSON.parse(ls.get("morgen_cache","null")); if(c&&c.day===todayKey) return c.text; } catch{}
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [saved, setSaved]     = useState(!!result);

  async function generate() {
    haptic.medium(); setLoading(true); setError("");
    const last3 = checkins.slice(-3).map(c=>({mood:c.mood,urge:c.urge,risk:c.risk}));
    const ctx = JSON.stringify({
      name: profile.name,
      focus: form.focus || "–",
      ziel: form.ziel || "–",
      letzteCheckins: last3,
      supplementsHeute: `${doneSupps}/${totalSupps}`,
    });
    try {
      const txt = await callClaude(buildMorgenSystem(profile.kiModus||"direkt"), ctx);
      setResult(txt); setSaved(true);
      ls.set("morgen_cache", JSON.stringify({day:todayKey, text:txt}));
      haptic.success();
    } catch(e) { haptic.error(); setError(e instanceof Error?e.message:"Fehler"); }
    setLoading(false);
  }

  const hour = new Date().getHours();
  const isEvening = hour >= 17;

  return (
    <div style={{animation:"fadeUp 0.35s ease both"}}>
      {isEvening && (
        <div style={{background:`${S.gold}11`,border:`1px solid ${S.gold}33`,borderRadius:10,padding:"8px 12px",marginBottom:12,fontSize:10,color:S.gold}}>
          ◌ Abendmodus — für morgen früh vorbereiten
        </div>
      )}
      <NeonCard S={S} glow style={{marginBottom:12}}>
        <div style={{fontSize:9,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:14}}>
          {isEvening ? "Vorbereitung für morgen" : "Morgen-Protokoll"}
        </div>
        {[
          {k:"focus", l:"Fokus heute", p:"Woran liegt der Fokus? z.B. ruhig bleiben, Arbeit fertigstellen…"},
          {k:"ziel",  l:"Ein Tagesziel", p:"Eine konkrete Sache, die heute zählt…"},
        ].map(f=>(
          <div key={f.k} style={{marginBottom:12}}>
            <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>{f.l}</div>
            <textarea rows={2} placeholder={f.p} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}
              style={{width:"100%",background:S.bgInput,border:`1px solid ${S.border}`,borderRadius:8,padding:"8px 12px",fontSize:12,lineHeight:1.6,color:S.text,fontFamily:"inherit",outline:"none",resize:"none"}}/>
          </div>
        ))}
        {error&&<ErrorBox msg={error} S={S}/>}
        <GlowBtn onClick={generate} disabled={loading} S={S} color={S.morning}>
          {loading?<Spinner S={S}/>:"▸ Protokoll generieren"}
        </GlowBtn>
      </NeonCard>

      {result && (
        <NeonCard S={S} glow style={{lineHeight:1.8,fontSize:13,animation:"fadeUp 0.3s ease both"}}>
          <div dangerouslySetInnerHTML={{__html:mdHtml(result,S.neon)}}/>
          <button onPointerDown={()=>haptic.light()} onClick={()=>{setResult("");setSaved(false);setForm({focus:"",ziel:""}); ls.set("morgen_cache","null");}}
            style={{marginTop:12,background:"transparent",border:`1px solid ${S.border}`,borderRadius:8,padding:"6px 12px",fontSize:9,fontWeight:700,cursor:"pointer",color:S.muted,fontFamily:"inherit",letterSpacing:"0.1em",textTransform:"uppercase"}}>
            ↺ Neu generieren
          </button>
        </NeonCard>
      )}
    </div>
  );
}

// ─── Abend-Debrief ────────────────────────────────────────────────────────────
function AbendDebrief({profile, checkins, doneSupps, callClaude, S}) {
  const todayKey = new Date().toDateString();
  const [form, setForm]     = useState({staerke:"", schwer:""});
  const [result, setResult] = useState(()=>{
    try { const c=JSON.parse(ls.get("debrief_cache","null")); if(c&&c.day===todayKey) return c.text; } catch{}
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function generate() {
    haptic.medium(); setLoading(true); setError("");
    const todayCheckins = checkins.filter(c=>new Date(c.date).toDateString()===todayKey);
    const ctx = JSON.stringify({
      name: profile.name,
      staerkerMoment: form.staerke || "–",
      wasSchwer: form.schwer || "–",
      checkinsHeute: todayCheckins.map(c=>({mood:c.mood,urge:c.urge,risk:c.risk,trigger:c.trigger})),
      supplementsHeute: `${doneSupps}/${totalSupps}`,
    });
    try {
      const txt = await callClaude(buildDebriefSystem(profile.kiModus||"direkt"), ctx);
      setResult(txt);
      ls.set("debrief_cache", JSON.stringify({day:todayKey, text:txt}));
      haptic.success();
    } catch(e) { haptic.error(); setError(e instanceof Error?e.message:"Fehler"); }
    setLoading(false);
  }

  return (
    <div style={{animation:"fadeUp 0.35s ease both"}}>
      <NeonCard S={S} glow style={{marginBottom:12}}>
        <div style={{fontSize:9,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:14}}>
          Abend-Debrief
        </div>
        {[
          {k:"staerke", l:`${profile.name||"Dein"} stärkster Moment heute`, p:"Was heute gut war — auch kleine Dinge…"},
          {k:"schwer",  l:"Was schwer war",              p:"Was hat dich heute gefordert?"},
        ].map(f=>(
          <div key={f.k} style={{marginBottom:12}}>
            <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>{f.l}</div>
            <textarea rows={2} placeholder={f.p} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}
              style={{width:"100%",background:S.bgInput,border:`1px solid ${S.border}`,borderRadius:8,padding:"8px 12px",fontSize:12,lineHeight:1.6,color:S.text,fontFamily:"inherit",outline:"none",resize:"none"}}/>
          </div>
        ))}
        {error&&<ErrorBox msg={error} S={S}/>}
        <GlowBtn onClick={generate} disabled={loading} S={S} color={S.evening}>
          {loading?<Spinner S={S}/>:"◌ Debrief generieren"}
        </GlowBtn>
      </NeonCard>

      {result && (
        <NeonCard S={S} glow style={{lineHeight:1.8,fontSize:13,animation:"fadeUp 0.3s ease both"}}>
          <div dangerouslySetInnerHTML={{__html:mdHtml(result,S.neon)}}/>
        </NeonCard>
      )}
    </div>
  );
}

// ─── Supplement Info ──────────────────────────────────────────────────────────
function SuppInfoPage({S, supplements, onSaveSupplements}) {
  const [selected, setSelected] = useState(null);
  const [editing, setEditing]   = useState(false);
  const [editSupps, setEditSupps] = useState({morning:[...supplements.morning], evening:[...supplements.evening]});
  const [adding, setAdding]     = useState(null); // "morning"|"evening"
  const [form, setForm]         = useState({name:"",dose:"",effect:""});
  const allSupps = [...supplements.morning, ...supplements.evening];
  const info = selected ? SUPP_INFO[selected.name] : null;

  // sync when supplements change
  useEffect(()=>{setEditSupps({morning:[...supplements.morning],evening:[...supplements.evening]});},[supplements]);

  function removeSupp(slot, id) {
    setEditSupps(prev=>({...prev,[slot]:prev[slot].filter(s=>s.id!==id)}));
  }
  function startAdd(slot){setAdding(slot);setForm({name:"",dose:"",effect:""});}
  function confirmAdd(){
    if(!form.name.trim()) return;
    haptic.success();
    const prefix=adding==="morning"?"cm":"ce";
    const id=`${prefix}${Date.now()}`;
    setEditSupps(prev=>({...prev,[adding]:[...prev[adding],{id,...form}]}));
    setAdding(null);
  }
  function saveEdit(){
    haptic.success();
    onSaveSupplements(editSupps);
    setEditing(false);
  }

  if(selected && info) return (
    <div style={{animation:"fadeUp 0.3s ease both"}}>
      <button onPointerDown={()=>haptic.light()} onClick={()=>setSelected(null)}
        style={{display:"flex",alignItems:"center",gap:6,background:"transparent",border:"none",color:S.muted,cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:16,padding:0}}>
        ← Zurück
      </button>
      <NeonCard S={S} glow style={{marginBottom:12}}>
        <div style={{fontSize:18,fontWeight:900,color:S.neon,marginBottom:4,textShadow:`0 0 12px ${S.neon}`}}>{selected.name}</div>
        <div style={{fontSize:11,fontFamily:"monospace",color:S.muted}}>{selected.dose} · {selected.effect}</div>
      </NeonCard>
      {[
        {label:"Wirkung", content:info.wirkung, color:S.cyan},
        {label:"Timing",  content:info.timing,  color:S.morning},
        {label:"Evidenz", content:info.quelle,  color:S.muted},
      ].map(sec=>(
        <NeonCard key={sec.label} S={S} style={{marginBottom:10}}>
          <div style={{fontSize:9,fontWeight:800,color:sec.color,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>{sec.label}</div>
          <div style={{fontSize:12,color:S.text,lineHeight:1.7}}>{sec.content}</div>
        </NeonCard>
      ))}
    </div>
  );

  if(editing) return (
    <div style={{animation:"fadeUp 0.3s ease both"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:800,color:S.neon,letterSpacing:"0.08em",textTransform:"uppercase"}}>Supplements bearbeiten</div>
        <button onPointerDown={()=>haptic.light()} onClick={()=>setEditing(false)} style={{background:"transparent",border:`1px solid ${S.border}`,borderRadius:6,padding:"4px 10px",fontSize:9,cursor:"pointer",color:S.muted,fontFamily:"inherit"}}>Abbrechen</button>
      </div>
      {[{key:"morning",label:"10:00 Uhr",accent:S.morning},{key:"evening",label:"19–20 Uhr",accent:S.evening}].map(sl=>(
        <div key={sl.key} style={{marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:sl.accent,boxShadow:`0 0 6px ${sl.accent}`}}/>
            <span style={{fontSize:10,fontWeight:800,color:sl.accent,letterSpacing:"0.08em",textTransform:"uppercase"}}>{sl.label}</span>
            <span style={{fontSize:9,color:S.muted,marginLeft:"auto"}}>{editSupps[sl.key].length}</span>
          </div>
          {editSupps[sl.key].map(s=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${S.border}`}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:S.text}}>{s.name}</div>
                <div style={{fontSize:10,color:S.muted,marginTop:1}}>{s.effect} · <span style={{fontFamily:"monospace"}}>{s.dose}</span></div>
              </div>
              <button onPointerDown={()=>haptic.light()} onClick={()=>removeSupp(sl.key,s.id)}
                style={{flexShrink:0,width:26,height:26,borderRadius:6,border:"1px solid rgba(255,77,109,0.3)",background:"rgba(255,77,109,0.08)",color:S.danger,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
          ))}
          {adding===sl.key?(
            <div style={{marginTop:10,background:S.bgInput,borderRadius:10,padding:"12px"}}>
              {[{k:"name",p:"Name *"},{k:"dose",p:"Dosis (z.B. 300 mg)"},{k:"effect",p:"Wirkung (z.B. Stress ↓)"}].map(f=>(
                <div key={f.k} style={{marginBottom:8}}>
                  <input value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p}
                    style={{width:"100%",background:S.bgCard,border:`1px solid ${S.border}`,borderRadius:8,padding:"8px 10px",fontSize:12,color:S.text,fontFamily:"inherit",outline:"none"}}/>
                </div>
              ))}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <button onPointerDown={()=>haptic.medium()} onClick={confirmAdd} disabled={!form.name.trim()}
                  style={{padding:"10px",background:"transparent",border:`1px solid ${!form.name.trim()?S.muted:sl.accent}`,borderRadius:8,fontSize:9,fontWeight:800,cursor:"pointer",color:!form.name.trim()?S.muted:sl.accent,fontFamily:"inherit",letterSpacing:"0.1em",textTransform:"uppercase"}}>
                  + Hinzufügen
                </button>
                <button onPointerDown={()=>haptic.light()} onClick={()=>setAdding(null)}
                  style={{padding:"10px",background:"transparent",border:`1px solid ${S.border}`,borderRadius:8,fontSize:9,fontWeight:800,cursor:"pointer",color:S.muted,fontFamily:"inherit",letterSpacing:"0.1em",textTransform:"uppercase"}}>
                  Abbrechen
                </button>
              </div>
            </div>
          ):(
            <button onPointerDown={()=>haptic.light()} onClick={()=>startAdd(sl.key)}
              style={{marginTop:8,width:"100%",padding:"9px",background:"transparent",border:`1px dashed ${sl.accent}44`,borderRadius:8,fontSize:9,fontWeight:700,cursor:"pointer",color:sl.accent,fontFamily:"inherit",letterSpacing:"0.1em",textTransform:"uppercase"}}>
              + Supplement hinzufügen
            </button>
          )}
        </div>
      ))}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
        <GlowBtn onClick={saveEdit} S={S}>✓ Speichern</GlowBtn>
        <button onPointerDown={()=>haptic.light()} onClick={()=>{setEditSupps({morning:[...supplements.morning],evening:[...supplements.evening]});setEditing(false);}}
          style={{padding:"15px",background:"transparent",border:`1px solid ${S.border}`,borderRadius:12,fontSize:12,fontWeight:800,cursor:"pointer",color:S.muted,fontFamily:"inherit",letterSpacing:"0.12em",textTransform:"uppercase"}}>
          Abbrechen
        </button>
      </div>
    </div>
  );

  return (
    <div style={{animation:"fadeUp 0.35s ease both"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{fontSize:9,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase"}}>
          Supplement-Bibliothek · {allSupps.length} Einträge
        </div>
        <button onPointerDown={()=>haptic.light()} onClick={()=>setEditing(true)}
          style={{background:"transparent",border:`1px solid ${S.neonBorder}`,borderRadius:8,padding:"5px 10px",fontSize:9,fontWeight:800,cursor:"pointer",color:S.neon,fontFamily:"inherit",letterSpacing:"0.08em",textTransform:"uppercase",boxShadow:`0 0 8px ${S.neonGlow}`}}>
          ✎ Bearbeiten
        </button>
      </div>
      {[
        {label:"10:00 Uhr", items:supplements.morning, accent:S.morning},
        {label:"19–20 Uhr", items:supplements.evening, accent:S.evening},
      ].map(sec=>(
        <div key={sec.label} style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:sec.accent,boxShadow:`0 0 6px ${sec.accent}`}}/>
            <span style={{fontSize:10,fontWeight:800,color:sec.accent,letterSpacing:"0.08em",textTransform:"uppercase"}}>{sec.label}</span>
          </div>
          {sec.items.map(s=>{
            const hasInfo = !!SUPP_INFO[s.name];
            return (
              <div key={s.id} onPointerDown={()=>haptic.light()} onClick={()=>hasInfo&&setSelected(s)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`1px solid ${S.border}`,cursor:hasInfo?"pointer":"default"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:S.text}}>{s.name}</div>
                  <div style={{fontSize:10,color:S.muted,marginTop:2}}>{s.effect}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  <span style={{fontSize:10,fontFamily:"monospace",color:S.muted}}>{s.dose}</span>
                  {hasInfo&&<span style={{fontSize:9,color:S.neon}}>›</span>}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Monatsstatistik ──────────────────────────────────────────────────────────
function Monatsstatistik({checkins, S}) {
  const now  = new Date();
  const year = now.getFullYear();
  const month= now.getMonth();

  // Build day map for current month
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const dayMap = {};
  checkins.forEach(c=>{
    const d=new Date(c.date);
    if(d.getFullYear()===year && d.getMonth()===month) {
      const day=d.getDate();
      if(!dayMap[day]) dayMap[day]={checkins:[],supps:0};
      dayMap[day].checkins.push(c);
      dayMap[day].supps=Math.max(dayMap[day].supps, c.suppsDone||0);
    }
  });

  // Stats
  const checkinDays  = Object.keys(dayMap).length;
  const fullSuppDays = Object.values(dayMap).filter(d=>d.supps===totalSupps).length;
  const highRiskDays = Object.values(dayMap).filter(d=>d.checkins.some(c=>c.risk==="hoch")).length;
  const pctCheckin   = Math.round((checkinDays/daysInMonth)*100);
  const pctSupps     = Math.round((fullSuppDays/daysInMonth)*100);
  const monthName    = now.toLocaleDateString("de-DE",{month:"long",year:"numeric"});

  // Heatmap colors
  function dayColor(day) {
    const d = dayMap[day];
    if(!d) return S.bgInput;
    const risk = d.checkins.find(c=>c.risk==="hoch") ? "hoch" : d.checkins.find(c=>c.risk==="mittel") ? "mittel" : d.checkins.length ? "niedrig" : null;
    if(risk==="hoch")    return "rgba(255,77,109,0.5)";
    if(risk==="mittel")  return "rgba(255,193,7,0.45)";
    if(risk==="niedrig") return "rgba(0,255,157,0.45)";
    return S.bgInput;
  }

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun
  const startOffset = (firstDayOfMonth+6)%7; // Mon=0

  return (
    <div style={{animation:"fadeUp 0.35s ease both"}}>
      <NeonCard S={S} style={{marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:800,color:S.text,marginBottom:14,letterSpacing:"0.04em",textTransform:"uppercase"}}>{monthName}</div>

        {/* Stats row */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
          {[
            {label:"Check-ins",  value:`${pctCheckin}%`,  sub:`${checkinDays}/${daysInMonth} Tage`, color:S.neon},
            {label:"Volle Supps",value:`${pctSupps}%`,    sub:`${fullSuppDays} Tage`,              color:S.success},
            {label:"Hoch-Risiko",value:highRiskDays,       sub:"Tage",                              color:highRiskDays>0?S.danger:S.muted},
          ].map(stat=>(
            <div key={stat.label} style={{background:S.bgInput,borderRadius:10,padding:"10px 8px",textAlign:"center",border:`1px solid ${S.border}`}}>
              <div style={{fontSize:18,fontWeight:800,color:stat.color,textShadow:`0 0 8px ${stat.color}`}}>{stat.value}</div>
              <div style={{fontSize:8,color:S.muted,marginTop:2,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>{stat.label}</div>
              <div style={{fontSize:8,color:S.muted,marginTop:1}}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Calendar heatmap */}
        <div style={{fontSize:9,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Monats-Heatmap</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:8}}>
          {["Mo","Di","Mi","Do","Fr","Sa","So"].map(d=>(
            <div key={d} style={{fontSize:7,color:S.muted,textAlign:"center",padding:"2px 0",letterSpacing:"0.08em"}}>{d}</div>
          ))}
          {[...Array(startOffset)].map((_,i)=><div key={`e${i}`}/>)}
          {[...Array(daysInMonth)].map((_,i)=>{
            const day=i+1;
            const col=dayColor(day);
            const isToday=day===now.getDate();
            return (
              <div key={day} style={{
                aspectRatio:"1",borderRadius:4,
                background:col,
                border:isToday?`1px solid ${S.neon}`:`1px solid transparent`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:7,fontWeight:isToday?900:400,
                color:dayMap[day]?S.text:S.muted,
                boxShadow:isToday?`0 0 5px ${S.neon}`:"none",
              }}>{day}</div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          {[
            {col:"rgba(0,255,157,0.5)",   label:"Niedrig"},
            {col:"rgba(255,193,7,0.45)",  label:"Mittel"},
            {col:"rgba(255,77,109,0.5)",  label:"Hoch"},
            {col:S.bgInput,              label:"Kein Check-in"},
          ].map(l=>(
            <div key={l.label} style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:8,height:8,borderRadius:2,background:l.col,border:`1px solid rgba(255,255,255,0.1)`}}/>
              <span style={{fontSize:8,color:S.muted}}>{l.label}</span>
            </div>
          ))}
        </div>
      </NeonCard>

      {/* Trend line for month */}
      {checkinDays>0&&(()=>{
        const monthData=Object.entries(dayMap)
          .sort((a,b)=>Number(a[0])-Number(b[0]))
          .map(([day,d])=>({
            day:String(day),
            Stimmung:d.checkins.length ? Math.round(d.checkins.reduce((s,c)=>s+c.mood,0)/d.checkins.length) : null,
            Drang:    d.checkins.length ? Math.round(d.checkins.reduce((s,c)=>s+c.urge,0)/d.checkins.length) : null,
          })).filter(d=>d.Stimmung!==null);
        if(!monthData.length) return null;
        return (
          <NeonCard S={S} style={{paddingLeft:6,paddingRight:6}}>
            <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:12}}>
              Monatsverlauf
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={monthData} margin={{top:4,right:8,left:-28,bottom:4}}>
                <CartesianGrid strokeDasharray="3 3" stroke={S.border}/>
                <XAxis dataKey="day" tick={{fontSize:8,fill:S.muted,fontFamily:"monospace"}}/>
                <YAxis domain={[0,10]} tick={{fontSize:8,fill:S.muted,fontFamily:"monospace"}}/>
                <Tooltip contentStyle={{fontFamily:"monospace",fontSize:10,background:S.bgCard,border:`1px solid ${S.neonBorder}`,borderRadius:8,color:S.text}}/>
                <Line type="monotone" dataKey="Stimmung" stroke={S.cyan}   strokeWidth={2} dot={false}/>
                <Line type="monotone" dataKey="Drang"    stroke={S.danger} strokeWidth={2} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </NeonCard>
        );
      })()}
    </div>
  );
}

const FRUEHWARNUNG_SYSTEM = `Du bist ein KI-Frühwarnsystem für Recovery. Du analysierst Trends — keine Einzeltage.
Antworte NUR in diesem Format:

## Frühwarnung

**Status:** [⚠️ Warnung / ✓ Stabil / 🔴 Kritisch]

**Erkannte Trends:**
- [Trend 1 mit konkreten Zahlen]
- [Trend 2 mit konkreten Zahlen]

**Kritischer Faktor:**
[Den einen Faktor benennen, der gerade das größte Risiko darstellt. 1 Satz.]

**Empfohlene Maßnahme:**
[Eine einzige konkrete Handlung. Nicht allgemein.]

Nur Fakten. Kein Coaching.`;

const WOCHENBERICHT_SYSTEM = `Du bist ein Recovery-Wochenbericht-Tool.
Antworte NUR in diesem Format:

## Woche im Rückblick

**Stimmungs-Trend:** [1 Satz mit konkreten Zahlen]

**Drang-Trend:** [1 Satz mit konkreten Zahlen]

**Schlaf-Muster:** [Durchschnitt + auffällige Tage. 1 Satz.]

**Stärkster Trigger diese Woche:**
[Benennen + 1 Satz Einordnung]

**Was gut lief:**
[1 konkreter Satz. Kein Lob-Speak.]

**Fokus nächste Woche:**
[Eine einzige Empfehlung. 1–2 Sätze.]

Direkt. Keine Floskeln.`;

// ─── Streak Calculator ────────────────────────────────────────────────────────
function calcStreaks(checkins) {
  if (!checkins.length) return {checkinStreak:0, suppStreak:0};
  const today = new Date(); today.setHours(0,0,0,0);
  const byDay = {};
  checkins.forEach(c => {
    const d = new Date(c.date); d.setHours(0,0,0,0);
    const k = d.toDateString();
    if (!byDay[k]) byDay[k] = {hasCheckin:false, suppsDone:0, totalSupps:c.totalSupps||totalSupps};
    byDay[k].hasCheckin = true;
    byDay[k].suppsDone  = Math.max(byDay[k].suppsDone, c.suppsDone||0);
  });
  let ci=0, su=0;
  let d = new Date(today);
  for (let i=0;i<365;i++) {
    const k=d.toDateString();
    if (byDay[k]?.hasCheckin) ci++; else if(i>0) break;
    d.setDate(d.getDate()-1);
  }
  d = new Date(today);
  for (let i=0;i<365;i++) {
    const k=d.toDateString();
    if (byDay[k]?.suppsDone>=totalSupps) su++; else if(i>0) break;
    d.setDate(d.getDate()-1);
  }
  return {checkinStreak:ci, suppStreak:su};
}

// ─── Breathing 4-7-8 ─────────────────────────────────────────────────────────
function Breathing478({onDone, S}) {
  const phases=[{label:"Einatmen",dur:4,color:S.cyan},{label:"Halten",dur:7,color:S.neon},{label:"Ausatmen",dur:8,color:S.success}];
  const [phase,setPhase]=useState(0);
  const [sec,setSec]=useState(4);
  const [cycle,setCycle]=useState(0);
  const [running,setRunning]=useState(false);
  const [done,setDone]=useState(false);
  const MAX=4; const cur=phases[phase];
  const circ=2*Math.PI*46;
  useEffect(()=>{
    if(!running||done) return;
    if(sec===0){const np=(phase+1)%3;if(np===0){const nc=cycle+1;if(nc>=MAX){setRunning(false);setDone(true);return;}setCycle(nc);}setPhase(np);setSec(phases[np].dur);return;}
    const t=setTimeout(()=>setSec(s=>s-1),1000);return()=>clearTimeout(t);
  },[running,sec,phase,cycle,done]);
  if(done) return <div style={{textAlign:"center",padding:"16px 0"}}><div style={{fontSize:28,color:S.success,marginBottom:8}}>✓</div><div style={{fontSize:11,color:S.success,fontWeight:800,marginBottom:14,letterSpacing:"0.1em",textTransform:"uppercase"}}>Fertig</div><GlowBtn onClick={onDone} S={S} color={S.success}>Weiter</GlowBtn></div>;
  const prog=running?(1-sec/cur.dur):0;
  return <div style={{textAlign:"center"}}>
    <div style={{fontSize:9,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:14}}>4 · 7 · 8 Atmung — {MAX} Zyklen</div>
    <div style={{position:"relative",width:120,height:120,margin:"0 auto 16px"}}>
      <svg width="120" height="120" style={{position:"absolute",top:0,left:0,transform:"rotate(-90deg)"}}>
        <circle cx="60" cy="60" r="46" fill="none" stroke={S.border} strokeWidth="2.5"/>
        {running&&<circle cx="60" cy="60" r="46" fill="none" stroke={cur.color} strokeWidth="2.5" strokeDasharray={circ} strokeDashoffset={circ*(1-prog)} style={{transition:"stroke-dashoffset 1s linear",filter:`drop-shadow(0 0 5px ${cur.color})`}}/>}
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        {running?<><div style={{fontSize:32,fontWeight:800,fontFamily:"monospace",color:cur.color,textShadow:`0 0 12px ${cur.color}`,lineHeight:1}}>{sec}</div><div style={{fontSize:8,color:cur.color,letterSpacing:"0.12em",textTransform:"uppercase",marginTop:3}}>{cur.label}</div></>:<div style={{fontSize:10,color:S.muted}}>Bereit</div>}
      </div>
    </div>
    <div style={{display:"flex",justifyContent:"center",gap:5,marginBottom:14}}>{[...Array(MAX)].map((_,i)=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:i<cycle?S.success:i===cycle&&running?cur.color:S.border,transition:"all 0.3s"}}/>)}</div>
    <GlowBtn onClick={()=>setRunning(r=>!r)} color={cur.color} S={S}>{running?"⏸ Pause":"▶ Start"}</GlowBtn>
  </div>;
}

// ─── Grounding 5-4-3-2-1 ─────────────────────────────────────────────────────
function Grounding({onDone, S}) {
  const steps=[
    {n:5,sense:"Sehen",   icon:"👁",prompt:"Benenne 5 Dinge, die du gerade siehst.",  color:S.cyan},
    {n:4,sense:"Fühlen",  icon:"✋",prompt:"Benenne 4 Dinge, die du körperlich spürst.",color:S.neon},
    {n:3,sense:"Hören",   icon:"👂",prompt:"Benenne 3 Dinge, die du gerade hörst.",   color:S.morning},
    {n:2,sense:"Riechen", icon:"👃",prompt:"Benenne 2 Dinge, die du riechen kannst.", color:"#ffc107"},
    {n:1,sense:"Schmecken",icon:"👅",prompt:"Benenne 1 Ding, das du schmecken kannst.",color:S.success},
  ];
  const [step,setStep]=useState(0);
  const [answers,setAnswers]=useState(Array(5).fill(""));
  const [finished,setFinished]=useState(false);
  if(finished) return <div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:28,marginBottom:12}}>🌱</div><div style={{fontSize:14,fontWeight:800,color:S.success,marginBottom:8}}>Geerdet.</div><div style={{fontSize:11,color:S.muted,marginBottom:20}}>Du bist im Hier und Jetzt.</div><GlowBtn onClick={onDone} color={S.success} S={S}>✓ Fertig</GlowBtn></div>;
  const cur=steps[step];
  return <div style={{padding:"10px 0"}}>
    <div style={{fontSize:9,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:16,textAlign:"center"}}>5-4-3-2-1 Grounding</div>
    <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:20}}>{steps.map((s,i)=><div key={i} style={{width:28,height:28,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",background:i<=step?`${s.color}22`:S.bgInput,border:`1px solid ${i<=step?s.color:S.border}`,fontSize:10,fontWeight:800,color:i<=step?s.color:S.muted,transition:"all 0.3s"}}>{s.n}</div>)}</div>
    <NeonCard S={S} glow style={{marginBottom:14,textAlign:"center"}}><div style={{fontSize:28,marginBottom:8}}>{cur.icon}</div><div style={{fontSize:13,fontWeight:800,color:cur.color,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>{cur.sense}</div><div style={{fontSize:12,color:S.text,lineHeight:1.6}}>{cur.prompt}</div></NeonCard>
    <NeonCard S={S} style={{marginBottom:12}}><textarea rows={3} placeholder={`${cur.n} ${cur.sense.toLowerCase()}...`} value={answers[step]} onChange={e=>{const a=[...answers];a[step]=e.target.value;setAnswers(a);}} style={{width:"100%",background:S.bgInput,borderRadius:8,padding:"10px 12px",fontSize:13,lineHeight:1.6,color:S.text}}/></NeonCard>
    <GlowBtn onClick={()=>{if(step<steps.length-1)setStep(s=>s+1);else setFinished(true);}} color={cur.color} S={S}>{step<steps.length-1?`Weiter → ${steps[step+1].sense}`:"Abschließen"}</GlowBtn>
  </div>;
}

// ─── Achtsamkeit ──────────────────────────────────────────────────────────────
function Achtsamkeit({onDone, S}) {
  const steps=[
    {prompt:"Halte inne.\nDu musst nichts ändern.",dur:12},
    {prompt:"Bemerke deinen Atem.\nNicht verändern — nur wahrnehmen.",dur:20},
    {prompt:"Bemerke, was in dir ist.\nGedanken, Gefühle — nichts bewerten.",dur:25},
    {prompt:"Bemerke, was um dich ist.\nGeräusche, Licht, Temperatur.",dur:20},
    {prompt:"Du bist gerade hier.\nDieser Moment ist genug.",dur:15},
  ];
  const [step,setStep]=useState(0);
  const [sec,setSec]=useState(steps[0].dur);
  const [started,setStarted]=useState(false);
  const [done,setDone]=useState(false);
  useEffect(()=>{
    if(!started||done) return;
    if(sec===0){if(step<steps.length-1){const ns=step+1;setStep(ns);setSec(steps[ns].dur);}else setDone(true);return;}
    const t=setTimeout(()=>setSec(s=>s-1),1000);return()=>clearTimeout(t);
  },[started,sec,step,done]);
  if(!started) return <div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:9,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:16}}>Achtsamkeit</div><div style={{fontSize:12,color:S.muted,lineHeight:1.8,marginBottom:20}}>~2 Min · Nichts tun. Nur wahrnehmen.</div><GlowBtn onClick={()=>setStarted(true)} color={S.success} S={S}>▶ Beginnen</GlowBtn></div>;
  if(done) return <div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:28,marginBottom:12}}>🌿</div><div style={{fontSize:14,fontWeight:800,color:S.success,marginBottom:8}}>Du warst da.</div><div style={{fontSize:11,color:S.muted,marginBottom:20}}>Das ist genug.</div><GlowBtn onClick={onDone} color={S.success} S={S}>✓ Fertig</GlowBtn></div>;
  const circ=2*Math.PI*46;
  return <div style={{padding:"10px 0",textAlign:"center"}}>
    <div style={{fontSize:9,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:20}}>{step+1} / {steps.length}</div>
    <div style={{position:"relative",width:110,height:110,margin:"0 auto 20px"}}>
      <svg width="110" height="110" style={{position:"absolute",top:0,left:0,transform:"rotate(-90deg)"}}>
        <circle cx="55" cy="55" r="46" fill="none" stroke={S.border} strokeWidth="2"/>
        <circle cx="55" cy="55" r="46" fill="none" stroke={S.success} strokeWidth="2" strokeDasharray={circ} strokeDashoffset={circ*(sec/steps[step].dur)} style={{transition:"stroke-dashoffset 1s linear",filter:`drop-shadow(0 0 4px ${S.success})`}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:22,fontWeight:800,fontFamily:"monospace",color:S.success,textShadow:`0 0 10px ${S.success}`}}>{sec}</span></div>
    </div>
    <NeonCard S={S} glow style={{marginBottom:16,minHeight:70,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:13,color:S.text,lineHeight:1.9,whiteSpace:"pre-line",textAlign:"center"}}>{steps[step].prompt}</div></NeonCard>
    <button onPointerDown={()=>haptic.light()} onClick={()=>{if(step<steps.length-1){const ns=step+1;setStep(ns);setSec(steps[ns].dur);}else setDone(true);}} style={{background:"transparent",border:`1px solid ${S.border}`,borderRadius:8,padding:"7px 14px",fontSize:9,fontWeight:700,cursor:"pointer",color:S.muted,fontFamily:"inherit",letterSpacing:"0.1em",textTransform:"uppercase"}}>Überspringen →</button>
  </div>;
}

// ─── Wait 20 ─────────────────────────────────────────────────────────────────
function Wait20({onDone, S}) {
  const TOTAL=20*60;
  const [sec,setSec]=useState(TOTAL);
  const [running,setRunning]=useState(false);
  const [done,setDone]=useState(false);
  const r=50,circ=2*Math.PI*r;
  useEffect(()=>{if(!running||done)return;if(sec===0){setDone(true);setRunning(false);return;}const t=setTimeout(()=>setSec(s=>s-1),1000);return()=>clearTimeout(t);},[running,sec,done]);
  const mins=Math.floor(sec/60),secs=sec%60;
  const col=done?S.success:running?S.cyan:S.muted;
  return <div style={{textAlign:"center",padding:"8px 0"}}>
    <div style={{fontSize:9,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:14}}>Craving-Peak: ~15–20 Min. Dann fällt er.</div>
    <div style={{position:"relative",width:130,height:130,margin:"0 auto 16px"}}>
      <svg width="130" height="130" style={{position:"absolute",top:0,left:0,transform:"rotate(-90deg)"}}>
        <circle cx="65" cy="65" r={r} fill="none" stroke={S.border} strokeWidth="3"/>
        <circle cx="65" cy="65" r={r} fill="none" stroke={col} strokeWidth="3" strokeDasharray={circ} strokeDashoffset={circ*(sec/TOTAL)} style={{transition:"stroke-dashoffset 1s linear",filter:`drop-shadow(0 0 6px ${col})`}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        {done?<div style={{fontSize:26,color:S.success}}>✓</div>:<><div style={{fontSize:30,fontWeight:800,fontFamily:"monospace",color:col,lineHeight:1}}>{String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}</div><div style={{fontSize:8,color:S.muted,marginTop:4,letterSpacing:"0.1em"}}>MIN · SEK</div></>}
      </div>
    </div>
    {!done?<GlowBtn onClick={()=>setRunning(r=>!r)} color={S.cyan} S={S}>{running?"⏸ Pause":sec===TOTAL?"▶ Start":"▶ Weiter"}</GlowBtn>:<><div style={{fontSize:11,color:S.success,marginBottom:12,fontWeight:700}}>Craving-Peak ist vorbei.</div><GlowBtn onClick={onDone} color={S.success} S={S}>✓ Fertig</GlowBtn></>}
    {running&&<div style={{fontSize:9,color:S.muted,marginTop:10,lineHeight:1.7}}>Bleib da. Der Drang ist eine Welle.<br/>Du musst ihn nicht wegmachen.</div>}
  </div>;
}

// ─── Safe Contacts ────────────────────────────────────────────────────────────
function SafeContacts({onBack, S}) {
  const [contacts,setContacts]=useState(()=>JSON.parse(ls.get("sos_contacts","[]")));
  const [adding,setAdding]=useState(false);
  const [form,setForm]=useState({name:"",phone:""});
  function save(){if(!form.name.trim())return;haptic.success();const next=[...contacts,{id:Date.now(),...form}];setContacts(next);ls.set("sos_contacts",JSON.stringify(next));setAdding(false);setForm({name:"",phone:""});}
  function remove(id){haptic.light();const next=contacts.filter(c=>c.id!==id);setContacts(next);ls.set("sos_contacts",JSON.stringify(next));}
  return <div style={{padding:"4px 0"}}>
    {contacts.length===0&&!adding&&<div style={{fontSize:11,color:S.muted,textAlign:"center",padding:"20px 0 16px",lineHeight:1.7}}>Noch keine Kontakte.<br/>Füge jetzt jemanden hinzu.</div>}
    {contacts.map(c=><div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0",borderBottom:`1px solid ${S.border}`}}>
      <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:S.text}}>{c.name}</div>{c.phone&&<div style={{fontSize:10,color:S.muted,fontFamily:"monospace"}}>{c.phone}</div>}</div>
      {c.phone&&<a href={`tel:${c.phone}`} style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${S.success}44`,background:`${S.success}11`,color:S.success,fontSize:11,fontWeight:800,textDecoration:"none",letterSpacing:"0.08em",textTransform:"uppercase"}}>Anrufen</a>}
      <button onClick={()=>remove(c.id)} style={{width:26,height:26,borderRadius:6,border:"1px solid rgba(255,77,109,0.3)",background:"rgba(255,77,109,0.08)",color:S.danger,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
    </div>)}
    {adding?<div style={{marginTop:10,background:S.bgInput,borderRadius:10,padding:"12px"}}>
      {[{k:"name",p:"Name *"},{k:"phone",p:"Telefon (optional)"}].map(f=><div key={f.k} style={{marginBottom:8}}><input value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p} style={{width:"100%",background:S.bgCard,border:`1px solid ${S.border}`,borderRadius:8,padding:"8px 10px",fontSize:12,color:S.text,fontFamily:"inherit",outline:"none"}}/></div>)}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <button onClick={save} disabled={!form.name.trim()} style={{padding:"10px",background:"transparent",border:`1px solid ${!form.name.trim()?S.muted:S.success}`,borderRadius:8,fontSize:9,fontWeight:800,cursor:"pointer",color:!form.name.trim()?S.muted:S.success,fontFamily:"inherit",letterSpacing:"0.1em",textTransform:"uppercase"}}>+ Hinzufügen</button>
        <button onClick={()=>setAdding(false)} style={{padding:"10px",background:"transparent",border:`1px solid ${S.border}`,borderRadius:8,fontSize:9,fontWeight:800,cursor:"pointer",color:S.muted,fontFamily:"inherit",letterSpacing:"0.1em",textTransform:"uppercase"}}>Abbrechen</button>
      </div>
    </div>:<button onPointerDown={()=>haptic.light()} onClick={()=>setAdding(true)} style={{marginTop:10,width:"100%",padding:"10px",background:"transparent",border:`1px dashed ${S.success}44`,borderRadius:8,fontSize:9,fontWeight:700,cursor:"pointer",color:S.success,fontFamily:"inherit",letterSpacing:"0.1em",textTransform:"uppercase"}}>+ Kontakt hinzufügen</button>}
    <div style={{marginTop:12}}><GlowBtn onClick={onBack} color={S.success} S={S}>← Zurück</GlowBtn></div>
  </div>;
}

// ─── SOS Screen ───────────────────────────────────────────────────────────────
function SOSScreen({onClose, values, lastRisk, S}) {
  const [active,setActive]=useState(null);
  const borderCol=lastRisk==="hoch"?S.danger:lastRisk==="mittel"?"#ffc107":S.neon;
  const actions=[
    {id:"atem",     icon:"◌",label:"4-7-8 Atmung",     sub:"Nervensystem beruhigen",   color:S.cyan},
    {id:"warte",    icon:"⏱",label:"20 Min warten",     sub:"Craving-Peak überbrücken", color:"#ffc107"},
    {id:"grounding",icon:"▣",label:"Grounding",          sub:"5-4-3-2-1 Sinne",          color:S.morning},
    {id:"achtsamkeit",icon:"◉",label:"Achtsamkeit",     sub:"Alles was gerade ist",     color:S.success},
    {id:"kontakte", icon:"⊕",label:"Sicherer Kontakt",  sub:"Jemanden anrufen",         color:"#b44dff"},
  ];
  const subModal=(title,col,content)=><div style={{position:"fixed",inset:0,background:"rgba(8,8,16,0.95)",backdropFilter:"blur(8px)",zIndex:1001,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
    <div style={{width:"100%",maxWidth:430,background:S.bgCard,border:`1px solid ${col}44`,borderRadius:"20px 20px 0 0",padding:"24px 16px 32px",maxHeight:"88vh",overflowY:"auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
        <span style={{fontSize:11,fontWeight:800,color:col,letterSpacing:"0.1em",textTransform:"uppercase"}}>{title}</span>
        <button onPointerDown={()=>haptic.light()} onClick={()=>setActive(null)} style={{background:"transparent",border:`1px solid ${S.border}`,borderRadius:8,padding:"6px 10px",fontSize:11,fontWeight:700,cursor:"pointer",color:S.muted,fontFamily:"inherit"}}>←</button>
      </div>
      {content}
    </div>
  </div>;
  if(active==="atem")       return subModal("4-7-8 Atmung",S.cyan,<Breathing478 onDone={()=>setActive(null)} S={S}/>);
  if(active==="warte")      return subModal("20 Minuten","#ffc107",<Wait20 onDone={()=>setActive(null)} S={S}/>);
  if(active==="grounding")  return subModal("Grounding",S.morning,<Grounding onDone={()=>setActive(null)} S={S}/>);
  if(active==="achtsamkeit")return subModal("Achtsamkeit",S.success,<Achtsamkeit onDone={()=>setActive(null)} S={S}/>);
  if(active==="kontakte")   return subModal("Sichere Kontakte","#b44dff",<SafeContacts onBack={()=>setActive(null)} S={S}/>);
  return <div style={{position:"fixed",inset:0,background:"rgba(8,8,16,0.95)",backdropFilter:"blur(8px)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
    <div style={{width:"100%",maxWidth:430,background:S.bgCard,border:`1px solid ${borderCol}44`,borderRadius:"20px 20px 0 0",padding:"24px 16px 32px",maxHeight:"88vh",overflowY:"auto",boxShadow:`0 -8px 40px rgba(0,0,0,0.6)`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div><div style={{fontSize:20,fontWeight:900,color:S.danger,letterSpacing:"0.06em",textShadow:`0 0 16px ${S.danger}`}}>SOS</div><div style={{fontSize:9,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginTop:2}}>Craving · Impuls · Krise</div></div>
        <button onClick={onClose} style={{background:"transparent",border:`1px solid ${S.border}`,borderRadius:8,padding:"8px 14px",fontSize:16,fontWeight:700,cursor:"pointer",color:S.muted,fontFamily:"inherit"}}>×</button>
      </div>
      {values.length>0&&<div style={{background:"rgba(180,77,255,0.06)",border:`1px solid ${S.neonBorder}`,borderRadius:12,padding:"14px 16px",marginBottom:16}}>
        <div style={{fontSize:8,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:10}}>Wofür du das machst</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{values.map((v,i)=><div key={i} style={{background:S.neonGlow,border:`1px solid ${S.neonBorder}`,borderRadius:20,padding:"5px 12px",fontSize:11,fontWeight:700,color:S.neon}}>{v}</div>)}</div>
      </div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        {actions.map(a=><button key={a.id} onPointerDown={()=>haptic.medium()} onClick={()=>setActive(a.id)} style={{padding:"16px 10px",borderRadius:12,border:`1px solid ${a.color}44`,background:`${a.color}09`,display:"flex",flexDirection:"column",alignItems:"flex-start",gap:5,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
          <span style={{fontSize:20,color:a.color}}>{a.icon}</span>
          <span style={{fontSize:11,fontWeight:800,color:a.color}}>{a.label}</span>
          <span style={{fontSize:9,color:S.muted,lineHeight:1.4}}>{a.sub}</span>
        </button>)}
      </div>
      <NeonCard S={S} style={{marginBottom:12}}>
        <div style={{fontSize:9,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>Ablenkungsprotokoll</div>
        {["Stell dir in 5 Minuten einen Timer — dann neu entscheiden.","Ändere deinen Standort sofort. Anderer Raum, draußen.","Trink ein großes Glas Wasser.","Schreib auf, was gerade in dir vorgeht.","Starte eine Aufgabe, die du sowieso machen wolltest."].map((s,i)=><div key={i} style={{display:"flex",gap:10,padding:"7px 0",borderBottom:i<4?`1px solid ${S.border}`:"none"}}><span style={{fontSize:9,color:S.neonBorder,fontFamily:"monospace",flexShrink:0}}>{String(i+1).padStart(2,"0")}</span><span style={{fontSize:11,color:S.muted,lineHeight:1.5}}>{s}</span></div>)}
      </NeonCard>
      <button onClick={onClose} style={{width:"100%",padding:"13px",background:"transparent",border:`1px solid ${S.border}`,borderRadius:10,fontSize:10,fontWeight:700,cursor:"pointer",color:S.muted,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"inherit"}}>Schließen</button>
    </div>
  </div>;
}

// ─── Frühwarnsystem ───────────────────────────────────────────────────────────
function Fruehwarnung({checkins, callClaude, S}) {
  const [result,setResult]=useState(()=>{const v=ls.get("fw_result","null");return v!=="null"?JSON.parse(v):""});
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    const todayKey=new Date().toDateString();
    if(checkins.length>=5&&ls.get("fw_lastrun","")!==todayKey) runScan(true);
  },[checkins.length]);
  async function runScan(silent=false){
    if(checkins.length<3)return;
    if(!silent){setLoading(true);setError("");}
    try{
      const payload=checkins.slice(-10).map(c=>({date:fmtDate(c.date),mood:c.mood,urge:c.urge,sleep:c.sleep||"?",energy:c.energy||"?",risk:c.risk,suppsDone:c.suppsDone,trigger:c.trigger}));
      const txt=await callClaude(FRUEHWARNUNG_SYSTEM,JSON.stringify(payload));
      setResult(txt);ls.set("fw_result",JSON.stringify(txt));ls.set("fw_lastrun",new Date().toDateString());
    }catch(e){if(!silent)setError(e instanceof Error?e.message:"Fehler");}
    if(!silent)setLoading(false);
  }
  const isWarning=result&&!result.includes("✓ Stabil");
  return <NeonCard S={S} glow style={{marginBottom:14}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      <div><div style={{fontSize:12,fontWeight:800,letterSpacing:"0.05em"}}>KI-Frühwarnsystem</div><div style={{fontSize:9,color:S.muted,marginTop:2}}>{checkins.length>=3?`Letzte ${Math.min(checkins.length,10)} Einträge · auto`:"Mind. 3 Check-ins nötig"}</div></div>
      <button onPointerDown={()=>haptic.medium()} onClick={()=>runScan(false)} disabled={loading||checkins.length<3} style={{background:"transparent",color:loading?S.muted:S.gold,border:`1px solid ${loading?S.border:"rgba(255,215,0,0.35)"}`,borderRadius:8,padding:"8px 14px",fontSize:9,fontWeight:800,cursor:loading||checkins.length<3?"default":"pointer",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
        {loading?<Spinner S={S}/>:"▶ Scan"}
      </button>
    </div>
    {error&&<ErrorBox msg={error} S={S}/>}
    {isWarning&&<div style={{background:"rgba(255,77,109,0.07)",border:"1px solid rgba(255,77,109,0.25)",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:9,fontWeight:800,color:S.danger}}>⚠️ Trend erkannt</div>}
    {result?<div style={{fontSize:12,lineHeight:1.8,borderTop:`1px solid ${S.border}`,paddingTop:12}} dangerouslySetInnerHTML={{__html:mdHtml(result,S.neon)}}/>:<div style={{fontSize:11,color:S.muted}}>{checkins.length<3?"Mind. 3 Check-ins nötig.":"Noch nicht gelaufen."}</div>}
  </NeonCard>;
}

// ─── Wochenbericht ────────────────────────────────────────────────────────────
function Wochenbericht({checkins, callClaude, S}) {
  const [result,setResult]=useState(()=>{const v=ls.get("wb_result","null");return v!=="null"?JSON.parse(v):""});
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const last7=checkins.filter(c=>(new Date()-new Date(c.date))<7*24*60*60*1000);
  async function run(){
    if(!last7.length)return;haptic.medium();setLoading(true);setError("");
    try{
      const payload=last7.map(c=>({date:fmtDate(c.date),mood:c.mood,urge:c.urge,sleep:c.sleep||"?",energy:c.energy||"?",risk:c.risk,trigger:c.trigger,suppsDone:c.suppsDone}));
      const txt=await callClaude(WOCHENBERICHT_SYSTEM,JSON.stringify(payload));
      setResult(txt);ls.set("wb_result",JSON.stringify(txt));ls.set("wb_lastrun",new Date().toDateString());
      haptic.success();
    }catch(e){haptic.error();setError(e instanceof Error?e.message:"Fehler");}
    setLoading(false);
  }
  return <NeonCard S={S} glow style={{marginBottom:14}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      <div><div style={{fontSize:12,fontWeight:800,letterSpacing:"0.05em"}}>Wochenbericht</div><div style={{fontSize:9,color:S.muted,marginTop:2}}>KI · letzte 7 Tage · {last7.length} Einträge</div></div>
      <button onPointerDown={()=>haptic.medium()} onClick={run} disabled={loading||!last7.length} style={{background:"transparent",color:loading?S.muted:S.gold,border:`1px solid ${loading?S.border:"rgba(255,215,0,0.35)"}`,borderRadius:8,padding:"8px 14px",fontSize:9,fontWeight:800,cursor:loading||!last7.length?"default":"pointer",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
        {loading?<Spinner S={S}/>:"▶ Bericht"}
      </button>
    </div>
    {error&&<ErrorBox msg={error} S={S}/>}
    {!last7.length&&<div style={{fontSize:11,color:S.muted}}>Keine Einträge diese Woche.</div>}
    {result&&<div style={{fontSize:12,lineHeight:1.8,borderTop:`1px solid ${S.border}`,paddingTop:12}} dangerouslySetInnerHTML={{__html:mdHtml(result,S.neon)}}/>}
  </NeonCard>;
}

// ─── Trigger Heatmap ──────────────────────────────────────────────────────────
function TriggerHeatmap({checkins, S}) {
  const days=["Mo","Di","Mi","Do","Fr","Sa","So"];
  const hours=["0","3","6","9","12","15","18","21"];
  // Build heatmap: day(0-6) × timeSlot(0-7)
  const grid=Array.from({length:7},()=>Array(8).fill(0));
  const counts=Array.from({length:7},()=>Array(8).fill(0));
  checkins.forEach(c=>{
    const d=new Date(c.date);
    const dow=(d.getDay()+6)%7; // Mon=0
    const slot=Math.floor(d.getHours()/3);
    grid[dow][slot]+=c.urge;
    counts[dow][slot]++;
  });
  const maxVal=Math.max(1,...grid.flat().map((v,i)=>counts.flat()[i]>0?v/counts.flat()[i]:0));
  function cellColor(dow,slot) {
    if(!counts[dow][slot]) return S.bgInput;
    const avg=grid[dow][slot]/counts[dow][slot];
    const t=avg/10;
    if(t>0.7) return `rgba(255,77,109,${0.3+t*0.5})`;
    if(t>0.4) return `rgba(255,193,7,${0.3+t*0.4})`;
    return `rgba(0,255,157,${0.2+t*0.4})`;
  }
  const topTriggers=[...checkins].sort((a,b)=>b.urge-a.urge).slice(0,3);
  return <NeonCard S={S} style={{marginBottom:14}}>
    <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:12}}>Trigger-Heatmap</div>
    {checkins.length<3?<div style={{fontSize:11,color:S.muted}}>Mind. 3 Check-ins für Heatmap.</div>:<>
      {/* Time axis */}
      <div style={{display:"grid",gridTemplateColumns:"28px repeat(8,1fr)",gap:3,marginBottom:3}}>
        <div/>{hours.map(h=><div key={h} style={{fontSize:7,color:S.muted,textAlign:"center"}}>{h}h</div>)}
      </div>
      {/* Grid */}
      {days.map((day,dow)=><div key={day} style={{display:"grid",gridTemplateColumns:"28px repeat(8,1fr)",gap:3,marginBottom:3}}>
        <div style={{fontSize:8,color:S.muted,display:"flex",alignItems:"center"}}>{day}</div>
        {Array(8).fill(0).map((_,slot)=><div key={slot} style={{height:18,borderRadius:3,background:cellColor(dow,slot),border:`1px solid rgba(255,255,255,0.04)`,position:"relative"}} title={counts[dow][slot]?`Ø Drang: ${(grid[dow][slot]/counts[dow][slot]).toFixed(1)}`:""}/> )}
      </div>)}
      {/* Legend */}
      <div style={{display:"flex",gap:10,marginTop:8,flexWrap:"wrap"}}>
        {[{col:"rgba(0,255,157,0.4)",label:"Niedrig"},{col:"rgba(255,193,7,0.4)",label:"Mittel"},{col:"rgba(255,77,109,0.6)",label:"Hoch"},{col:S.bgInput,label:"Keine Daten"}].map(l=><div key={l.label} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:2,background:l.col}}/><span style={{fontSize:8,color:S.muted}}>{l.label}</span></div>)}
      </div>
      {/* Top triggers */}
      {topTriggers.length>0&&<div style={{marginTop:12,borderTop:`1px solid ${S.border}`,paddingTop:12}}>
        <div style={{fontSize:8,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Höchste Drang-Momente</div>
        {topTriggers.map((c,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:i<topTriggers.length-1?`1px solid ${S.border}`:"none"}}>
          <span style={{fontSize:9,fontFamily:"monospace",color:S.muted,width:28,flexShrink:0}}>{fmtDate(c.date)}</span>
          <div style={{flex:1,fontSize:11,color:S.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.trigger}</div>
          <span style={{fontSize:11,fontWeight:800,color:S.danger,fontFamily:"monospace",flexShrink:0}}>↑{c.urge}</span>
        </div>)}
      </div>}
    </>}
  </NeonCard>;
}

// ─── Notification Scheduler ───────────────────────────────────────────────────
async function scheduleSupplementNotifs(morningTime, eveningTime) {
  if(!("Notification" in window)||Notification.permission!=="granted") return;
  ls.set("notif_morning",JSON.stringify(morningTime));
  ls.set("notif_evening",JSON.stringify(eveningTime));
  ls.set("notif_enabled",JSON.stringify(true));
  const now=new Date();
  [[morningTime,"BALANX · Morgen-Supplements","Zeit für deine Morgen-Supplements ☀️"],[eveningTime,"BALANX · Abend-Supplements","Zeit für deine Abend-Supplements 🌙"]].forEach(([time,title,body])=>{
    const [h,m]=time.split(":").map(Number);
    const t=new Date();t.setHours(h,m,0,0);
    const ms=t-now;
    if(ms>0) setTimeout(()=>{if(Notification.permission==="granted") new Notification(title,{body});},ms);
  });
}

function NotifSettings({onClose, S}) {
  const [mTime,setMTime]=useState(()=>JSON.parse(ls.get("notif_morning",'"10:00"')));
  const [eTime,setETime]=useState(()=>JSON.parse(ls.get("notif_evening",'"19:00"')));
  const [saved,setSaved]=useState(false);
  async function save(){haptic.success();await scheduleSupplementNotifs(mTime,eTime);setSaved(true);setTimeout(()=>{setSaved(false);onClose();},1200);}
  return <NeonCard S={S} glow style={{marginBottom:14}}>
    <div style={{fontSize:11,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:16}}>◎ Supplement-Erinnerungen</div>
    {[{l:"Morgen-Supplements",k:"m",v:mTime,set:setMTime,c:S.morning},{l:"Abend-Supplements",k:"e",v:eTime,set:setETime,c:S.evening}].map(f=><div key={f.k} style={{marginBottom:14}}>
      <div style={{fontSize:9,color:S.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>{f.l}</div>
      <input type="time" value={f.v} onChange={e=>f.set(e.target.value)} style={{width:"100%",background:S.bgInput,border:`1px solid ${f.c}44`,borderRadius:8,padding:"10px 12px",fontSize:14,fontFamily:"monospace",fontWeight:800,color:f.c,outline:"none",colorScheme:"dark"}}/>
    </div>)}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <GlowBtn onClick={save} S={S}>{saved?"✓ Gespeichert":"Speichern"}</GlowBtn>
      <button onPointerDown={()=>haptic.light()} onClick={onClose} style={{padding:"15px",background:"transparent",border:`1px solid ${S.border}`,borderRadius:12,fontSize:12,fontWeight:800,cursor:"pointer",color:S.muted,fontFamily:"inherit",letterSpacing:"0.12em",textTransform:"uppercase"}}>Schließen</button>
    </div>
  </NeonCard>;
}

// ─── Schlaf-Korrelation ───────────────────────────────────────────────────────
function SchlafKorrelation({checkins, S}) {
  if(checkins.length < 4) return (
    <NeonCard S={S} style={{marginBottom:14}}>
      <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:6}}>Schlaf vs. Drang</div>
      <div style={{fontSize:11,color:S.muted}}>Mind. 4 Check-ins mit Schlaf-Daten nötig.</div>
    </NeonCard>
  );

  const withSleep = checkins.filter(c=>c.sleep!=null&&c.sleep>0);
  if(withSleep.length < 3) return (
    <NeonCard S={S} style={{marginBottom:14}}>
      <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:6}}>Schlaf vs. Drang</div>
      <div style={{fontSize:11,color:S.muted}}>Schlaf-Daten noch nicht ausreichend. Nach dem nächsten Check-in verfügbar.</div>
    </NeonCard>
  );

  // Group by sleep buckets: <5h, 5-6h, 6-7h, 7-8h, >8h
  const buckets = [
    {label:"<5h", min:0,  max:5,  data:[]},
    {label:"5-6h",min:5,  max:6,  data:[]},
    {label:"6-7h",min:6,  max:7,  data:[]},
    {label:"7-8h",min:7,  max:8,  data:[]},
    {label:">8h", min:8,  max:99, data:[]},
  ];
  withSleep.forEach(c=>{
    const b = buckets.find(b=>c.sleep>=b.min&&c.sleep<b.max);
    if(b) b.data.push(c.urge);
  });

  const maxAvg = Math.max(...buckets.filter(b=>b.data.length).map(b=>b.data.reduce((s,v)=>s+v,0)/b.data.length), 1);

  // Pearson correlation
  const n=withSleep.length;
  const meanSleep=withSleep.reduce((s,c)=>s+c.sleep,0)/n;
  const meanUrge=withSleep.reduce((s,c)=>s+c.urge,0)/n;
  const num=withSleep.reduce((s,c)=>s+(c.sleep-meanSleep)*(c.urge-meanUrge),0);
  const den=Math.sqrt(withSleep.reduce((s,c)=>s+(c.sleep-meanSleep)**2,0)*withSleep.reduce((s,c)=>s+(c.urge-meanUrge)**2,0));
  const r = den>0 ? (num/den).toFixed(2) : "–";
  const rNum = parseFloat(r);
  const rLabel = isNaN(rNum) ? "–" : rNum < -0.3 ? "negativer Zusammenhang (gut)" : rNum > 0.3 ? "positiver Zusammenhang (Achtung)" : "kein klarer Zusammenhang";

  return (
    <NeonCard S={S} style={{marginBottom:14}}>
      <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:12}}>Schlaf vs. Drang · {withSleep.length} Messpunkte</div>

      {/* Bar chart */}
      <div style={{display:"flex",alignItems:"flex-end",gap:6,height:80,marginBottom:10}}>
        {buckets.map(b=>{
          if(!b.data.length) return <div key={b.label} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div style={{flex:1,width:"100%",background:S.bgInput,borderRadius:4,minHeight:4}}/>
            <span style={{fontSize:7,color:S.muted}}>{b.label}</span>
          </div>;
          const avg=b.data.reduce((s,v)=>s+v,0)/b.data.length;
          const pct=avg/10;
          const col=avg>=7?S.danger:avg>=4?"#ffc107":S.success;
          return <div key={b.label} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div style={{fontSize:8,fontWeight:800,color:col,fontFamily:"monospace"}}>{avg.toFixed(1)}</div>
            <div style={{flex:1,width:"100%",display:"flex",alignItems:"flex-end"}}>
              <div style={{width:"100%",background:col,borderRadius:"3px 3px 0 0",height:`${Math.max(pct*100,8)}%`,boxShadow:`0 0 6px ${col}66`,transition:"height 0.5s ease"}}/>
            </div>
            <span style={{fontSize:7,color:S.muted}}>{b.label}</span>
            <span style={{fontSize:6,color:S.muted}}>n={b.data.length}</span>
          </div>;
        })}
      </div>

      {/* Correlation */}
      <div style={{borderTop:`1px solid ${S.border}`,paddingTop:10,display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontSize:18,fontWeight:900,fontFamily:"monospace",color:isNaN(rNum)?S.muted:rNum<-0.3?S.success:rNum>0.3?S.danger:"#ffc107",textShadow:`0 0 8px currentColor`}}>r={r}</div>
        <div style={{fontSize:10,color:S.muted,lineHeight:1.5,flex:1}}>{rLabel}</div>
      </div>
      <div style={{fontSize:9,color:S.muted,marginTop:6}}>Balken = Ø Drang-Level pro Schlaf-Kategorie. Tiefere Balken = besser.</div>
    </NeonCard>
  );
}

// ─── Werte-Modul ─────────────────────────────────────────────────────────────
const WERTE_POOL = ["Familie","Gesundheit","Freiheit","Geld","Selbstrespekt","Zukunft","Klarheit","Beziehungen","Sport","Arbeit","Würde","Kreativität"];

function WerteModul({values, onChange, S}) {
  const [custom, setCustom] = useState("");
  function toggle(v){values.includes(v)?onChange(values.filter(x=>x!==v)):values.length<6&&onChange([...values,v]);}
  function addCustom(){if(!custom.trim()||values.length>=6)return;haptic.success();onChange([...values,custom.trim()]);setCustom("");}
  return (
    <div style={{animation:"fadeUp 0.35s ease both"}}>
      <NeonCard S={S} glow style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:800,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>Deine Werte</div>
        <div style={{fontSize:10,color:S.muted,marginBottom:14,lineHeight:1.6}}>
          Bis zu 6 wählen. Erscheinen im SOS-Screen wenn du sie brauchst.
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
          {WERTE_POOL.map(v=>{const sel=values.includes(v);return(
            <button key={v} onPointerDown={()=>haptic.light()} onClick={()=>toggle(v)}
              style={{padding:"6px 12px",borderRadius:20,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${sel?S.neon:S.border}`,background:sel?S.neonGlow:"transparent",color:sel?S.neon:S.muted,transition:"all 0.15s"}}>
              {v}
            </button>
          );})}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:values.length>0?14:0}}>
          <input value={custom} onChange={e=>setCustom(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCustom()} placeholder="Eigener Wert…"
            style={{flex:1,background:S.bgInput,border:`1px solid ${S.border}`,borderRadius:8,padding:"8px 10px",fontSize:12,color:S.text,fontFamily:"inherit",outline:"none"}}/>
          <button onPointerDown={()=>haptic.light()} onClick={addCustom} disabled={!custom.trim()||values.length>=6}
            style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${S.neonBorder}`,background:"transparent",fontSize:13,fontWeight:800,cursor:"pointer",color:S.neon,fontFamily:"inherit"}}>+</button>
        </div>
        {values.length>0&&(
          <div>
            <div style={{fontSize:8,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Deine Auswahl</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {values.map(v=>(
                <div key={v} style={{display:"flex",alignItems:"center",gap:5,background:S.neonGlow,border:`1px solid ${S.neonBorder}`,borderRadius:20,padding:"4px 10px"}}>
                  <span style={{fontSize:10,fontWeight:700,color:S.neon}}>{v}</span>
                  <button onPointerDown={()=>haptic.light()} onClick={()=>onChange(values.filter(x=>x!==v))} style={{background:"none",border:"none",color:S.muted,cursor:"pointer",fontSize:12,padding:0,lineHeight:1}}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </NeonCard>

      {/* Preview how it looks in SOS */}
      {values.length>0&&(
        <NeonCard S={S} style={{marginBottom:14}}>
          <div style={{fontSize:9,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>So erscheinen sie im SOS-Screen</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {values.map((v,i)=><div key={i} style={{background:"rgba(180,77,255,0.08)",border:`1px solid rgba(180,77,255,0.3)`,borderRadius:20,padding:"5px 12px",fontSize:11,fontWeight:700,color:"#b44dff"}}>{v}</div>)}
          </div>
        </NeonCard>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function StreakBadge({value, label, color}) {
  if(!value) return null;
  return <div style={{display:"flex",alignItems:"center",gap:5,background:`${color}11`,border:`1px solid ${color}33`,borderRadius:20,padding:"4px 10px"}}>
    <span style={{fontSize:12}}>🔥</span>
    <span style={{fontSize:10,fontWeight:800,color,fontFamily:"monospace"}}>{value}</span>
    <span style={{fontSize:7,color:"#6b6485",textTransform:"uppercase",letterSpacing:"0.1em"}}>{label}</span>
  </div>;
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [ready,setReady]         = useState(false);
  const [onboarded,setOnboarded] = useState(false);
  const [profile,setProfile]     = useState({name:"",identity:"",kiModus:"direkt",soberStart:""});
  const [showSettings,setShowSettings] = useState(false);

  const [tab,setTab]             = useState("supps");
  const [checkSubTab,setCheckSubTab] = useState("check");
  const [suppsSubTab,setSuppsSubTab] = useState("list"); // "list" | "morgen" | "abend" | "info"
  const [verlaufSubTab,setVerlaufSubTab] = useState("verlauf"); // "verlauf" | "monat"
  const [suppChecked,setSuppChecked] = useState({});
  const [soberToday,setSoberToday]   = useState(null);
  const [showRelapse,setShowRelapse] = useState(false);
  const [ci,setCi]               = useState({mood:6,urge:3,sleep:7,energy:6,trigger:"",context:""});
  const [ciStep,setCiStep]       = useState("form");
  const [ciResult,setCiResult]   = useState("");
  const [ciRisk,setCiRisk]       = useState(null);
  const [ciError,setCiError]     = useState("");
  const [checkins,setCheckins]   = useState([]);
  const [relapses,setRelapses]   = useState([]);
  const [patternResult,setPatternResult] = useState("");
  const [patternLoading,setPatternLoading] = useState(false);
  const [patternError,setPatternError]     = useState("");
  const [notifStatus,setNotifStatus]       = useState("idle");
  const [denkModus,setDenkModus]   = useState("analyse");
  const [denkSubTab,setDenkSubTab] = useState("denken"); // "denken" | "werte"
  const [denkInput,setDenkInput]   = useState("");
  const [denkResult,setDenkResult] = useState("");
  const [denkLoading,setDenkLoading] = useState(false);
  const [supplements, setSupplements] = useState(DEFAULT_SUPPLEMENTS);
  const [showSOS,setShowSOS]         = useState(false);
  const [values,setValues]           = useState([]);
  const [showNotifSettings,setShowNotifSettings] = useState(false);

  const lastRisk  = checkins.length ? checkins[checkins.length-1]?.risk : null;
  const S         = buildTheme(lastRisk);
  const soberDays = calcSoberDays(checkins, relapses);

  useEffect(()=>{
    const p=ls.get("profile","null");
    if(p!=="null"){try{setProfile(JSON.parse(p));setOnboarded(true);}catch{}}
    setSuppChecked(JSON.parse(ls.get("supp_"+DAY_KEY())));
    setCheckins(JSON.parse(ls.get("checkins","[]")));
    setRelapses(JSON.parse(ls.get("relapses","[]")));
    setValues(JSON.parse(ls.get("user_values","[]")));
    const savedSupps = ls.get("supplements","null");
    if(savedSupps!=="null"){try{setSupplements(JSON.parse(savedSupps));}catch{}}
    if(!("Notification" in window)) setNotifStatus("unsupported");
    else if(Notification.permission==="granted"){
      setNotifStatus("granted");
      const enabled=JSON.parse(ls.get("notif_enabled","false"));
      if(enabled){const m=JSON.parse(ls.get("notif_morning",'"10:00"'));const e=JSON.parse(ls.get("notif_evening",'"19:00"'));scheduleSupplementNotifs(m,e);}
    }
    else if(Notification.permission==="denied")  setNotifStatus("denied");
    setReady(true);
  },[]);

  // Milestone haptic on first visit today when new milestone reached
  useEffect(()=>{
    if(!soberDays||!ready) return;
    const reached=getReachedMilestones(soberDays);
    const latest=reached[reached.length-1];
    if(!latest) return;
    const key=`milestone_shown_${latest.days}`;
    if(!ls.get(key,"")){ haptic.success(); ls.set(key,"1"); }
  },[soberDays,ready]);

  const prevRisk=useRef(null);
  useEffect(()=>{
    if(ciRisk&&ciRisk!==prevRisk.current){
      if(ciRisk==="hoch") haptic.error();
      else if(ciRisk==="mittel") haptic.heavy();
      else haptic.success();
      prevRisk.current=ciRisk;
    }
  },[ciRisk]);

  function saveSupplements(newSupps) {
    setSupplements(newSupps);
    ls.set("supplements", JSON.stringify(newSupps));
    // clean up checked state for removed items
    const allIds = new Set([...newSupps.morning,...newSupps.evening].map(s=>s.id));
    setSuppChecked(prev=>{
      const next=Object.fromEntries(Object.entries(prev).filter(([k])=>allIds.has(k)));
      ls.set("supp_"+DAY_KEY(),JSON.stringify(next));
      return next;
    });
  }
  function saveValues(v){setValues(v);ls.set("user_values",JSON.stringify(v));}

  const totalSupps = supplements.morning.length + supplements.evening.length;
  const hasRelapseToday=relapses.some(r=>new Date(r.date).toDateString()===new Date().toDateString());
  const urgeIntensity=ci.urge/10;
  const checkTabLabel=checkSubTab==="journal"?"Journal":checkSubTab==="plans"?"Wenn-Dann":"Check-in";
  const {checkinStreak, suppStreak} = calcStreaks(checkins);

  const toggleSupp=useCallback((id)=>{
    setSuppChecked(prev=>{const next={...prev,[id]:!prev[id]};ls.set("supp_"+DAY_KEY(),JSON.stringify(next));if(Object.values(next).filter(Boolean).length===totalSupps)haptic.success();return next;});
  },[]);

  const callClaude=useCallback(async(system,content)=>{
    const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system,prompt:content})});
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||"API Fehler");
    return data.text??"";
  },[]);

  async function submitCheckin(){
    if(!ci.trigger.trim()) return;
    haptic.medium();setCiStep("loading");setCiError("");
    try{
      const msg=`Check-in:\n- Wohlbefinden: ${ci.mood}/10\n- Drang: ${ci.urge}/10\n- Schlaf: ${ci.sleep}h\n- Energie: ${ci.energy}/10\n- Trigger: ${ci.trigger}\n- Kontext: ${ci.context||"–"}`;
      const txt=await callClaude(buildCheckinSystem(profile.kiModus||"direkt"),msg);
      const risk=parseRisk(txt);
      setCiResult(txt);setCiRisk(risk);setCiStep("result");
      const entry={date:new Date().toISOString(),mood:ci.mood,urge:ci.urge,sleep:ci.sleep,energy:ci.energy,risk,trigger:ci.trigger,response:txt,suppsDone:doneSupps};
      setCheckins(prev=>{const next=[...prev,entry];ls.set("checkins",JSON.stringify(next.slice(-30)));return next;});
      setPatternResult("");
    }catch(e){haptic.error();setCiError(e instanceof Error?e.message:"Fehler");setCiStep("form");}
  }

  function resetCheckin(){haptic.light();setCiStep("form");setCiResult("");setCiRisk(null);setCi({mood:6,urge:3,sleep:7,energy:6,trigger:"",context:""});setSoberToday(null);setShowRelapse(false);}

  async function runPattern(){
    if(checkins.length<2) return;haptic.medium();
    setPatternLoading(true);setPatternError("");
    try{
      const payload=checkins.slice(-14).map(c=>({date:fmtDate(c.date),mood:c.mood,urge:c.urge,risk:c.risk,trigger:c.trigger}));
      setPatternResult(await callClaude(PATTERN_SYSTEM,JSON.stringify(payload)));haptic.success();
    }catch(e){haptic.error();setPatternError(e instanceof Error?e.message:"Fehler");}
    setPatternLoading(false);
  }

  async function submitDenken(){
    if(!denkInput.trim()) return;haptic.medium();
    setDenkLoading(true);setDenkError("");setDenkResult("");
    const modus=DENK_MODI.find(m=>m.id===denkModus);
    try{setDenkResult(await callClaude(modus.system,denkInput));haptic.success();}
    catch(e){haptic.error();setDenkError(e instanceof Error?e.message:"Fehler");}
    setDenkLoading(false);
  }

  async function enableReminder(){
    if(!("Notification" in window)) return;haptic.medium();
    const perm=await Notification.requestPermission();
    if(perm==="granted"){setNotifStatus("granted");haptic.success();setTimeout(()=>new Notification("BALANX · Check-in",{body:"Dein täglicher Check-in wartet."}),100);}
    else{setNotifStatus("denied");haptic.error();}
  }

  function exportCSV(){
    haptic.medium();
    const rows=checkins.map(c=>{const d=new Date(c.date);return[fmtDate(c.date),d.toLocaleDateString("de-DE",{weekday:"long"}),c.mood,c.urge,c.sleep||"",c.energy||"",c.risk||"",c.suppsDone,`"${c.trigger.replace(/"/g,'""')}"`].join(",");});
    const csv="Datum,Wochentag,Stimmung,Drang,Schlaf,Energie,Risiko,Supplements,Trigger\n"+rows.join("\n");
    const a=Object.assign(document.createElement("a"),{href:URL.createObjectURL(new Blob([csv],{type:"text/csv"})),download:"recovery-export.csv"});
    document.body.appendChild(a);a.click();document.body.removeChild(a);
  }

  const chartData=checkins.slice(-14).map(c=>({date:fmtDate(c.date),Stimmung:c.mood,Drang:c.urge}));
  const avgMood=checkins.length?(checkins.reduce((s,c)=>s+c.mood,0)/checkins.length).toFixed(1):"–";
  const avgUrge=checkins.length?(checkins.reduce((s,c)=>s+c.urge,0)/checkins.length).toFixed(1):"–";

  if(!ready) return null;
  if(!onboarded) return <Onboarding onDone={()=>{setProfile(JSON.parse(ls.get("profile","{}")));setOnboarded(true);}}/>;

  return (
    <div style={{minHeight:"100vh",background:S.bg,fontFamily:"'SF Mono','Fira Code',monospace",color:S.text,maxWidth:430,margin:"0 auto",position:"relative",display:"flex",flexDirection:"column",transition:"background 0.8s"}}>
      <style>{`
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        input[type=range]{-webkit-appearance:none;appearance:none;cursor:pointer}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:4px;background:${S.neon};box-shadow:0 0 10px ${S.neon};transition:background 0.5s,box-shadow 0.5s}
        textarea,input{font-family:inherit}
        textarea{resize:none;outline:none;border:none}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}
        @keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(200vh)}}
        @keyframes riskPulse{0%,100%{opacity:0.4}50%{opacity:1}}
        @keyframes pulseDot{0%,100%{transform:translateX(10px) scale(1)}50%{transform:translateX(10px) scale(1.4)}}
        @keyframes sosPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,77,109,0.5)}60%{box-shadow:0 0 0 10px rgba(255,77,109,0)}}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:${S.bg}}
        ::-webkit-scrollbar-thumb{background:${S.neonBorder};border-radius:2px}
      `}</style>

      <RiskOverlay risk={lastRisk}/>
      <div style={{position:"fixed",top:0,left:0,right:0,height:"120px",background:`linear-gradient(transparent,${S.scanlineColor},transparent)`,animation:"scanline 5s linear infinite",pointerEvents:"none",zIndex:10,transition:"background 0.8s"}}/>
      <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"60%",height:1,background:S.neon,boxShadow:`0 0 40px 8px ${S.neon}`,opacity:0.6,pointerEvents:"none",zIndex:10,transition:"background 0.6s,box-shadow 0.6s"}}/>

      {showSettings&&<SettingsPanel profile={profile} onSave={p=>{setProfile(p);ls.set("profile",JSON.stringify(p));}} onClose={()=>setShowSettings(false)} S={S}/>}
      {showSOS&&<SOSScreen onClose={()=>setShowSOS(false)} values={values} lastRisk={lastRisk} S={S}/>}

      {/* SOS Floating Button */}
      <button onPointerDown={()=>haptic.error()} onClick={()=>setShowSOS(true)} style={{
        position:"fixed",bottom:88,right:14,zIndex:200,
        width:52,height:52,borderRadius:"50%",
        background:`radial-gradient(circle,${S.danger}18,${S.bg})`,
        border:`2px solid ${S.danger}`,
        color:S.danger,fontSize:9,fontWeight:900,fontFamily:"inherit",
        cursor:"pointer",letterSpacing:"0.05em",
        animation:"sosPulse 2.5s ease-in-out infinite",
        display:"flex",alignItems:"center",justifyContent:"center",
      }}>SOS</button>

      <div style={{flex:1,overflowY:"auto",padding:"28px 16px 96px"}} style={{filter:tab==="checkin"&&urgeIntensity>0.6?`brightness(${1+urgeIntensity*0.4})`:"none"}}>

        {/* Header */}
        <div style={{marginBottom:20,animation:"fadeUp 0.4s ease both"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <div style={{fontSize:9,color:S.muted,letterSpacing:"0.2em",textTransform:"uppercase"}}>▸ {new Date().toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long"})}</div>
            <button onPointerDown={()=>haptic.light()} onClick={()=>setShowSettings(true)}
              style={{background:"transparent",border:`1px solid ${S.border}`,borderRadius:6,padding:"4px 8px",fontSize:9,cursor:"pointer",color:S.muted,fontFamily:"inherit",letterSpacing:"0.08em",display:"flex",alignItems:"center",gap:4}}>
              ⚙ {profile.name||"Einstellungen"}
            </button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:3,height:30,background:S.neon,borderRadius:2,boxShadow:`0 0 12px ${S.neon}`,transition:"background 0.5s,box-shadow 0.5s"}}/>
            <h1 style={{fontSize:22,fontWeight:800,letterSpacing:"0.06em",margin:0,textTransform:"uppercase",color:S.text}}>
              {tab==="checkin"?checkTabLabel:{supps:suppsSubTab==="morgen"?"Morgen":suppsSubTab==="abend"?"Abend":suppsSubTab==="info"?"Info":"Supplements",verlauf:verlaufSubTab==="monat"?"Monat":"Verlauf",denken:denkSubTab==="werte"?"Werte":"Denken"}[tab]}
            </h1>
            {lastRisk&&(
              <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5,background:RISK_META[lastRisk].bg,border:`1px solid ${RISK_META[lastRisk].border}`,borderRadius:20,padding:"3px 10px"}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:RISK_META[lastRisk].dot,boxShadow:`0 0 5px ${RISK_META[lastRisk].dot}`,animation:"riskPulse 2s ease-in-out infinite"}}/>
                <span style={{fontSize:8,fontWeight:800,color:RISK_META[lastRisk].text,letterSpacing:"0.08em",textTransform:"uppercase"}}>{lastRisk}</span>
              </div>
            )}
          </div>
          {/* Adaptive greeting */}
          {tab==="supps"&&<AdaptiveGreeting profile={profile} checkins={checkins} relapses={relapses} doneSupps={doneSupps} callClaude={callClaude} S={S}/>}
          {/* Streak badges */}
          {(suppStreak>0||checkinStreak>0)&&(
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
              {suppStreak>0&&<StreakBadge value={suppStreak}     label="Supps"    color={S.morning}/>}
              {checkinStreak>0&&<StreakBadge value={checkinStreak} label="Check-ins" color={S.neon}/>}
            </div>
          )}
        </div>

        {/* ── SUPPLEMENTS ── */}
        {tab==="supps"&&(
          <div style={{animation:"fadeUp 0.35s ease both"}}>
            {/* Sub-tab switcher */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:5,marginBottom:14}}>
              {[
                {id:"list",  label:"Liste",   icon:"◎"},
                {id:"morgen",label:"Morgen",  icon:"▸"},
                {id:"abend", label:"Abend",   icon:"◌"},
                {id:"info",  label:"Info",    icon:"◈"},
              ].map(st=>(
                <button key={st.id} onPointerDown={()=>haptic.light()} onClick={()=>setSuppsSubTab(st.id)}
                  style={{padding:"8px 4px",borderRadius:10,border:`1px solid ${suppsSubTab===st.id?S.neon:S.border}`,background:suppsSubTab===st.id?S.neonGlow:"transparent",color:suppsSubTab===st.id?S.neon:S.muted,fontSize:7,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:3,letterSpacing:"0.08em",textTransform:"uppercase",boxShadow:suppsSubTab===st.id?`0 0 12px ${S.neonGlow}`:"none",transition:"all 0.2s"}}>
                  <span style={{fontSize:12}}>{st.icon}</span>{st.label}
                </button>
              ))}
            </div>

            {suppsSubTab==="list"&&(<>
              {/* Milestone */}
              <MilestoneCard soberDays={soberDays} name={profile.name} S={S}/>

              <NeonCard S={S} glow style={{marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase"}}>Fortschritt</span>
                  <span style={{fontFamily:"monospace",fontSize:14,color:S.neon,textShadow:`0 0 10px ${S.neon}`,transition:"color 0.5s"}}>{doneSupps} / {totalSupps}</span>
                </div>
                <div style={{height:3,background:S.bgInput,borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:4,background:`linear-gradient(90deg,${S.neon},${S.cyan})`,width:`${(doneSupps/totalSupps)*100}%`,boxShadow:`0 0 8px ${S.neon}`,transition:"width 0.4s ease,background 0.5s"}}/>
                </div>
              </NeonCard>

              {[{label:"10:00 Uhr",sub:"mit Essen",items:supplements.morning,accent:S.morning},{label:"19–20 Uhr",sub:"zum Abendbrot",items:supplements.evening,accent:S.evening}].map(sec=>(
                <div key={sec.label} style={{marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,paddingBottom:8}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:sec.accent,boxShadow:`0 0 8px ${sec.accent}`}}/>
                    <span style={{fontSize:12,fontWeight:800,color:sec.accent,letterSpacing:"0.08em",textTransform:"uppercase",textShadow:`0 0 8px ${sec.accent}88`}}>{sec.label}</span>
                    <span style={{fontSize:9,color:S.muted,marginLeft:"auto"}}>{sec.sub}</span>
                  </div>
                  <NeonCard S={S} style={{padding:"0 16px"}}>
                    {sec.items.map(s=><SuppItem key={s.id} item={s} checked={!!suppChecked[s.id]} onToggle={()=>toggleSupp(s.id)} accent={sec.accent} S={S}/>)}
                  </NeonCard>
                </div>
              ))}

              {doneSupps===totalSupps&&(
                <NeonCard S={S} glow style={{textAlign:"center",padding:"24px",marginBottom:14,border:`1px solid ${S.success}`,animation:"fadeUp 0.3s ease both"}}>
                  <div style={{fontSize:26,color:S.success,textShadow:`0 0 20px ${S.success}`,marginBottom:6}}>✓</div>
                  <div style={{fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",color:S.success}}>System vollständig</div>
                </NeonCard>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
                <button onPointerDown={()=>haptic.light()} onClick={()=>{setSuppChecked({});ls.set("supp_"+DAY_KEY(),"{}");}}
                  style={{padding:"13px",background:"transparent",border:`1px solid ${S.border}`,borderRadius:10,fontSize:10,fontWeight:700,cursor:"pointer",color:S.muted,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"inherit"}}>
                  ↺ Reset
                </button>
                <button onPointerDown={()=>haptic.light()} onClick={notifStatus==="granted"?()=>setShowNotifSettings(s=>!s):async()=>{const p=await Notification.requestPermission();if(p==="granted"){setNotifStatus("granted");setShowNotifSettings(true);}else setNotifStatus("denied");}} disabled={notifStatus==="unsupported"||notifStatus==="denied"}
                  style={{padding:"13px",background:notifStatus==="granted"?S.neonGlow:"transparent",border:`1px solid ${notifStatus==="granted"?S.neonBorder:S.border}`,borderRadius:10,fontSize:9,fontWeight:800,cursor:notifStatus==="denied"?"default":"pointer",color:notifStatus==="granted"?S.neon:S.muted,fontFamily:"inherit",letterSpacing:"0.08em",textTransform:"uppercase"}}>
                  {notifStatus==="granted"?"◎ Zeiten":"◎ Reminder"}
                </button>
              </div>
              {notifStatus==="denied"&&<div style={{fontSize:9,color:S.danger,textAlign:"center",marginTop:8}}>Benachrichtigungen blockiert.</div>}
              {showNotifSettings&&notifStatus==="granted"&&<div style={{marginTop:10}}><NotifSettings onClose={()=>setShowNotifSettings(false)} S={S}/></div>}
            </>)}

            {suppsSubTab==="morgen"&&<MorgenProtokoll profile={profile} checkins={checkins} doneSupps={doneSupps} callClaude={callClaude} S={S}/>}
            {suppsSubTab==="abend"&&<AbendDebrief profile={profile} checkins={checkins} doneSupps={doneSupps} callClaude={callClaude} S={S}/>}
            {suppsSubTab==="info"&&<SuppInfoPage S={S} supplements={supplements} onSaveSupplements={saveSupplements}/>}
          </div>
        )}

        {/* ── CHECK + JOURNAL TAB ── */}
        {tab==="checkin"&&(
          <div style={{animation:"fadeUp 0.35s ease both"}}>
            {/* Sub-tab switcher */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:16}}>
              {[{id:"check",label:"Check-in",icon:"◈"},{id:"journal",label:"Journal",icon:"✦"},{id:"plans",label:"Wenn-Dann",icon:"→"}].map(st=>(
                <button key={st.id} onPointerDown={()=>haptic.light()} onClick={()=>setCheckSubTab(st.id)}
                  style={{padding:"10px 4px",borderRadius:10,border:`1px solid ${checkSubTab===st.id?S.neon:S.border}`,background:checkSubTab===st.id?S.neonGlow:"transparent",color:checkSubTab===st.id?S.neon:S.muted,fontSize:8,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:4,letterSpacing:"0.08em",textTransform:"uppercase",boxShadow:checkSubTab===st.id?`0 0 14px ${S.neonGlow}`:"none",transition:"all 0.2s"}}>
                  <span style={{fontSize:14}}>{st.icon}</span>{st.label}
                </button>
              ))}
            </div>

            {checkSubTab==="check"&&(<>
              {soberToday===null&&!showRelapse&&(
                <NeonCard S={S} glow style={{marginBottom:16,textAlign:"center",padding:"28px 20px"}}>
                  <div style={{fontSize:11,fontWeight:800,color:S.text,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>Heute nüchtern?</div>
                  <div style={{fontSize:10,color:S.muted,marginBottom:20}}>Ehrliche Antwort. Kein Urteil.</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <button onPointerDown={()=>haptic.medium()} onClick={()=>{haptic.success();setSoberToday(true);}}
                      style={{padding:"18px",borderRadius:12,border:`1px solid ${S.success}`,background:`${S.success}11`,color:S.success,fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 0 16px ${S.success}33`}}>✓ Ja</button>
                    <button onPointerDown={()=>haptic.medium()} onClick={()=>{haptic.heavy();setSoberToday(false);setShowRelapse(true);}}
                      style={{padding:"18px",borderRadius:12,border:`1px solid ${S.danger}`,background:`${S.danger}11`,color:S.danger,fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 0 16px ${S.danger}33`}}>Nein</button>
                  </div>
                </NeonCard>
              )}

              {showRelapse&&<RelapseReview onDone={()=>{setShowRelapse(false);setSoberToday(false);setRelapses(JSON.parse(ls.get("relapses","[]")));}} callClaude={callClaude} S={S}/>}

              {soberToday!==null&&!showRelapse&&(<>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,padding:"8px 12px",borderRadius:10,background:soberToday?`${S.success}0A`:`${S.danger}0A`,border:`1px solid ${soberToday?S.success:S.danger}22`}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:soberToday?S.success:S.danger,boxShadow:`0 0 5px ${soberToday?S.success:S.danger}`}}/>
                  <span style={{fontSize:9,fontWeight:700,color:soberToday?S.success:S.danger,letterSpacing:"0.1em",textTransform:"uppercase"}}>{soberToday?"Heute nüchtern":"Rückfall heute"}</span>
                  <button onPointerDown={()=>haptic.light()} onClick={()=>{setSoberToday(null);setShowRelapse(false);}} style={{marginLeft:"auto",background:"none",border:"none",color:S.muted,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>ändern</button>
                </div>

                {ciStep==="form"&&<>
                  {ci.urge>=7&&(
                    <div style={{background:"rgba(255,77,109,0.06)",border:"1px solid rgba(255,77,109,0.2)",borderRadius:10,padding:"8px 12px",marginBottom:10,fontSize:10,color:"#ff6b85",display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:14,animation:"pulse 1.5s ease-in-out infinite"}}>⚠️</span>
                      <span>Hoher Drang. Hol tief Luft.</span>
                    </div>
                  )}
                  {ci.sleep<=4&&(
                    <div style={{background:"rgba(255,193,7,0.06)",border:"1px solid rgba(255,193,7,0.25)",borderRadius:10,padding:"8px 12px",marginBottom:10,fontSize:10,color:"#ffc107",display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:14}}>😴</span>
                      <span>Schlafmangel erhöht Rückfallrisiko. Heute achtsam bleiben.</span>
                    </div>
                  )}
                  <NeonCard S={S} glow style={{marginBottom:10}}>
                    <SliderField label="Wohlbefinden" min={1} max={10} low="Schlecht" high="Gut"  value={ci.mood}   onChange={v=>setCi(c=>({...c,mood:v}))}   color={S.cyan} S={S}/>
                    <SliderField label="Drang-Stärke" min={0} max={10} low="Keiner"  high="Stark" value={ci.urge}   onChange={v=>setCi(c=>({...c,urge:v}))}   color={ci.urge>=8?S.danger:ci.urge>=5?"#ffc107":S.success} S={S}/>
                    <SliderField label="Schlaf (Std)" min={0} max={12} low="0h"      high="12h"   value={ci.sleep}  onChange={v=>setCi(c=>({...c,sleep:v}))}  color={ci.sleep<=5?"#ffc107":ci.sleep<=3?S.danger:S.cyan} S={S}/>
                    <SliderField label="Energie"      min={1} max={10} low="Leer"    high="Voll"  value={ci.energy} onChange={v=>setCi(c=>({...c,energy:v}))} color={S.morning} S={S}/>
                  </NeonCard>
                  <NeonCard S={S} style={{marginBottom:10}}>
                    <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>Was hat heute getriggert?</div>
                    <textarea rows={3} placeholder="z.B. Stress, Langeweile, Schlafmangel…" value={ci.trigger} onChange={e=>setCi(c=>({...c,trigger:e.target.value}))}
                      style={{width:"100%",background:S.bgInput,borderRadius:8,padding:"10px 12px",fontSize:13,lineHeight:1.6,color:S.text}}/>
                  </NeonCard>
                  <NeonCard S={S} style={{marginBottom:14}}>
                    <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>Kontext (optional)</div>
                    <textarea rows={2} placeholder="Schlaf, Essen, besonderes Ereignis…" value={ci.context} onChange={e=>setCi(c=>({...c,context:e.target.value}))}
                      style={{width:"100%",background:S.bgInput,borderRadius:8,padding:"10px 12px",fontSize:13,lineHeight:1.6,color:S.text}}/>
                  </NeonCard>
                  <div style={{fontSize:9,color:S.muted,textAlign:"center",marginBottom:12,letterSpacing:"0.1em"}}>◎ {doneSupps}/{totalSupps} Supplements · {profile.kiModus||"direkt"} Modus</div>
                  {ciError&&<ErrorBox msg={ciError} S={S}/>}
                  <GlowBtn onClick={submitCheckin} disabled={!ci.trigger.trim()} S={S}>◈ Auswerten</GlowBtn>
                </>}

                {ciStep==="loading"&&(
                  <div style={{textAlign:"center",padding:"70px 0"}}>
                    <div style={{width:40,height:40,border:`2px solid ${S.neonBorder}`,borderTopColor:S.neon,borderRadius:"50%",animation:"spin 0.6s linear infinite",margin:"0 auto 16px",boxShadow:`0 0 20px ${S.neonGlow}`}}/>
                    <p style={{color:S.muted,fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase",animation:"pulse 1.5s ease infinite"}}>Analyse läuft…</p>
                  </div>
                )}

                {ciStep==="result"&&<>
                  {ciRisk&&(
                    <div style={{background:RISK_META[ciRisk].bg,borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,marginBottom:12,border:`1px solid ${RISK_META[ciRisk].border}`,animation:ciRisk==="hoch"?"riskPulse 2s ease-in-out infinite":"fadeUp 0.3s ease both"}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:RISK_META[ciRisk].dot,boxShadow:`0 0 10px ${RISK_META[ciRisk].dot}`,flexShrink:0,animation:"riskPulse 2s ease-in-out infinite"}}/>
                      <span style={{fontSize:10,fontWeight:800,color:RISK_META[ciRisk].text,letterSpacing:"0.1em",textTransform:"uppercase"}}>Risiko: {ciRisk}</span>
                    </div>
                  )}
                  <NeonCard S={S} glow style={{marginBottom:14,lineHeight:1.8,fontSize:13}}>
                    <div dangerouslySetInnerHTML={{__html:mdHtml(ciResult,S.neon)}}/>
                  </NeonCard>
                  <GlowBtn onClick={resetCheckin} S={S}>↺ Neuer Check-in</GlowBtn>
                </>}
              </>)}
            </>)}

            {checkSubTab==="journal"&&<MicroJournal S={S}/>}
            {checkSubTab==="plans"&&<WennDannPlaene S={S}/>}
          </div>
        )}

        {/* ── VERLAUF ── */}
        {tab==="verlauf"&&(
          <div style={{animation:"fadeUp 0.35s ease both"}}>
            {/* Sub-tab switcher */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
              {[{id:"verlauf",label:"Verlauf",icon:"▲"},{id:"monat",label:"Monat",icon:"◉"}].map(st=>(
                <button key={st.id} onPointerDown={()=>haptic.light()} onClick={()=>setVerlaufSubTab(st.id)}
                  style={{padding:"9px",borderRadius:10,border:`1px solid ${verlaufSubTab===st.id?S.neon:S.border}`,background:verlaufSubTab===st.id?S.neonGlow:"transparent",color:verlaufSubTab===st.id?S.neon:S.muted,fontSize:9,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6,letterSpacing:"0.1em",textTransform:"uppercase",boxShadow:verlaufSubTab===st.id?`0 0 12px ${S.neonGlow}`:"none",transition:"all 0.2s"}}>
                  <span style={{fontSize:12}}>{st.icon}</span>{st.label}
                </button>
              ))}
            </div>

            {verlaufSubTab==="monat"&&<Monatsstatistik checkins={checkins} S={S}/>}

            {verlaufSubTab==="verlauf"&&(checkins.length===0?(
              <NeonCard S={S} style={{textAlign:"center",padding:"50px 20px",color:S.muted}}>
                <div style={{fontSize:28,marginBottom:12,opacity:0.3}}>▲</div>
                <div style={{fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Keine Daten</div>
                <div style={{fontSize:11}}>Mach deinen ersten Check-in.</div>
              </NeonCard>
            ):<>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
                {[{label:"Ø Stimmung",value:avgMood,color:S.cyan},{label:"Ø Drang",value:avgUrge,color:S.danger},{label:"Rückfälle",value:relapses.length,color:S.morning}].map(stat=>(
                  <NeonCard key={stat.label} S={S} style={{textAlign:"center",padding:"14px 8px",marginBottom:0}}>
                    <div style={{fontSize:20,fontWeight:800,color:stat.color,textShadow:`0 0 12px ${stat.color}`}}>{stat.value}</div>
                    <div style={{fontSize:8,color:S.muted,marginTop:4,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>{stat.label}</div>
                  </NeonCard>
                ))}
              </div>

              <NeonCard S={S} style={{marginBottom:14,paddingLeft:6,paddingRight:6}}>
                <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:12}}>▲ Letzte {chartData.length} Einträge</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData} margin={{top:4,right:8,left:-24,bottom:4}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={S.border}/>
                    <XAxis dataKey="date" tick={{fontSize:9,fill:S.muted,fontFamily:"monospace"}}/>
                    <YAxis domain={[0,10]} tick={{fontSize:9,fill:S.muted,fontFamily:"monospace"}}/>
                    <Tooltip contentStyle={{fontFamily:"monospace",fontSize:11,background:S.bgCard,border:`1px solid ${S.neonBorder}`,borderRadius:8,color:S.text}}/>
                    <Legend iconType="circle" iconSize={6} wrapperStyle={{fontSize:10,fontFamily:"monospace"}}/>
                    <Line type="monotone" dataKey="Stimmung" stroke={S.cyan}   strokeWidth={2} dot={false}/>
                    <Line type="monotone" dataKey="Drang"    stroke={S.danger} strokeWidth={2} dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              </NeonCard>

              <Fruehwarnung checkins={checkins} callClaude={callClaude} S={S}/>
              <Wochenbericht checkins={checkins} callClaude={callClaude} S={S}/>
              <TriggerHeatmap checkins={checkins} S={S}/>
              <SchlafKorrelation checkins={checkins} S={S}/>

              <NeonCard S={S} glow style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <div><div style={{fontSize:12,fontWeight:800,letterSpacing:"0.05em"}}>Muster-Analyse</div><div style={{fontSize:9,color:S.muted,marginTop:2}}>KI · letzte {Math.min(checkins.length,14)} Einträge</div></div>
                  <button onPointerDown={()=>haptic.medium()} onClick={runPattern} disabled={patternLoading||checkins.length<2}
                    style={{background:"transparent",color:patternLoading?S.muted:S.neon,border:`1px solid ${patternLoading?S.border:S.neonBorder}`,borderRadius:8,padding:"8px 14px",fontSize:9,fontWeight:800,cursor:"pointer",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
                    {patternLoading?<Spinner S={S}/>:"◈ Scan"}
                  </button>
                </div>
                {patternError&&<ErrorBox msg={patternError} S={S}/>}
                {checkins.length<2&&<div style={{fontSize:11,color:S.muted}}>Mind. 2 Check-ins nötig.</div>}
                {patternResult&&<div style={{fontSize:12,lineHeight:1.8,borderTop:`1px solid ${S.border}`,paddingTop:12}} dangerouslySetInnerHTML={{__html:mdHtml(patternResult,S.neon)}}/>}
              </NeonCard>

              <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:8}}>Letzte Einträge</div>
              {[...checkins].reverse().slice(0,7).map((c,i)=>{
                const rm=c.risk?RISK_META[c.risk]:null;
                return <NeonCard key={i} S={S} style={{marginBottom:8,display:"flex",alignItems:"center",gap:12,padding:"12px 14px"}}>
                  <div style={{fontFamily:"monospace",fontSize:10,color:S.muted,flexShrink:0}}>{fmtDate(c.date)}</div>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.trigger}</div><div style={{fontSize:10,color:S.muted,fontFamily:"monospace"}}>↑{c.mood} · ↑{c.urge}{c.sleep?` · 💤${c.sleep}h`:""}</div></div>
                  {rm&&<div style={{background:rm.bg,color:rm.text,fontSize:8,fontWeight:800,padding:"3px 8px",borderRadius:20,flexShrink:0,textTransform:"uppercase",letterSpacing:"0.08em",border:`1px solid ${rm.border}`}}>{c.risk}</div>}
                </NeonCard>;
              })}

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
                <button onPointerDown={()=>haptic.light()} onClick={exportCSV} style={{padding:"13px",background:"transparent",border:`1px solid ${S.border}`,borderRadius:10,fontSize:9,fontWeight:800,cursor:"pointer",color:S.muted,fontFamily:"inherit",letterSpacing:"0.1em",textTransform:"uppercase"}}>▼ CSV Export</button>
                <button onPointerDown={()=>haptic.light()} onClick={notifStatus==="granted"?()=>setShowNotifSettings(s=>!s):async()=>{const p=await Notification.requestPermission();if(p==="granted"){setNotifStatus("granted");setShowNotifSettings(true);}else setNotifStatus("denied");}} disabled={notifStatus==="denied"} style={{padding:"13px",background:notifStatus==="granted"?S.neonGlow:"transparent",border:`1px solid ${notifStatus==="granted"?S.neonBorder:S.border}`,borderRadius:10,fontSize:9,fontWeight:800,cursor:"pointer",color:notifStatus==="granted"?S.neon:S.muted,fontFamily:"inherit",letterSpacing:"0.1em",textTransform:"uppercase"}}>
                  {notifStatus==="granted"?"◎ Zeiten":"◎ Reminder"}
                </button>
              </div>
              {notifStatus==="denied"&&<div style={{fontSize:9,color:S.danger,textAlign:"center",marginTop:8}}>Benachrichtigungen blockiert.</div>}
              {notifStatus==="granted"&&<div style={{fontSize:9,color:S.success,textAlign:"center",marginTop:8}}>◎ Erinnerungen aktiv</div>}
              {showNotifSettings&&notifStatus==="granted"&&<div style={{marginTop:10}}><NotifSettings onClose={()=>setShowNotifSettings(false)} S={S}/></div>}
            </>)}
          </div>
        )}

        {/* ── DENKEN ── */}
        {tab==="denken"&&(
          <div style={{animation:"fadeUp 0.35s ease both"}}>
            {/* Sub-tab: Denken / Werte */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
              {[{id:"denken",label:"Denken",icon:"⊕"},{id:"werte",label:"Werte",icon:"◉"}].map(st=>(
                <button key={st.id} onPointerDown={()=>haptic.light()} onClick={()=>setDenkSubTab(st.id)}
                  style={{padding:"9px",borderRadius:10,border:`1px solid ${denkSubTab===st.id?S.neon:S.border}`,background:denkSubTab===st.id?S.neonGlow:"transparent",color:denkSubTab===st.id?S.neon:S.muted,fontSize:9,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6,letterSpacing:"0.1em",textTransform:"uppercase",boxShadow:denkSubTab===st.id?`0 0 12px ${S.neonGlow}`:"none",transition:"all 0.2s"}}>
                  <span style={{fontSize:13}}>{st.icon}</span>{st.label}
                </button>
              ))}
            </div>

            {denkSubTab==="werte"&&<WerteModul values={values} onChange={saveValues} S={S}/>}

            {denkSubTab==="denken"&&(<>
            {/* KI-Modus indicator */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div style={{fontSize:9,color:S.muted,letterSpacing:"0.1em",textTransform:"uppercase"}}>
                Modus: <span style={{color:S.neon}}>{KI_MODI.find(m=>m.id===profile.kiModus)?.label||"Direkt"}</span>
              </div>
              <button onPointerDown={()=>haptic.light()} onClick={()=>setShowSettings(true)} style={{background:"transparent",border:`1px solid ${S.border}`,borderRadius:6,padding:"3px 8px",fontSize:8,cursor:"pointer",color:S.muted,fontFamily:"inherit",letterSpacing:"0.08em"}}>ändern</button>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              {DENK_MODI.map(m=>(
                <button key={m.id} onPointerDown={()=>haptic.light()} onClick={()=>{setDenkModus(m.id);setDenkResult("");setDenkError("");}}
                  style={{padding:"12px 6px",borderRadius:10,border:`1px solid ${denkModus===m.id?S.neon:S.border}`,background:denkModus===m.id?S.neonGlow:"transparent",color:denkModus===m.id?S.neon:S.muted,fontSize:8,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:5,letterSpacing:"0.1em",textTransform:"uppercase",boxShadow:denkModus===m.id?`0 0 16px ${S.neonGlow}`:"none",transition:"all 0.2s"}}>
                  <span style={{fontSize:16}}>{m.icon}</span>{m.label}
                </button>
              ))}
            </div>

            {denkModus==="reframe"&&(
              <NeonCard S={S} style={{marginBottom:10,padding:"10px 14px"}}>
                <div style={{fontSize:10,color:S.muted,lineHeight:1.7}}>Schreib den Gedanken genau so auf, wie er kommt.<br/><span style={{color:S.neon}}>Kein Schönreden. Nur Präzision.</span></div>
              </NeonCard>
            )}
            <NeonCard S={S} glow={denkInput.length>0} style={{marginBottom:10}}>
              <textarea rows={6} placeholder={DENK_MODI.find(m=>m.id===denkModus)?.placeholder} value={denkInput}
                onChange={e=>{setDenkInput(e.target.value);setDenkResult("");}}
                style={{width:"100%",background:S.bgInput,borderRadius:8,padding:"10px 12px",fontSize:13,lineHeight:1.6,color:S.text}}/>
            </NeonCard>
            {denkError&&<ErrorBox msg={denkError} S={S}/>}
            <GlowBtn onClick={submitDenken} disabled={!denkInput.trim()||denkLoading} S={S}>
              {denkLoading?<Spinner S={S}/>:`${DENK_MODI.find(m=>m.id===denkModus)?.icon} Analysieren`}
            </GlowBtn>
            {denkResult&&(
              <NeonCard S={S} glow style={{lineHeight:1.8,fontSize:13,marginTop:10,animation:"fadeUp 0.3s ease both"}}>
                <div dangerouslySetInnerHTML={{__html:mdHtml(denkResult,S.neon)}}/>
              </NeonCard>
            )}
            </>)}
          </div>
        )}
      </div>

      <TabBar tab={tab} setTab={setTab} risk={lastRisk} hasRelapse={hasRelapseToday} S={S}/>
    </div>
  );
}
