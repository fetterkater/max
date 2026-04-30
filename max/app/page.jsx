"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ─── Theme ────────────────────────────────────────────────────────────────────
const BASE = {
  bg:"#080810", card:"#0e0e1a", input:"#12121f",
  neon:"#b44dff", neonG:"rgba(180,77,255,0.18)", neonB:"rgba(180,77,255,0.35)",
  cyan:"#00f5ff", text:"#f0eaff", muted:"#6b6485", border:"rgba(180,77,255,0.15)",
  danger:"#ff4d6d", ok:"#00ff9d", sun:"#ff6b35", eve:"#b44dff", gold:"#ffd700",
};
const THEME = {
  hoch:   {...BASE, neon:"#ff4d6d", neonG:"rgba(255,77,109,0.20)", neonB:"rgba(255,77,109,0.45)", border:"rgba(255,77,109,0.18)", card:"#100810"},
  mittel: {...BASE, neon:"#ffc107", neonG:"rgba(255,193,7,0.16)",  neonB:"rgba(255,193,7,0.40)",  border:"rgba(255,193,7,0.15)",  card:"#0f0e09"},
  normal: {...BASE},
};
const RISK = {
  niedrig:{bg:"rgba(0,255,157,0.08)",  text:"#00ff9d", dot:"#00ff9d", border:"rgba(0,255,157,0.3)"},
  mittel: {bg:"rgba(255,193,7,0.08)",  text:"#ffc107", dot:"#ffc107", border:"rgba(255,193,7,0.3)"},
  hoch:   {bg:"rgba(255,77,109,0.08)", text:"#ff4d6d", dot:"#ff4d6d", border:"rgba(255,77,109,0.3)"},
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const DEF_SUPPS = {
  morning:[
    {id:"m1",name:"NAC",           dose:"600 mg",       effect:"Glutamat stabilisieren, Craving ↓"},
    {id:"m2",name:"Vitamin C",     dose:"500 mg",       effect:"Antioxidativ, NAC unterstützen"},
    {id:"m3",name:"Omega-3",       dose:"1000-1500 mg", effect:"Entzündungshemmend, Stimmung"},
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
    {id:"e2",name:"Glycin",            dose:"3 g",        effect:"Schlafqualität hoch"},
    {id:"e3",name:"Omega-3 Rest",      dose:"Rest",       effect:"Stimmung stabilisieren"},
    {id:"e4",name:"Magnesium",         dose:"200 mg",     effect:"Entspannung, Nervensystem"},
    {id:"e5",name:"Phosphatidylserin", dose:"100-150 mg", effect:"Cortisol runter, Stressreduktion"},
  ],
};

const KI_MODI = [
  {id:"direkt",        label:"Direkt",       icon:"▸", desc:"Klar. Ohne Umschweife."},
  {id:"ruhig",         label:"Ruhig",        icon:"◌", desc:"Ruhig. Stabilisierend."},
  {id:"haerter",       label:"Härter",       icon:"⚡", desc:"Direkt. Kein Weichspülen."},
  {id:"therapeutisch", label:"Therapeutisch",icon:"◎", desc:"Reflektierend. Einfühlsam."},
];
const KI_INST = {
  direkt:"Sei direkt und klar. Keine Füllwörter.",
  ruhig:"Sei ruhig und stabilisierend. Kein Druck.",
  haerter:"Sei direkt und konfrontativ. Kein Beschönigen.",
  therapeutisch:"Sei einfühlsam und reflektierend.",
};

const MILESTONES = [
  {days:1,  msg:(n)=>`${n}, der erste Tag ist der schwerste.`},
  {days:3,  msg:(n)=>`${n}, 3 Tage. Das Nervensystem stabilisiert sich.`},
  {days:7,  msg:(n)=>`${n}, eine Woche. Neue Muster entstehen.`},
  {days:14, msg:(n)=>`${n}, zwei Wochen. Neuroplastizität arbeitet.`},
  {days:30, msg:(n)=>`${n}, 30 Tage. Das ist ein System, keine Willenskraft.`},
  {days:60, msg:(n)=>`${n}, 60 Tage. Was du aufgebaut hast, gehört dir.`},
  {days:90, msg:(n)=>`${n}, 90 Tage. Nachhaltige Veränderung.`},
  {days:180,msg:(n)=>`${n}, ein halbes Jahr.`},
  {days:365,msg:(n)=>`${n}, ein Jahr. Jeder Tag war eine Entscheidung.`},
];

const TABS = [
  {id:"supps",  label:"Supps",  icon:"◎"},
  {id:"check",  label:"Check",  icon:"◈"},
  {id:"verlauf",label:"Verlauf",icon:"▲"},
  {id:"denken", label:"Denken", icon:"⊕"},
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAY = () => new Date().toDateString();
const ls = {
  get:(k,fb)=>{ try{const v=localStorage.getItem(k); return v!=null?v:fb;}catch{return fb;} },
  set:(k,v)=>{ try{localStorage.setItem(k,v);}catch{} },
  j:(k,fb)=>{ try{return JSON.parse(ls.get(k,null)??JSON.stringify(fb));}catch{return fb;} },
};
const haptic = {
  l:()=>{try{navigator.vibrate?.(10);}catch{}},
  m:()=>{try{navigator.vibrate?.(25);}catch{}},
  e:()=>{try{navigator.vibrate?.([60,30,60]);}catch{}},
  s:()=>{try{navigator.vibrate?.([20,10,40]);}catch{}},
  t:()=>{try{navigator.vibrate?.(6);}catch{}},
};
const fmt = iso => new Date(iso).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
const parseRisk = t => t.match(/##\s*Risiko:\s*(niedrig|mittel|hoch)/i)?.[1]?.toLowerCase()??null;
const md = (t,c="#b44dff") => t
  .replace(/^## (.+)$/gm,`<h3 style="font-size:13px;font-weight:800;margin:12px 0 6px;color:${c};letter-spacing:0.06em;text-transform:uppercase">$1</h3>`)
  .replace(/\*\*(.+?)\*\*/g,`<strong style="color:#f0eaff">$1</strong>`)
  .replace(/^- (.+)$/gm,`<div style="padding:4px 0 4px 10px;border-left:2px solid ${c}44;margin:3px 0;color:#c0b8d4">$1</div>`)
  .replace(/\n/g,"<br>");

function soberDays(checkins, relapses) {
  const last = relapses.length ? new Date(relapses[relapses.length-1].date) : null;
  const first = checkins.length ? new Date(checkins[0].date) : new Date();
  const start = last && last > first ? last : first;
  return Math.max(0, Math.floor((new Date()-start)/(864e5)));
}

function calcStreaks(checkins, totalSupps) {
  if (!checkins.length) return {ci:0,su:0};
  const today = new Date(); today.setHours(0,0,0,0);
  const byDay = {};
  checkins.forEach(c=>{
    const d=new Date(c.date); d.setHours(0,0,0,0);
    const k=d.toDateString();
    if (!byDay[k]) byDay[k]={ci:false,su:0};
    byDay[k].ci=true;
    byDay[k].su=Math.max(byDay[k].su,c.suppsDone||0);
  });
  let ci=0,su=0,d=new Date(today);
  for(let i=0;i<365;i++){const k=d.toDateString();if(byDay[k]?.ci)ci++;else if(i>0)break;d.setDate(d.getDate()-1);}
  d=new Date(today);
  for(let i=0;i<365;i++){const k=d.toDateString();if(byDay[k]?.su>=totalSupps)su++;else if(i>0)break;d.setDate(d.getDate()-1);}
  return {ci,su};
}

// ─── AI Prompts ───────────────────────────────────────────────────────────────
const sysCheckin = m => `Du bist ein nüchternes, nicht-urtelendes Rückfall-Präventions-Tool. ${KI_INST[m]||KI_INST.direkt}
Antworte IMMER in diesem Format:
## Risiko: [niedrig / mittel / hoch]
**Was ich höre:** [2-3 Sätze, kein Coaching]
**Jetzt sofort:** [Eine Handlung. 1 Satz.]
**Anerkennung:** [1 echter Satz.]`;

const sysPattern = `Du bist ein Recovery-Analyse-Tool.
## Muster erkannt
**Risiko-Trend:** [steigend/stabil/sinkend] - [1 Satz]
**Kritische Trigger:**
- [Muster 1]
- [Muster 2]
**Fokus:** [Eine Empfehlung. Max 2 Sätze.]
Kein Coaching.`;

const sysFrueh = `Du bist ein KI-Frühwarnsystem für Recovery.
## Frühwarnung
**Status:** [Warnung / Stabil / Kritisch]
**Trends:**
- [Trend 1 mit Zahlen]
- [Trend 2 mit Zahlen]
**Maßnahme:** [Eine konkrete Handlung.]
Nur Fakten.`;

const sysRelapse = `Du bist ein nicht-urtelendes Relapse-Analyse-Tool.
## Rückfall analysiert
**Muster:** [Was hat sich wiederholt? 2 Sätze.]
**Kritischer Moment:** [1 Satz.]
**Lernpunkte:**
- [Punkt 1]
- [Punkt 2]
**Nächstes Mal:** [Eine Handlung. 1 Satz.]
Kein Coaching.`;

const sysDenk = {
  analyse:`## Kernaussage\n[1 Satz]\n**Punkte:**\n- [1]\n- [2]\n- [3]\n**Lücken:** [1-2 Sätze]`,
  entscheidung:`## Entscheidung: [benennen]\n**Dafür:**\n- [1]\n- [2]\n**Dagegen:**\n- [1]\n- [2]\n**Empfehlung:** [1 Satz]`,
  impuls:`## Stopp.\n**Was passiert:** [1 Satz]\n**Jetzt:** [1 Handlung]\n**Danach:** [1 Satz]`,
  reframe:`## Gedanke analysiert\n**Muster:** [1-2 Sätze]\n**Was stimmt:** [ehrlich]\n**Was übertrieben:** [1-2 Sätze]\n**Reframe:** [genauer, nicht positiver]\n**Frage:** [eine offene Frage]`,
};

// ─── Base UI ──────────────────────────────────────────────────────────────────
function Card({children,style,glow,S}) {
  return <div style={{background:S.card,borderRadius:14,padding:"16px 18px",marginBottom:10,border:`1px solid ${glow?S.neonB:S.border}`,boxShadow:glow?`0 0 24px ${S.neonG}`:"0 2px 10px rgba(0,0,0,0.2)",transition:"all 0.5s",...style}}>{children}</div>;
}

function Btn({onClick,disabled,children,color,S}) {
  const c=color||S.neon;
  const [p,setP]=useState(false);
  return <button onPointerDown={()=>{setP(true);haptic.m();}} onPointerUp={()=>setP(false)} onPointerLeave={()=>setP(false)}
    onClick={onClick} disabled={disabled}
    style={{width:"100%",padding:"15px",border:`1px solid ${disabled?S.muted:c}`,background:p?`${c}15`:"transparent",color:disabled?S.muted:c,borderRadius:12,fontSize:11,fontWeight:900,fontFamily:"inherit",cursor:disabled?"default":"pointer",letterSpacing:"0.13em",textTransform:"uppercase",boxShadow:disabled?"none":`0 0 20px ${c}22`,transform:p?"scale(0.975)":"scale(1)",transition:"transform 0.1s,background 0.15s",marginBottom:4}}>
    {children}
  </button>;
}

function Slider({label,min,max,low,high,value,onChange,color,S}) {
  const c=color||S.neon;
  const pct=((value-min)/(max-min))*100;
  return <div style={{marginBottom:18}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
      <span style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.14em",textTransform:"uppercase"}}>{label}</span>
      <span style={{fontSize:24,fontWeight:900,fontFamily:"monospace",color:c,textShadow:`0 0 12px ${c}88`,lineHeight:1,transition:"color 0.3s"}}>{value}</span>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:8,color:S.muted,width:40,flexShrink:0}}>{low}</span>
      <div style={{flex:1,position:"relative",height:4,borderRadius:4,background:S.input}}>
        <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${pct}%`,borderRadius:4,background:c,boxShadow:`0 0 8px ${c}88`,transition:"width 0.1s,background 0.3s"}}/>
        <input type="range" min={min} max={max} value={value} onChange={e=>{onChange(Number(e.target.value));haptic.t();}}
          style={{position:"absolute",inset:"-8px 0",width:"100%",appearance:"none",WebkitAppearance:"none",background:"transparent",cursor:"pointer",height:20,margin:0}}/>
      </div>
      <span style={{fontSize:8,color:S.muted,width:40,flexShrink:0,textAlign:"right"}}>{high}</span>
    </div>
  </div>;
}

function Spin({S}) { return <span style={{display:"inline-block",width:13,height:13,border:`2px solid ${S.neonB}`,borderTopColor:S.neon,borderRadius:"50%",animation:"spin 0.6s linear infinite"}}/>; }
function ErrBox({msg,S}) { return <div style={{background:"rgba(255,77,109,0.08)",color:S.danger,borderRadius:10,padding:"10px 14px",fontSize:12,marginBottom:10,border:"1px solid rgba(255,77,109,0.25)"}}>{msg}</div>; }

// ─── Breathing Timer ──────────────────────────────────────────────────────────
function Breath478({onDone,S}) {
  const PH=[{l:"Einatmen",d:4,c:S.cyan},{l:"Halten",d:7,c:S.neon},{l:"Ausatmen",d:8,c:S.ok}];
  const [ph,setPh]=useState(0);const [sec,setSec]=useState(4);const [cy,setCy]=useState(0);const [run,setRun]=useState(false);const [done,setDone]=useState(false);
  const MAX=4;const cur=PH[ph];const circ=2*Math.PI*44;
  useEffect(()=>{
    if(!run||done)return;
    if(sec===0){const np=(ph+1)%3;if(np===0){const nc=cy+1;if(nc>=MAX){setRun(false);setDone(true);return;}setCy(nc);}setPh(np);setSec(PH[np].d);return;}
    const t=setTimeout(()=>setSec(s=>s-1),1000);return()=>clearTimeout(t);
  },[run,sec,ph,cy,done]);
  if(done)return<div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:26,color:S.ok,marginBottom:8}}>✓</div><Btn onClick={onDone} color={S.ok} S={S}>Fertig</Btn></div>;
  return<div style={{textAlign:"center"}}>
    <div style={{fontSize:9,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:12}}>4-7-8 Atmung · {MAX} Zyklen</div>
    <div style={{position:"relative",width:110,height:110,margin:"0 auto 14px"}}>
      <svg width="110" height="110" style={{position:"absolute",top:0,left:0,transform:"rotate(-90deg)"}}>
        <circle cx="55" cy="55" r="44" fill="none" stroke={S.border} strokeWidth="2.5"/>
        {run&&<circle cx="55" cy="55" r="44" fill="none" stroke={cur.c} strokeWidth="2.5" strokeDasharray={circ} strokeDashoffset={circ*(1-((1-sec/cur.d)))} style={{transition:"stroke-dashoffset 1s linear",filter:`drop-shadow(0 0 5px ${cur.c})`}}/>}
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        {run?<><div style={{fontSize:28,fontWeight:900,fontFamily:"monospace",color:cur.c,lineHeight:1}}>{sec}</div><div style={{fontSize:8,color:cur.c,letterSpacing:"0.12em",textTransform:"uppercase",marginTop:2}}>{cur.l}</div></>:<div style={{fontSize:10,color:S.muted}}>Bereit</div>}
      </div>
    </div>
    <div style={{display:"flex",justifyContent:"center",gap:5,marginBottom:12}}>{[...Array(MAX)].map((_,i)=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:i<cy?S.ok:i===cy&&run?cur.c:S.border,transition:"all 0.3s"}}/>)}</div>
    <Btn onClick={()=>setRun(r=>!r)} color={cur.c} S={S}>{run?"⏸ Pause":"▶ Start"}</Btn>
  </div>;
}

// ─── SOS Screen ───────────────────────────────────────────────────────────────
function SOS({onClose,values,lastRisk,S}) {
  const [active,setActive]=useState(null);
  const bc=lastRisk==="hoch"?S.danger:lastRisk==="mittel"?"#ffc107":S.neon;
  const modal=(title,col,content)=>(
    <div style={{position:"fixed",inset:0,background:"rgba(8,8,16,0.95)",backdropFilter:"blur(12px)",zIndex:1001,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:430,background:S.card,border:`1px solid ${col}44`,borderRadius:"18px 18px 0 0",padding:"22px 16px 32px",maxHeight:"88vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <span style={{fontSize:11,fontWeight:800,color:col,letterSpacing:"0.1em",textTransform:"uppercase"}}>{title}</span>
          <button onPointerDown={()=>haptic.l()} onClick={()=>setActive(null)} style={{background:"transparent",border:`1px solid ${S.border}`,borderRadius:7,padding:"5px 10px",fontSize:11,cursor:"pointer",color:S.muted,fontFamily:"inherit"}}>←</button>
        </div>
        {content}
      </div>
    </div>
  );
  if(active==="atem") return modal("4-7-8 Atmung",S.cyan,<Breath478 onDone={()=>setActive(null)} S={S}/>);
  const actions=[
    {id:"atem",icon:"◌",label:"4-7-8 Atmung",sub:"Nervensystem beruhigen",c:S.cyan},
    {id:"warte",icon:"⏱",label:"20 Min warten",sub:"Craving-Peak überbrücken",c:"#ffc107"},
    {id:"bewegung",icon:"▲",label:"Körper aktivieren",sub:"Kaltes Wasser · Bewegung",c:S.sun},
    {id:"kontakte",icon:"⊕",label:"Sicherer Kontakt",sub:"Jemanden anrufen",c:S.ok},
  ];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(8,8,16,0.95)",backdropFilter:"blur(12px)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:430,background:S.card,border:`1px solid ${bc}44`,borderRadius:"18px 18px 0 0",padding:"22px 16px 32px",maxHeight:"88vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <div><div style={{fontSize:20,fontWeight:900,color:S.danger,textShadow:`0 0 16px ${S.danger}`}}>SOS</div><div style={{fontSize:9,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase"}}>Craving · Impuls · Krise</div></div>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${S.border}`,borderRadius:7,padding:"7px 12px",fontSize:14,cursor:"pointer",color:S.muted,fontFamily:"inherit"}}>×</button>
        </div>
        {values.length>0&&<div style={{background:`${S.neonG}`,border:`1px solid ${S.neonB}`,borderRadius:10,padding:"12px 14px",marginBottom:14}}>
          <div style={{fontSize:8,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:8}}>Wofür du das machst</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{values.map((v,i)=><div key={i} style={{background:S.neonG,border:`1px solid ${S.neonB}`,borderRadius:20,padding:"4px 10px",fontSize:10,fontWeight:700,color:S.neon}}>{v}</div>)}</div>
        </div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
          {actions.map(a=><button key={a.id} onPointerDown={()=>haptic.m()} onClick={()=>setActive(a.id)}
            style={{padding:"14px 10px",borderRadius:12,border:`1px solid ${a.c}44`,background:`${a.c}09`,display:"flex",flexDirection:"column",alignItems:"flex-start",gap:4,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
            <span style={{fontSize:18,color:a.c}}>{a.icon}</span>
            <span style={{fontSize:11,fontWeight:800,color:a.c}}>{a.label}</span>
            <span style={{fontSize:9,color:S.muted,lineHeight:1.4}}>{a.sub}</span>
          </button>)}
        </div>
        <Card S={S} style={{marginBottom:10}}>
          <div style={{fontSize:9,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Ablenkungsprotokoll</div>
          {["5-Minuten-Timer — dann neu entscheiden.","Standort wechseln. Jetzt.","Großes Glas Wasser trinken.","Aufschreiben was gerade los ist.","Eine Aufgabe starten die wartet."].map((s,i)=>(
            <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:i<4?`1px solid ${S.border}`:"none"}}>
              <span style={{fontSize:9,color:S.neonB,fontFamily:"monospace",flexShrink:0}}>{String(i+1).padStart(2,"0")}</span>
              <span style={{fontSize:11,color:S.muted,lineHeight:1.5}}>{s}</span>
            </div>
          ))}
        </Card>
        <button onClick={onClose} style={{width:"100%",padding:"12px",background:"transparent",border:`1px solid ${S.border}`,borderRadius:10,fontSize:10,fontWeight:700,cursor:"pointer",color:S.muted,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"inherit"}}>Schließen</button>
      </div>
    </div>
  );
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
function Onboarding({onDone}) {
  const [step,setStep]=useState(0);
  const [name,setName]=useState("");
  const [identity,setIdentity]=useState("");
  const [kiModus,setKiModus]=useState("direkt");
  const [soberStart,setSoberStart]=useState("");
  const IDS=["Ich bin stabil.","Ich baue Kontrolle auf.","Ich wähle Klarheit.","Ich bin stärker als der Drang.","Ich entscheide mich täglich neu."];
  function finish(){ls.set("profile",JSON.stringify({name:name.trim(),identity,kiModus,soberStart:soberStart||new Date().toISOString()}));onDone();}
  const inp={width:"100%",background:"#12121f",border:"1px solid rgba(180,77,255,0.35)",borderRadius:10,padding:"13px 16px",fontSize:16,fontWeight:700,color:"#f0eaff",fontFamily:"inherit",outline:"none",marginBottom:16};
  const nextBtn=(label,action,disabled)=>(
    <button onPointerDown={()=>haptic.m()} onClick={action} disabled={disabled}
      style={{width:"100%",padding:"15px",border:`1px solid ${disabled?"#6b6485":"#b44dff"}`,background:"transparent",color:disabled?"#6b6485":"#b44dff",borderRadius:12,fontSize:12,fontWeight:900,fontFamily:"inherit",cursor:disabled?"default":"pointer",letterSpacing:"0.13em",textTransform:"uppercase",boxShadow:disabled?"none":"0 0 20px rgba(180,77,255,0.2)"}}>
      {label}
    </button>
  );
  const steps=[
    <div key="n" style={{animation:"fadeUp 0.4s ease both"}}>
      <div style={{fontSize:24,fontWeight:900,color:"#f0eaff",marginBottom:8}}>Wie heißt du?</div>
      <div style={{fontSize:12,color:"#6b6485",marginBottom:28,lineHeight:1.7}}>Nur lokal gespeichert. Kein Account.</div>
      <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&name.trim()&&setStep(1)} placeholder="Vorname..." autoFocus style={inp}/>
      {nextBtn("Weiter →",()=>setStep(1),!name.trim())}
    </div>,
    <div key="i" style={{animation:"fadeUp 0.4s ease both"}}>
      <div style={{fontSize:24,fontWeight:900,color:"#f0eaff",marginBottom:8}}>Deine Identität</div>
      <div style={{fontSize:12,color:"#6b6485",marginBottom:20,lineHeight:1.7}}>Erscheint im SOS-Screen.</div>
      <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:14}}>
        {IDS.map(s=><button key={s} onPointerDown={()=>haptic.l()} onClick={()=>setIdentity(s)}
          style={{padding:"11px 14px",borderRadius:10,border:`1px solid ${identity===s?"#b44dff":"rgba(180,77,255,0.15)"}`,background:identity===s?"rgba(180,77,255,0.1)":"transparent",color:identity===s?"#b44dff":"#6b6485",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all 0.15s"}}>
          {s}
        </button>)}
      </div>
      <input value={identity} onChange={e=>setIdentity(e.target.value)} placeholder="Oder eigenen Satz..." style={{...inp,fontSize:13}}/>
      {nextBtn("Weiter →",()=>setStep(2),!identity.trim())}
      <button onPointerDown={()=>haptic.l()} onClick={()=>setStep(2)} style={{width:"100%",padding:"8px",marginTop:4,background:"none",border:"none",color:"#6b6485",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>Überspringen</button>
    </div>,
    <div key="k" style={{animation:"fadeUp 0.4s ease both"}}>
      <div style={{fontSize:24,fontWeight:900,color:"#f0eaff",marginBottom:8}}>KI-Stil</div>
      <div style={{fontSize:12,color:"#6b6485",marginBottom:20}}>Jederzeit änderbar.</div>
      <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:20}}>
        {KI_MODI.map(m=><button key={m.id} onPointerDown={()=>haptic.l()} onClick={()=>setKiModus(m.id)}
          style={{padding:"13px 16px",borderRadius:12,border:`1px solid ${kiModus===m.id?"#b44dff":"rgba(180,77,255,0.15)"}`,background:kiModus===m.id?"rgba(180,77,255,0.1)":"transparent",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:10,transition:"all 0.15s"}}>
          <span style={{fontSize:18,color:kiModus===m.id?"#b44dff":"#6b6485",width:22}}>{m.icon}</span>
          <div><div style={{fontSize:13,fontWeight:800,color:kiModus===m.id?"#b44dff":"#f0eaff"}}>{m.label}</div><div style={{fontSize:10,color:"#6b6485"}}>{m.desc}</div></div>
        </button>)}
      </div>
      {nextBtn("Weiter →",()=>setStep(3),false)}
    </div>,
    <div key="s" style={{animation:"fadeUp 0.4s ease both"}}>
      <div style={{fontSize:24,fontWeight:900,color:"#f0eaff",marginBottom:8}}>Seit wann nüchtern?</div>
      <div style={{fontSize:12,color:"#6b6485",marginBottom:24,lineHeight:1.7}}>Für Milestones. Optional.</div>
      <input type="date" value={soberStart?soberStart.split("T")[0]:""} onChange={e=>setSoberStart(new Date(e.target.value).toISOString())}
        style={{...inp,fontSize:14,fontFamily:"monospace",fontWeight:800,color:"#b44dff",colorScheme:"dark"}}/>
      <button onPointerDown={()=>haptic.s()} onClick={finish}
        style={{width:"100%",padding:"17px",border:"1px solid #b44dff",background:"rgba(180,77,255,0.1)",color:"#b44dff",borderRadius:12,fontSize:13,fontWeight:900,fontFamily:"inherit",cursor:"pointer",letterSpacing:"0.13em",textTransform:"uppercase",boxShadow:"0 0 28px rgba(180,77,255,0.25)"}}>
        Starten →
      </button>
      <button onPointerDown={()=>haptic.l()} onClick={finish} style={{width:"100%",padding:"8px",marginTop:4,background:"none",border:"none",color:"#6b6485",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>Überspringen</button>
    </div>,
  ];
  return(
    <div style={{minHeight:"100vh",background:"#080810",fontFamily:"'SF Mono','Fira Code',monospace",color:"#f0eaff",maxWidth:430,margin:"0 auto",display:"flex",flexDirection:"column",justifyContent:"center",padding:"40px 22px"}}>
      <style>{`*{box-sizing:border-box}@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}input{font-family:inherit}`}</style>
      <div style={{marginBottom:36}}><div style={{fontSize:11,color:"rgba(180,77,255,0.6)",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:6}}>BALANX · {step+1}/4</div><div style={{width:36,height:2,background:"#b44dff",borderRadius:2,boxShadow:"0 0 10px #b44dff"}}/></div>
      {steps[step]}
    </div>
  );
}

// ─── Pläne Editor (no prompt() — iOS safe) ───────────────────────────────────
function PlaeneEditor({plans,setPlans,save,S}) {
  const [adding,setAdding]=useState(false);
  const [form,setForm]=useState({wenn:"",dann:""});
  const SUGGESTIONS=[["Einsamkeit","Freund anrufen oder anschreiben"],["Suchtdruck","Kalt duschen + 10 Min draußen"],["Stress nach Arbeit","Musik an, 5 Min rausgehen"],["Langeweile abends","Sport oder konkretes Hobby"]];
  function add(){
    if(!form.wenn.trim()||!form.dann.trim())return;
    haptic.s();
    const n=[...plans,{id:Date.now(),...form}];
    setPlans(n);save("wenn_dann",n);
    setForm({wenn:"",dann:""});setAdding(false);
  }
  function remove(id){haptic.l();const n=plans.filter(p=>p.id!==id);setPlans(n);save("wenn_dann",n);}
  return<div>
    {plans.length===0&&!adding&&(
      <Card S={S} style={{marginBottom:12}}>
        <div style={{fontSize:9,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Vorschläge</div>
        {SUGGESTIONS.map(([w,d],i)=>(
          <div key={i} onPointerDown={()=>haptic.l()} onClick={()=>{const n=[...plans,{id:Date.now(),wenn:w,dann:d}];setPlans(n);save("wenn_dann",n);}}
            style={{display:"flex",gap:8,padding:"9px 0",borderBottom:i<SUGGESTIONS.length-1?`1px solid ${S.border}`:"none",cursor:"pointer"}}>
            <span style={{fontSize:11,color:S.cyan}}>Wenn {w}</span>
            <span style={{fontSize:11,color:S.muted}}>→</span>
            <span style={{fontSize:11,color:S.text}}>{d}</span>
          </div>
        ))}
      </Card>
    )}
    {plans.map(p=>(
      <Card key={p.id} S={S} glow style={{marginBottom:8,padding:"11px 14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{flex:1,fontSize:11,lineHeight:1.6}}>
            <span style={{color:S.muted,fontSize:9,textTransform:"uppercase"}}>Wenn </span>
            <span style={{color:S.cyan,fontWeight:700}}>{p.wenn}</span>
            <span style={{color:S.muted}}> → </span>
            <span style={{color:S.text,fontWeight:700}}>{p.dann}</span>
          </div>
          <button onPointerDown={()=>haptic.l()} onClick={()=>remove(p.id)}
            style={{width:24,height:24,borderRadius:5,border:"1px solid rgba(255,77,109,0.3)",background:"rgba(255,77,109,0.08)",color:S.danger,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
      </Card>
    ))}
    {adding?(
      <Card S={S} glow style={{marginBottom:10}}>
        <div style={{fontSize:10,fontWeight:800,color:S.neon,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}>Neuer Plan</div>
        {[{k:"wenn",l:"Wenn... (Situation oder Gefühl)",p:"z.B. Einsamkeit abends, Streit, Stress, Langeweile"},{k:"dann",l:"Dann... (eine konkrete Handlung)",p:"z.B. Freund anrufen, kalt duschen, 10 Min rausgehen"}].map(f=>(
          <div key={f.k} style={{marginBottom:10}}>
            <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:5}}>{f.l}</div>
            <input value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p}
              style={{width:"100%",background:S.input,border:`1px solid ${S.border}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:S.text,fontFamily:"inherit",outline:"none"}}/>
          </div>
        ))}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
          <Btn onClick={add} disabled={!form.wenn.trim()||!form.dann.trim()} S={S}>+ Hinzufügen</Btn>
          <button onPointerDown={()=>haptic.l()} onClick={()=>{setAdding(false);setForm({wenn:"",dann:""});}}
            style={{padding:"15px",background:"transparent",border:`1px solid ${S.border}`,borderRadius:12,fontSize:11,fontWeight:900,cursor:"pointer",color:S.muted,fontFamily:"inherit",letterSpacing:"0.13em",textTransform:"uppercase"}}>
            Abbrechen
          </button>
        </div>
      </Card>
    ):(
      <button onPointerDown={()=>haptic.l()} onClick={()=>setAdding(true)}
        style={{width:"100%",padding:"12px",background:"transparent",border:`1px dashed ${S.neonB}`,borderRadius:10,fontSize:10,fontWeight:800,cursor:"pointer",color:S.neon,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"inherit"}}>
        + Neuer Plan
      </button>
    )}
  </div>;
}

// ─── Monat View ───────────────────────────────────────────────────────────────
function MonatView({checkins, totalSupps, S}) {
  const now=new Date(), y=now.getFullYear(), mo=now.getMonth();
  const dim=new Date(y,mo+1,0).getDate();
  const dm={};
  checkins.forEach(c=>{
    const d=new Date(c.date);
    if(d.getFullYear()===y&&d.getMonth()===mo){
      const k=d.getDate();
      if(!dm[k])dm[k]={r:null,s:0};
      if(!dm[k].r||c.risk==="hoch")dm[k].r=c.risk;
      dm[k].s=Math.max(dm[k].s,c.suppsDone||0);
    }
  });
  const off=(new Date(y,mo,1).getDay()+6)%7;
  const ciD=Object.keys(dm).length;
  const sdD=Object.values(dm).filter(d=>d.s>=totalSupps).length;
  const hrD=Object.values(dm).filter(d=>d.r==="hoch").length;
  function dc(day){
    const d=dm[day];
    if(!d) return S.input;
    if(d.r==="hoch")   return "rgba(255,77,109,0.5)";
    if(d.r==="mittel") return "rgba(255,193,7,0.45)";
    return "rgba(0,255,157,0.4)";
  }
  return (
    <Card S={S} style={{marginBottom:10}}>
      <div style={{fontSize:10,fontWeight:800,color:S.text,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.04em"}}>
        {now.toLocaleDateString("de-DE",{month:"long",year:"numeric"})}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:14}}>
        {[
          {l:"Check-ins",  v:`${Math.round(ciD/dim*100)}%`, c:S.neon},
          {l:"Volle Supps",v:`${Math.round(sdD/dim*100)}%`, c:S.ok},
          {l:"Hoch-Risiko",v:hrD, c:hrD>0?S.danger:S.muted},
        ].map(s=>(
          <div key={s.l} style={{background:S.input,borderRadius:9,padding:"9px 7px",textAlign:"center",border:`1px solid ${S.border}`}}>
            <div style={{fontSize:17,fontWeight:900,color:s.c,textShadow:`0 0 8px ${s.c}`}}>{s.v}</div>
            <div style={{fontSize:7,color:S.muted,marginTop:2,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:6}}>
        {["Mo","Di","Mi","Do","Fr","Sa","So"].map(d=>(
          <div key={d} style={{fontSize:7,color:S.muted,textAlign:"center",padding:"2px 0"}}>{d}</div>
        ))}
        {[...Array(off)].map((_,i)=><div key={`e${i}`}/>)}
        {[...Array(dim)].map((_,i)=>{
          const day=i+1, isT=day===now.getDate();
          return (
            <div key={day} style={{aspectRatio:"1",borderRadius:3,background:dc(day),border:isT?`1px solid ${S.neon}`:"1px solid transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,color:dm[day]?S.text:S.muted}}>
              {day}
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {[
          {c:"rgba(0,255,157,0.4)",l:"Niedrig"},
          {c:"rgba(255,193,7,0.4)",l:"Mittel"},
          {c:"rgba(255,77,109,0.5)",l:"Hoch"},
          {c:S.input,              l:"Kein Check-in"},
        ].map(l=>(
          <div key={l.l} style={{display:"flex",alignItems:"center",gap:3}}>
            <div style={{width:7,height:7,borderRadius:2,background:l.c}}/>
            <span style={{fontSize:7,color:S.muted}}>{l.l}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [ready,setReady]     = useState(false);
  const [onboarded,setOnb]   = useState(false);
  const [profile,setProfile] = useState({name:"",identity:"",kiModus:"direkt",soberStart:""});
  const [supps,setSupps]     = useState(DEF_SUPPS);
  const [checked,setChecked] = useState({});
  const [checkins,setCIs]    = useState([]);
  const [relapses,setRels]   = useState([]);
  const [values,setValues]   = useState([]);
  const [tab,setTab]         = useState("supps");
  const [checkSub,setCS]     = useState("check"); // check|journal|plans
  const [suppSub,setSS]      = useState("list");   // list|morgen|info
  const [vlSub,setVS]        = useState("verlauf"); // verlauf|monat
  const [dkSub,setDS]        = useState("denken"); // denken|werte
  const [ci,setCi]           = useState({mood:6,urge:3,sleep:7,energy:6,trigger:"",context:""});
  const [ciStep,setCiS]      = useState("sober"); // sober|relapse|form|loading|result
  const [ciResult,setCiR]    = useState("");
  const [ciRisk,setCiRisk]   = useState(null);
  const [ciErr,setCiErr]     = useState("");
  const [denkM,setDenkM]     = useState("analyse");
  const [denkIn,setDenkIn]   = useState("");
  const [denkOut,setDenkOut] = useState("");
  const [denkL,setDenkL]     = useState(false);
  const [denkErr,setDenkErr] = useState("");
  const [patRes,setPatRes]   = useState("");
  const [patL,setPatL]       = useState(false);
  const [patErr,setPatErr]   = useState("");
  const [fwRes,setFwRes]     = useState("");
  const [fwL,setFwL]         = useState(false);
  const [showSOS,setShowSOS] = useState(false);
  const [showSett,setSett]   = useState(false);
  const [journal,setJournal] = useState([]);
  const [plans,setPlans]     = useState([]);
  const [jForm,setJForm]     = useState({hard:"",helped:""});
  const [jSaved,setJSaved]   = useState(false);
  const [notif,setNotif]     = useState("idle");

  const lastRisk = checkins.length ? checkins[checkins.length-1]?.risk : null;
  const S = THEME[lastRisk==="hoch"?"hoch":lastRisk==="mittel"?"mittel":"normal"];
  const totalSupps = supps.morning.length + supps.evening.length;
  const doneSupps  = Object.values(checked).filter(Boolean).length;
  const {ci:ciStreak, su:suStreak} = calcStreaks(checkins, totalSupps);
  const sd = soberDays(checkins, relapses);
  const nextMS = MILESTONES.find(m=>m.days>sd);
  const latestMS = [...MILESTONES].reverse().find(m=>m.days<=sd);

  useEffect(()=>{
    const p=ls.j("profile",null);
    if(p&&p.name){setProfile(p);setOnb(true);}
    setChecked(ls.j("supp_"+DAY(),{}));
    setCIs(ls.j("checkins",[]));
    setRels(ls.j("relapses",[]));
    setValues(ls.j("user_values",[]));
    const sv=ls.j("supplements",null);if(sv)setSupps(sv);
    setJournal(ls.j("journal",[]));
    setPlans(ls.j("wenn_dann",[]));
    setFwRes(ls.j("fw_result",""));
    if(!("Notification" in window))setNotif("unsupported");
    else if(Notification.permission==="granted")setNotif("granted");
    else if(Notification.permission==="denied")setNotif("denied");
    setReady(true);
  },[]);

  function save(key,val){ls.set(key,JSON.stringify(val));}

  const callAI = useCallback(async(system,prompt)=>{
    const r=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system,prompt})});
    const d=await r.json();
    if(!r.ok)throw new Error(d.error||"API Fehler");
    return d.text??"";
  },[]);

  async function submitCI(){
    if(!ci.trigger.trim())return;
    haptic.m();setCiS("loading");setCiErr("");
    try{
      const msg=`Check-in:\n- Stimmung: ${ci.mood}/10\n- Drang: ${ci.urge}/10\n- Schlaf: ${ci.sleep}h\n- Energie: ${ci.energy}/10\n- Trigger: ${ci.trigger}\n- Kontext: ${ci.context||"–"}`;
      const txt=await callAI(sysCheckin(profile.kiModus),msg);
      const risk=parseRisk(txt);
      if(risk==="hoch")haptic.e();else if(risk==="mittel")haptic.m();else haptic.s();
      setCiR(txt);setCiRisk(risk);setCiS("result");
      const entry={date:new Date().toISOString(),mood:ci.mood,urge:ci.urge,sleep:ci.sleep,energy:ci.energy,risk,trigger:ci.trigger,suppsDone:doneSupps};
      setCIs(prev=>{const n=[...prev,entry];save("checkins",n.slice(-30));return n;});
    }catch(e){haptic.e();setCiErr(e.message||"Fehler");setCiS("form");}
  }

  function resetCI(){setCiS("sober");setCiR("");setCiRisk(null);setCi({mood:6,urge:3,sleep:7,energy:6,trigger:"",context:""});}

  async function runPattern(){
    if(checkins.length<2)return;haptic.m();setPatL(true);setPatErr("");
    try{const p=checkins.slice(-14).map(c=>({date:fmt(c.date),mood:c.mood,urge:c.urge,sleep:c.sleep,risk:c.risk,trigger:c.trigger}));setPatRes(await callAI(sysPattern,JSON.stringify(p)));haptic.s();}
    catch(e){haptic.e();setPatErr(e.message||"Fehler");}
    setPatL(false);
  }

  async function runFW(){
    if(checkins.length<3)return;haptic.m();setFwL(true);
    try{const p=checkins.slice(-10).map(c=>({date:fmt(c.date),mood:c.mood,urge:c.urge,sleep:c.sleep||"?",risk:c.risk,suppsDone:c.suppsDone,trigger:c.trigger}));const txt=await callAI(sysFrueh,JSON.stringify(p));setFwRes(txt);save("fw_result",txt);haptic.s();}
    catch{}
    setFwL(false);
  }

  async function submitDenk(){
    if(!denkIn.trim())return;haptic.m();setDenkL(true);setDenkErr("");setDenkOut("");
    try{setDenkOut(await callAI(`Du bist ein präzises Tool. ${sysDenk[denkM]}`,denkIn));haptic.s();}
    catch(e){haptic.e();setDenkErr(e.message||"Fehler");}
    setDenkL(false);
  }

  function toggleSupp(id){
    setChecked(prev=>{const n={...prev,[id]:!prev[id]};save("supp_"+DAY(),n);if(Object.values(n).filter(Boolean).length===totalSupps)haptic.s();return n;});
  }

  async function iosSafeDownload(content, type, filename) {
    const blob = new Blob([content], {type});
    // iOS Safari: try Web Share API first
    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([blob], filename, {type});
        if (navigator.canShare({files:[file]})) {
          await navigator.share({files:[file], title:filename});
          return;
        }
      } catch {}
    }
    // Fallback: open in new tab (iOS) or download (desktop)
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {href:url, download:filename});
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }

  function exportData(){
    haptic.m();
    const rows=checkins.map(c=>[fmt(c.date),c.mood,c.urge,c.sleep||"",c.energy||"",c.risk||"",c.suppsDone,`"${(c.trigger||"").replace(/"/g,'""')}"`].join(","));
    const csv="Datum,Stimmung,Drang,Schlaf,Energie,Risiko,Supps,Trigger\n"+rows.join("\n");
    iosSafeDownload(csv,"text/csv","balanx-export.csv");
  }

  function backupJSON(){
    haptic.m();
    const b={version:2,exportedAt:new Date().toISOString(),profile,checkins,relapses,journal,plans,values,supplements:supps};
    iosSafeDownload(JSON.stringify(b,null,2),"application/json",`balanx-backup-${new Date().toISOString().split("T")[0]}.json`);
  }

  function importJSON(file){
    if(!file)return;
    const r=new FileReader();
    r.onload=e=>{try{
      const d=JSON.parse(e.target.result);
      if(d.profile){setProfile(d.profile);save("profile",d.profile);}
      if(d.checkins){setCIs(d.checkins);save("checkins",d.checkins);}
      if(d.relapses){setRels(d.relapses);save("relapses",d.relapses);}
      if(d.journal){setJournal(d.journal);save("journal",d.journal);}
      if(d.plans){setPlans(d.plans);save("wenn_dann",d.plans);}
      if(d.values){setValues(d.values);save("user_values",d.values);}
      if(d.supplements){setSupps(d.supplements);save("supplements",d.supplements);}
      haptic.s();alert("Import erfolgreich ✓");
    }catch(err){haptic.e();alert("Fehler: "+err.message);}};
    r.readAsText(file);
  }

  const chartData=checkins.slice(-14).map(c=>({date:fmt(c.date),Stimmung:c.mood,Drang:c.urge}));
  const avgMood=checkins.length?(checkins.reduce((s,c)=>s+c.mood,0)/checkins.length).toFixed(1):"–";
  const avgUrge=checkins.length?(checkins.reduce((s,c)=>s+c.urge,0)/checkins.length).toFixed(1):"–";
  const tabTitle={supps:suppSub==="morgen"?"Morgen":suppSub==="info"?"Info":"Supplements",check:checkSub==="journal"?"Journal":checkSub==="plans"?"Pläne":"Check-in",verlauf:vlSub==="monat"?"Monat":"Verlauf",denken:dkSub==="werte"?"Werte":"Denken"};

  if(!ready)return null;
  if(!onboarded)return<Onboarding onDone={()=>{setProfile(ls.j("profile",{}));setOnb(true);}}/>;

  return(
    <div style={{minHeight:"100vh",background:S.bg,fontFamily:"'SF Mono','Fira Code',monospace",color:S.text,maxWidth:430,margin:"0 auto",display:"flex",flexDirection:"column",transition:"background 0.6s"}}>
      <style>{`
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}

        /* Range slider */
        input[type=range]{-webkit-appearance:none;appearance:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:7px;background:${S.neon};box-shadow:0 0 12px ${S.neon}88;border:2px solid rgba(255,255,255,0.15)}

        /* Inputs */
        textarea,input{font-family:inherit;-webkit-font-smoothing:antialiased}
        textarea{resize:none;outline:none;border:none}
        input{-webkit-appearance:none}

        /* Prevent iOS zoom on input focus */
        input,textarea,select{font-size:16px !important}

        /* Animations */
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:0.45}50%{opacity:1}}
        @keyframes scan{0%{transform:translateY(-100%)}100%{transform:translateY(200vh)}}
        @keyframes sosPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,77,109,0.6)}60%{box-shadow:0 0 0 12px rgba(255,77,109,0)}}
        @keyframes ripple{0%,100%{opacity:0.3}50%{opacity:0.8}}

        /* Scrollable area — iOS momentum */
        .scroll-area{overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}

        /* Buttons */
        button{-webkit-tap-highlight-color:transparent;touch-action:manipulation;cursor:pointer}
        button:active{opacity:0.85}

        /* Scrollbar */
        ::-webkit-scrollbar{width:2px}
        ::-webkit-scrollbar-thumb{background:${S.neonB};border-radius:2px}
      `}</style>

      {/* Scanline + glow */}
      <div style={{position:"fixed",top:0,left:0,right:0,height:"100px",background:`linear-gradient(transparent,${S.neonG},transparent)`,animation:"scan 6s linear infinite",pointerEvents:"none",zIndex:10,transition:"background 0.6s"}}/>
      <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"55%",height:1,background:S.neon,boxShadow:`0 0 36px 6px ${S.neon}`,opacity:0.5,pointerEvents:"none",zIndex:10,transition:"background 0.5s,box-shadow 0.5s"}}/>
      {lastRisk==="hoch"&&<div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:1,background:"radial-gradient(ellipse at 50% 0%,rgba(255,77,109,0.05) 0%,transparent 70%)",animation:"ripple 3s ease-in-out infinite"}}/>}

      {/* SOS Button */}
      <button onPointerDown={()=>haptic.e()} onClick={()=>setShowSOS(true)} style={{position:"fixed",bottom:84,right:14,zIndex:200,width:50,height:50,borderRadius:"50%",background:`radial-gradient(circle,${S.danger}18,${S.bg})`,border:`2px solid ${S.danger}`,color:S.danger,fontSize:9,fontWeight:900,fontFamily:"inherit",cursor:"pointer",animation:"sosPulse 2.5s ease-in-out infinite",display:"flex",alignItems:"center",justifyContent:"center"}}>SOS</button>

      {showSOS&&<SOS onClose={()=>setShowSOS(false)} values={values} lastRisk={lastRisk} S={S}/>}

      {/* Settings Modal */}
      {showSett&&(
        <div style={{position:"fixed",inset:0,background:"rgba(8,8,16,0.95)",backdropFilter:"blur(12px)",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div style={{width:"100%",maxWidth:430,background:S.card,border:`1px solid ${S.neonB}`,borderRadius:"18px 18px 0 0",padding:"22px 16px 32px",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
              <span style={{fontSize:12,fontWeight:800,color:S.neon,letterSpacing:"0.1em",textTransform:"uppercase"}}>Einstellungen</span>
              <button onClick={()=>setSett(false)} style={{background:"transparent",border:`1px solid ${S.border}`,borderRadius:7,padding:"5px 10px",fontSize:12,cursor:"pointer",color:S.muted,fontFamily:"inherit"}}>×</button>
            </div>
            {[{l:"Name",k:"name",t:"text",p:"Vorname"},{l:"Identität",k:"identity",t:"text",p:"Ich bin..."}].map(f=>(
              <div key={f.k} style={{marginBottom:14}}>
                <div style={{fontSize:9,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6}}>{f.l}</div>
                <input value={profile[f.k]||""} onChange={e=>setProfile(p=>({...p,[f.k]:e.target.value}))}
                  placeholder={f.p} style={{width:"100%",background:S.input,border:`1px solid ${S.border}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:S.text,outline:"none"}}/>
              </div>
            ))}
            <div style={{marginBottom:18}}>
              <div style={{fontSize:9,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>KI-Stil</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {KI_MODI.map(m=><button key={m.id} onPointerDown={()=>haptic.l()} onClick={()=>setProfile(p=>({...p,kiModus:m.id}))}
                  style={{padding:"9px",borderRadius:9,border:`1px solid ${profile.kiModus===m.id?S.neon:S.border}`,background:profile.kiModus===m.id?S.neonG:"transparent",color:profile.kiModus===m.id?S.neon:S.muted,fontSize:9,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.15s"}}>
                  <span style={{fontSize:13}}>{m.icon}</span>{m.label}
                </button>)}
              </div>
            </div>
            <Btn onClick={()=>{save("profile",profile);setSett(false);haptic.s();}} S={S}>Speichern</Btn>
          </div>
        </div>
      )}

      <div className="scroll-area" style={{flex:1,padding:"26px 16px 92px"}}>
        {/* Header */}
        <div style={{marginBottom:20,animation:"fadeUp 0.4s ease both"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <div style={{fontSize:9,color:S.muted,letterSpacing:"0.18em",textTransform:"uppercase"}}>{new Date().toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long"})}</div>
            <button onPointerDown={()=>haptic.l()} onClick={()=>setSett(true)} style={{background:"transparent",border:`1px solid ${S.border}`,borderRadius:6,padding:"4px 8px",fontSize:9,cursor:"pointer",color:S.muted,fontFamily:"inherit"}}>⚙ {profile.name}</button>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:3,height:28,background:S.neon,borderRadius:2,boxShadow:`0 0 10px ${S.neon}`,transition:"background 0.4s,box-shadow 0.4s"}}/>
              <h1 style={{fontSize:20,fontWeight:900,letterSpacing:"0.06em",margin:0,textTransform:"uppercase",color:S.text}}>{tabTitle[tab]}</h1>
            </div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"flex-end"}}>
              {suStreak>0&&<div style={{display:"flex",alignItems:"center",gap:4,background:`${S.sun}11`,border:`1px solid ${S.sun}33`,borderRadius:20,padding:"3px 9px"}}><span>🔥</span><span style={{fontSize:10,fontWeight:800,color:S.sun,fontFamily:"monospace"}}>{suStreak}</span><span style={{fontSize:7,color:S.muted,textTransform:"uppercase",letterSpacing:"0.1em"}}>Supps</span></div>}
              {ciStreak>0&&<div style={{display:"flex",alignItems:"center",gap:4,background:`${S.neon}11`,border:`1px solid ${S.neon}33`,borderRadius:20,padding:"3px 9px"}}><span>🔥</span><span style={{fontSize:10,fontWeight:800,color:S.neon,fontFamily:"monospace"}}>{ciStreak}</span><span style={{fontSize:7,color:S.muted,textTransform:"uppercase",letterSpacing:"0.1em"}}>Checks</span></div>}
            </div>
          </div>
          {profile.identity&&tab==="supps"&&<div style={{fontSize:10,color:S.neon,marginTop:6,opacity:0.8,fontStyle:"italic"}}>"{profile.identity}"</div>}
        </div>

        {/* ── SUPPS TAB ── */}
        {tab==="supps"&&(
          <div style={{animation:"fadeUp 0.4s ease both"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:14}}>
              {[{id:"list",l:"Liste",icon:"◎"},{id:"morgen",l:"Morgen",icon:"▸"},{id:"info",l:"Info",icon:"◈"}].map(st=>(
                <button key={st.id} onPointerDown={()=>haptic.l()} onClick={()=>setSS(st.id)}
                  style={{padding:"9px 4px",borderRadius:10,border:`1px solid ${suppSub===st.id?S.neon:S.border}`,background:suppSub===st.id?S.neonG:"transparent",color:suppSub===st.id?S.neon:S.muted,fontSize:8,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:3,letterSpacing:"0.08em",textTransform:"uppercase",boxShadow:suppSub===st.id?`0 0 12px ${S.neonG}`:"none",transition:"all 0.2s"}}>
                  <span style={{fontSize:13}}>{st.icon}</span>{st.l}
                </button>
              ))}
            </div>

            {suppSub==="list"&&(<>
              {/* Milestone */}
              {sd>0&&(
                <Card S={S} glow style={{marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{position:"relative",width:64,height:64,flexShrink:0}}>
                      <svg width="64" height="64" style={{transform:"rotate(-90deg)"}}>
                        <circle cx="32" cy="32" r="26" fill="none" stroke={S.border} strokeWidth="2.5"/>
                        {nextMS&&<circle cx="32" cy="32" r="26" fill="none" stroke={S.ok} strokeWidth="2.5" strokeDasharray={2*Math.PI*26} strokeDashoffset={2*Math.PI*26*(1-sd/nextMS.days)} style={{transition:"stroke-dashoffset 1s ease",filter:`drop-shadow(0 0 4px ${S.ok})`}}/>}
                      </svg>
                      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                        <span style={{fontSize:16,fontWeight:900,fontFamily:"monospace",color:S.ok,lineHeight:1}}>{sd}</span>
                        <span style={{fontSize:6,color:S.ok,letterSpacing:"0.1em",textTransform:"uppercase"}}>Tage</span>
                      </div>
                    </div>
                    <div style={{flex:1}}>
                      {latestMS&&<div style={{fontSize:10,fontWeight:800,color:S.ok,marginBottom:3}}>✓ {latestMS.days} Tage erreicht</div>}
                      {nextMS&&<div style={{fontSize:9,color:S.muted,marginBottom:6}}>Nächstes Ziel: <span style={{color:S.text}}>{nextMS.days} Tage</span> ({nextMS.days-sd} noch)</div>}
                      <div style={{height:2,background:S.input,borderRadius:2}}><div style={{height:"100%",borderRadius:2,background:S.ok,width:nextMS?`${(sd/nextMS.days)*100}%`:"100%",boxShadow:`0 0 6px ${S.ok}`,transition:"width 1s ease"}}/></div>
                    </div>
                  </div>
                  {latestMS&&<div style={{marginTop:10,padding:"8px 12px",background:`${S.ok}09`,borderRadius:8,fontSize:10,color:S.text,fontStyle:"italic",lineHeight:1.6}}>"{latestMS.msg(profile.name||"Du")}"</div>}
                </Card>
              )}
              {/* Progress */}
              <Card S={S} glow style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
                  <span style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase"}}>Fortschritt</span>
                  <span style={{fontFamily:"monospace",fontSize:15,fontWeight:900,color:S.neon,textShadow:`0 0 10px ${S.neon}88`,transition:"color 0.4s"}}>{doneSupps} / {totalSupps}</span>
                </div>
                <div style={{height:4,background:S.input,borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:4,background:`linear-gradient(90deg,${S.neon},${S.cyan})`,width:`${(doneSupps/totalSupps)*100}%`,boxShadow:`0 0 8px ${S.neon}`,transition:"width 0.4s ease"}}/>
                </div>
              </Card>
              {[{label:"10:00 Uhr",sub:"mit Essen",items:supps.morning,accent:S.sun},{label:"19-20 Uhr",sub:"zum Abendbrot",items:supps.evening,accent:S.eve}].map(sec=>(
                <div key={sec.label} style={{marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,paddingBottom:8}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:sec.accent,boxShadow:`0 0 7px ${sec.accent}`}}/>
                    <span style={{fontSize:11,fontWeight:800,color:sec.accent,letterSpacing:"0.08em",textTransform:"uppercase"}}>{sec.label}</span>
                    <span style={{fontSize:9,color:S.muted,marginLeft:"auto"}}>{sec.sub}</span>
                  </div>
                  <Card S={S} style={{padding:"0 16px"}}>
                    {sec.items.map(s=>(
                      <div key={s.id} onClick={()=>toggleSupp(s.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 0",borderBottom:`1px solid ${S.border}`,cursor:"pointer"}}>
                        <div style={{width:22,height:22,borderRadius:6,flexShrink:0,border:`1.5px solid ${checked[s.id]?sec.accent:S.muted}`,background:checked[s.id]?`${sec.accent}20`:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",boxShadow:checked[s.id]?`0 0 10px ${sec.accent}55`:"none"}}>
                          {checked[s.id]&&<span style={{color:sec.accent,fontSize:11,fontWeight:900}}>✓</span>}
                        </div>
                        <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:checked[s.id]?S.muted:S.text,textDecoration:checked[s.id]?"line-through":"none",transition:"all 0.2s"}}>{s.name}</div><div style={{fontSize:10,color:S.muted,marginTop:2}}>{s.effect}</div></div>
                        <div style={{fontSize:10,fontFamily:"monospace",color:checked[s.id]?`${sec.accent}88`:S.muted}}>{s.dose}</div>
                      </div>
                    ))}
                  </Card>
                </div>
              ))}
              {doneSupps===totalSupps&&<Card S={S} glow style={{textAlign:"center",padding:"22px",border:`1px solid ${S.ok}`}}><div style={{fontSize:24,color:S.ok,marginBottom:5}}>✓</div><div style={{fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",color:S.ok}}>System vollständig</div></Card>}
              <button onPointerDown={()=>haptic.l()} onClick={()=>{setChecked({});save("supp_"+DAY(),{});}}
                style={{width:"100%",padding:"12px",background:"transparent",border:`1px solid ${S.border}`,borderRadius:10,fontSize:10,fontWeight:700,cursor:"pointer",color:S.muted,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"inherit"}}>
                ↺ Reset
              </button>
            </>)}

            {suppSub==="morgen"&&(
              <div style={{animation:"fadeUp 0.4s ease both"}}>
                <Card S={S} glow>
                  <div style={{fontSize:9,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:4}}>Morgen-Protokoll</div>
                  <div style={{fontSize:10,color:S.muted,marginBottom:14,lineHeight:1.6}}>Starte strukturiert in den Tag. Fülle die Felder aus — KI gibt dir einen kurzen personalisierten Impuls.</div>
                  {[
                  {k:"focus",l:"Worauf legst du heute den Fokus?",p:"z.B. ruhig bleiben, Arbeit fertigstellen, Termine durchziehen..."},
                  {k:"ziel",  l:"Eine konkrete Sache die heute zählt",p:"z.B. heute Abend pünktlich nach Hause, kein Social Media nach 20 Uhr..."}
                ].map(f=>(
                    <div key={f.k} style={{marginBottom:10}}>
                      <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:5}}>{f.l}</div>
                      <textarea rows={2} placeholder={f.p} style={{width:"100%",background:S.input,border:`1px solid ${S.border}`,borderRadius:8,padding:"8px 10px",fontSize:12,lineHeight:1.5,color:S.text}}/>
                    </div>
                  ))}
                  <div style={{fontSize:9,color:S.muted,lineHeight:1.6}}>Nutze den KI-Modus "{profile.kiModus}" für deinen Tagesstart.</div>
                </Card>
              </div>
            )}

            {suppSub==="info"&&(
              <div style={{animation:"fadeUp 0.4s ease both"}}>
                <div style={{fontSize:9,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:10}}>Supplement-Liste · {totalSupps} Einträge</div>
                {[{items:supps.morning,accent:S.sun,label:"Morgen"},{items:supps.evening,accent:S.eve,label:"Abend"}].map(sec=>(
                  <Card key={sec.label} S={S} style={{marginBottom:10}}>
                    <div style={{fontSize:9,fontWeight:800,color:sec.accent,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>{sec.label}</div>
                    {sec.items.map(s=>(
                      <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${S.border}`}}>
                        <div><div style={{fontSize:13,fontWeight:700,color:S.text}}>{s.name}</div><div style={{fontSize:10,color:S.muted,marginTop:1}}>{s.effect}</div></div>
                        <span style={{fontSize:10,fontFamily:"monospace",color:S.muted,flexShrink:0,marginLeft:8}}>{s.dose}</span>
                      </div>
                    ))}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CHECK TAB ── */}
        {tab==="check"&&(
          <div style={{animation:"fadeUp 0.4s ease both"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:14}}>
              {[{id:"check",l:"Check-in",icon:"◈"},{id:"journal",l:"Journal",icon:"✦"},{id:"plans",l:"Pläne",icon:"→"}].map(st=>(
                <button key={st.id} onPointerDown={()=>haptic.l()} onClick={()=>setCS(st.id)}
                  style={{padding:"9px 4px",borderRadius:10,border:`1px solid ${checkSub===st.id?S.neon:S.border}`,background:checkSub===st.id?S.neonG:"transparent",color:checkSub===st.id?S.neon:S.muted,fontSize:8,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:3,letterSpacing:"0.08em",textTransform:"uppercase",boxShadow:checkSub===st.id?`0 0 12px ${S.neonG}`:"none",transition:"all 0.2s"}}>
                  <span style={{fontSize:13}}>{st.icon}</span>{st.l}
                </button>
              ))}
            </div>

            {checkSub==="check"&&(<>
              {ciStep==="sober"&&(
                <Card S={S} glow style={{textAlign:"center",padding:"26px 18px"}}>
                  <div style={{fontSize:12,fontWeight:800,color:S.text,letterSpacing:"0.04em",marginBottom:4}}>Warst du heute nüchtern?</div>
                  <div style={{fontSize:10,color:S.muted,marginBottom:18,lineHeight:1.6}}>Ehrliche Antwort — kein Urteil. Bei Nein kommt zuerst ein kurzes Relapse-Review, dann der normale Check-in.</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <button onPointerDown={()=>haptic.s()} onClick={()=>setCiS("form")} style={{padding:"16px",borderRadius:11,border:`1px solid ${S.ok}`,background:`${S.ok}11`,color:S.ok,fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 0 14px ${S.ok}33`}}>✓ Ja</button>
                    <button onPointerDown={()=>haptic.m()} onClick={()=>setCiS("relapse")} style={{padding:"16px",borderRadius:11,border:`1px solid ${S.danger}`,background:`${S.danger}11`,color:S.danger,fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 0 14px ${S.danger}33`}}>Nein</button>
                  </div>
                </Card>
              )}

              {ciStep==="relapse"&&(
                <div>
                  <div style={{background:`${S.neonG}`,border:`1px solid ${S.neonB}`,borderRadius:10,padding:"12px 14px",marginBottom:14,fontSize:11,color:S.text,lineHeight:1.8}}>
                    <strong style={{color:S.neon}}>Kein Vorwurf. Kein Urteil.</strong><br/>
                    <span style={{color:S.muted,fontSize:10}}>Je ehrlicher du antwortest, desto besser kann die KI das Muster erkennen — und beim nächsten Mal helfen. Du musst nicht alles ausfüllen.</span>
                  </div>
                  {["Trigger","Gedanke davor","Emotion","Ort"].map((l,i)=>(
                    <div key={i} style={{marginBottom:10}}>
                      <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:5}}>{l}</div>
                      <textarea rows={l==="Trigger"||l==="Gedanke davor"?2:1} style={{width:"100%",background:S.input,border:`1px solid ${S.border}`,borderRadius:8,padding:"8px 10px",fontSize:12,lineHeight:1.5,color:S.text}}/>
                    </div>
                  ))}
                  <Btn onClick={()=>setCiS("form")} color={S.danger} S={S}>Weiter zum Check-in</Btn>
                  <button onPointerDown={()=>haptic.l()} onClick={()=>setCiS("form")} style={{width:"100%",padding:"10px",background:"transparent",border:`1px solid ${S.border}`,borderRadius:10,fontSize:9,fontWeight:700,cursor:"pointer",color:S.muted,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"inherit"}}>Überspringen</button>
                </div>
              )}

              {ciStep==="form"&&(<>
                {ci.urge>=7&&<div style={{background:"rgba(255,77,109,0.06)",border:"1px solid rgba(255,77,109,0.2)",borderRadius:9,padding:"7px 11px",marginBottom:10,fontSize:10,color:"#ff6b85",display:"flex",alignItems:"center",gap:7}}><span style={{animation:"pulse 1.5s ease-in-out infinite"}}>⚠️</span>Hoher Drang. Hol tief Luft.</div>}
                {ci.sleep<=4&&<div style={{background:"rgba(255,193,7,0.06)",border:"1px solid rgba(255,193,7,0.2)",borderRadius:9,padding:"7px 11px",marginBottom:10,fontSize:10,color:"#ffc107",display:"flex",alignItems:"center",gap:7}}>😴 Schlafmangel — heute achtsam bleiben.</div>}
                <Card S={S} glow style={{marginBottom:10}}>
                  <Slider label="Wohlbefinden" min={1} max={10} low="Schlecht" high="Gut"  value={ci.mood}   onChange={v=>setCi(c=>({...c,mood:v}))}   color={S.cyan}   S={S}/>
                  <Slider label="Drang"        min={0} max={10} low="Keiner"  high="Stark" value={ci.urge}   onChange={v=>setCi(c=>({...c,urge:v}))}   color={ci.urge>=8?S.danger:ci.urge>=5?"#ffc107":S.ok} S={S}/>
                  <Slider label="Schlaf (h)"   min={0} max={12} low="0h"      high="12h"   value={ci.sleep}  onChange={v=>setCi(c=>({...c,sleep:v}))}  color={ci.sleep<=4?"#ffc107":S.cyan} S={S}/>
                  <Slider label="Energie"      min={1} max={10} low="Leer"    high="Voll"  value={ci.energy} onChange={v=>setCi(c=>({...c,energy:v}))} color={S.sun}    S={S}/>
                </Card>
                <Card S={S} style={{marginBottom:10}}>
                  <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4}}>Was hat heute Druck gemacht?</div>
                  <div style={{fontSize:9,color:S.muted,marginBottom:8,lineHeight:1.5}}>Stress, Streit, Einsamkeit, Langeweile, eine bestimmte Situation...</div>
                  <textarea rows={3} placeholder="Was hat heute Druck gemacht? z.B. Stress bei der Arbeit, Streit, Einsamkeit, Langeweile, Schlafmangel..." value={ci.trigger} onChange={e=>setCi(c=>({...c,trigger:e.target.value}))}
                    style={{width:"100%",background:S.input,borderRadius:7,padding:"9px 11px",fontSize:13,lineHeight:1.5,color:S.text}}/>
                </Card>
                <Card S={S} style={{marginBottom:14}}>
                  <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4}}>Zusätzlicher Kontext</div>
                  <div style={{fontSize:9,color:S.muted,marginBottom:8,lineHeight:1.5}}>Optional — hilft der KI. z.B. schlechter Schlaf, wenig gegessen, bestimmte Person getroffen.</div>
                  <textarea rows={2} placeholder="Optional: Wie war dein Schlaf? Hast du gegessen? Was ist heute noch passiert?" value={ci.context} onChange={e=>setCi(c=>({...c,context:e.target.value}))}
                    style={{width:"100%",background:S.input,borderRadius:7,padding:"9px 11px",fontSize:13,lineHeight:1.5,color:S.text}}/>
                </Card>
                <div style={{fontSize:9,color:S.muted,textAlign:"center",marginBottom:10}}>◎ {doneSupps}/{totalSupps} Supplements · {profile.kiModus} Modus</div>
                {ciErr&&<ErrBox msg={ciErr} S={S}/>}
                <Btn onClick={submitCI} disabled={!ci.trigger.trim()} S={S}>◈ Auswerten</Btn>
              </>)}

              {ciStep==="loading"&&(
                <div style={{textAlign:"center",padding:"70px 0"}}>
                  <div style={{width:38,height:38,border:`2px solid ${S.neonB}`,borderTopColor:S.neon,borderRadius:"50%",animation:"spin 0.6s linear infinite",margin:"0 auto 14px",boxShadow:`0 0 18px ${S.neonG}`}}/>
                  <p style={{color:S.muted,fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase",animation:"pulse 1.5s ease infinite"}}>Analyse läuft...</p>
                </div>
              )}

              {ciStep==="result"&&(<>
                {ciRisk&&(
                  <div style={{background:RISK[ciRisk].bg,borderRadius:11,padding:"11px 14px",display:"flex",alignItems:"center",gap:9,marginBottom:11,border:`1px solid ${RISK[ciRisk].border}`,animation:ciRisk==="hoch"?"ripple 2s ease-in-out infinite":"none"}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:RISK[ciRisk].dot,boxShadow:`0 0 8px ${RISK[ciRisk].dot}`,flexShrink:0}}/>
                    <span style={{fontSize:10,fontWeight:800,color:RISK[ciRisk].text,letterSpacing:"0.1em",textTransform:"uppercase"}}>Risiko: {ciRisk}</span>
                    {ciRisk==="hoch"&&<button onPointerDown={()=>haptic.e()} onClick={()=>setShowSOS(true)} style={{marginLeft:"auto",padding:"5px 10px",borderRadius:7,border:`1px solid ${S.danger}`,background:`${S.danger}18`,color:S.danger,fontSize:9,fontWeight:800,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.1em",textTransform:"uppercase"}}>SOS</button>}
                  </div>
                )}
                <Card S={S} glow style={{marginBottom:12,lineHeight:1.8,fontSize:13}}>
                  <div dangerouslySetInnerHTML={{__html:md(ciResult,S.neon)}}/>
                </Card>
                <Btn onClick={resetCI} S={S}>↺ Neuer Check-in</Btn>
              </>)}
            </>)}

            {checkSub==="journal"&&(
              <div style={{animation:"fadeUp 0.4s ease both"}}>
                <Card S={S} glow style={{marginBottom:14}}>
                  <div style={{fontSize:9,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:4}}>Tages-Journal</div>
                  <div style={{fontSize:10,color:S.muted,marginBottom:12,lineHeight:1.6}}>2 Fragen, ca. 30 Sekunden. Wird täglich gespeichert.</div>
                  {[
                    {id:"hard",l:"Was war heute schwer?",p:"Kurz und ehrlich. Was hat dich gefordert oder belastet?",c:"#ff6b85"},
                    {id:"helped",l:"Was hat geholfen oder gut getan?",p:"Auch kleine Dinge zählen. z.B. Spaziergang, Gespräch, Musik.",c:S.ok}
                  ].map(q=>(
                    <div key={q.id} style={{marginBottom:11}}>
                      <div style={{fontSize:10,fontWeight:800,color:q.c,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:5}}>{q.l}</div>
                      <textarea rows={2} placeholder={q.p} value={jForm[q.id]} onChange={e=>setJForm(p=>({...p,[q.id]:e.target.value}))}
                        style={{width:"100%",background:S.input,border:`1px solid ${S.border}`,borderRadius:8,padding:"8px 10px",fontSize:13,lineHeight:1.5,color:S.text}}/>
                    </div>
                  ))}
                  {jSaved?<div style={{textAlign:"center",padding:"10px",color:S.ok,fontSize:12,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em"}}>✓ Gespeichert</div>:
                  <Btn onClick={()=>{if(!jForm.hard.trim()&&!jForm.helped.trim())return;haptic.s();const e={date:new Date().toISOString(),...jForm};const n=[e,...journal.filter(j=>new Date(j.date).toDateString()!==new Date().toDateString())].slice(0,60);setJournal(n);save("journal",n);setJForm({hard:"",helped:""});setJSaved(true);setTimeout(()=>setJSaved(false),2000);}} color={S.ok} S={S} disabled={!jForm.hard.trim()&&!jForm.helped.trim()}>✦ Speichern</Btn>}
                </Card>
                {journal.slice(0,8).map((e,i)=>(
                  <Card key={i} S={S} style={{marginBottom:8,padding:"12px 14px"}}>
                    <div style={{fontSize:9,color:S.muted,fontFamily:"monospace",marginBottom:7}}>{fmt(e.date)}</div>
                    {e.hard&&<div style={{marginBottom:5}}><div style={{fontSize:8,color:"#ff6b85",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:2}}>Schwer</div><div style={{fontSize:12,color:S.text,lineHeight:1.5}}>{e.hard}</div></div>}
                    {e.helped&&<div><div style={{fontSize:8,color:S.ok,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:2}}>Geholfen</div><div style={{fontSize:12,color:S.text,lineHeight:1.5}}>{e.helped}</div></div>}
                  </Card>
                ))}
              </div>
            )}

            {checkSub==="plans"&&(
              <div style={{animation:"fadeUp 0.4s ease both"}}>
                <PlaeneEditor plans={plans} setPlans={setPlans} save={save} S={S}/>
              </div>
            )}
          </div>
        )}

        {/* ── VERLAUF TAB ── */}
        {tab==="verlauf"&&(
          <div style={{animation:"fadeUp 0.4s ease both"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
              {[{id:"verlauf",l:"Verlauf",icon:"▲"},{id:"monat",l:"Monat",icon:"◉"}].map(st=>(
                <button key={st.id} onPointerDown={()=>haptic.l()} onClick={()=>setVS(st.id)}
                  style={{padding:"9px",borderRadius:10,border:`1px solid ${vlSub===st.id?S.neon:S.border}`,background:vlSub===st.id?S.neonG:"transparent",color:vlSub===st.id?S.neon:S.muted,fontSize:9,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5,letterSpacing:"0.1em",textTransform:"uppercase",transition:"all 0.2s"}}>
                  <span style={{fontSize:12}}>{st.icon}</span>{st.l}
                </button>
              ))}
            </div>

            {vlSub==="monat"&&<MonatView checkins={checkins} totalSupps={totalSupps} S={S}/>}

            {vlSub==="verlauf"&&(<>
              {checkins.length===0
                ? <Card S={S} style={{textAlign:"center",padding:"50px 20px",color:S.muted}}>
                    <div style={{fontSize:26,opacity:0.3,marginBottom:10}}>▲</div>
                    <div style={{fontWeight:700,textTransform:"uppercase",marginBottom:8}}>Noch keine Daten</div>
                    <div style={{fontSize:11,lineHeight:1.7}}>Mach deinen ersten Check-in im Check-Tab.<br/>Deine Daten erscheinen dann hier.</div>
                  </Card>:<>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                  {[{l:"Ø Stimmung",v:avgMood,c:S.cyan},{l:"Ø Drang",v:avgUrge,c:S.danger},{l:"Rückfälle",v:relapses.length,c:S.sun}].map(s=>(
                    <Card key={s.l} S={S} style={{textAlign:"center",padding:"13px 7px",marginBottom:0}}>
                      <div style={{fontSize:19,fontWeight:900,color:s.c,textShadow:`0 0 10px ${s.c}`}}>{s.v}</div>
                      <div style={{fontSize:7,color:S.muted,marginTop:3,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>{s.l}</div>
                    </Card>
                  ))}
                </div>

                {chartData.length>0&&<Card S={S} style={{marginBottom:12,paddingLeft:6,paddingRight:6}}>
                  <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:10}}>Letzte {chartData.length} Einträge</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData} margin={{top:4,right:8,left:-28,bottom:4}}>
                      <CartesianGrid strokeDasharray="3 3" stroke={S.border}/>
                      <XAxis dataKey="date" tick={{fontSize:8,fill:S.muted,fontFamily:"monospace"}}/>
                      <YAxis domain={[0,10]} tick={{fontSize:8,fill:S.muted,fontFamily:"monospace"}}/>
                      <Tooltip contentStyle={{fontFamily:"monospace",fontSize:11,background:S.card,border:`1px solid ${S.neonB}`,borderRadius:7,color:S.text}}/>
                      <Legend iconType="circle" iconSize={5} wrapperStyle={{fontSize:9,fontFamily:"monospace"}}/>
                      <Line type="monotone" dataKey="Stimmung" stroke={S.cyan}   strokeWidth={2} dot={false}/>
                      <Line type="monotone" dataKey="Drang"    stroke={S.danger} strokeWidth={2} dot={false}/>
                    </LineChart>
                  </ResponsiveContainer>
                </Card>}

                {/* Frühwarnsystem */}
                <Card S={S} glow style={{marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <div><div style={{fontSize:12,fontWeight:800}}>KI-Frühwarnsystem</div><div style={{fontSize:9,color:S.muted,marginTop:1}}>{checkins.length>=3?`${Math.min(checkins.length,10)} Einträge`:"Mind. 3 nötig"}</div></div>
                    <button onPointerDown={()=>haptic.m()} onClick={runFW} disabled={fwL||checkins.length<3} style={{background:"transparent",color:fwL?S.muted:S.gold,border:`1px solid ${fwL?S.border:"rgba(255,215,0,0.35)"}`,borderRadius:7,padding:"7px 12px",fontSize:9,fontWeight:800,cursor:fwL||checkins.length<3?"default":"pointer",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                      {fwL?<Spin S={S}/>:"▶ Scan"}
                    </button>
                  </div>
                  {fwRes
                    ? <div style={{fontSize:12,lineHeight:1.7,borderTop:`1px solid ${S.border}`,paddingTop:10}} dangerouslySetInnerHTML={{__html:md(fwRes,S.neon)}}/>
                    : <div style={{fontSize:11,color:S.muted,lineHeight:1.6}}>{checkins.length<3?"Mind. 3 Check-ins nötig — danach analysiert das System täglich automatisch.":"Klick auf Scan für eine aktuelle Analyse."}</div>
                  }
                </Card>

                {/* Muster-Analyse */}
                <Card S={S} glow style={{marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <div><div style={{fontSize:12,fontWeight:800}}>Muster-Analyse</div><div style={{fontSize:9,color:S.muted,marginTop:1}}>KI · letzte {Math.min(checkins.length,14)} Einträge</div></div>
                    <button onPointerDown={()=>haptic.m()} onClick={runPattern} disabled={patL||checkins.length<2} style={{background:"transparent",color:patL?S.muted:S.neon,border:`1px solid ${patL?S.border:S.neonB}`,borderRadius:7,padding:"7px 12px",fontSize:9,fontWeight:800,cursor:"pointer",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                      {patL?<Spin S={S}/>:"◈ Scan"}
                    </button>
                  </div>
                  {patErr&&<ErrBox msg={patErr} S={S}/>}
                  {checkins.length<2
                    ? <div style={{fontSize:11,color:S.muted,lineHeight:1.6}}>Mind. 2 Check-ins nötig — danach siehst du hier deine Trigger-Muster.</div>
                    : patRes
                      ? <div style={{fontSize:12,lineHeight:1.7,borderTop:`1px solid ${S.border}`,paddingTop:10}} dangerouslySetInnerHTML={{__html:md(patRes,S.neon)}}/>
                      : <div style={{fontSize:11,color:S.muted}}>Klick auf Scan um Muster in deinen Check-ins zu finden.</div>
                  }
                </Card>

                <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:7}}>Letzte Einträge</div>
                {[...checkins].reverse().slice(0,6).map((c,i)=>{const rm=c.risk?RISK[c.risk]:null;return(
                  <Card key={i} S={S} style={{marginBottom:8,display:"flex",alignItems:"center",gap:10,padding:"11px 13px"}}>
                    <div style={{fontFamily:"monospace",fontSize:9,color:S.muted,flexShrink:0}}>{fmt(c.date)}</div>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,marginBottom:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.trigger}</div><div style={{fontSize:9,color:S.muted,fontFamily:"monospace"}}>↑{c.mood} · ↑{c.urge}{c.sleep?` · 💤${c.sleep}h`:""}</div></div>
                    {rm&&<div style={{background:rm.bg,color:rm.text,fontSize:8,fontWeight:800,padding:"2px 7px",borderRadius:20,flexShrink:0,textTransform:"uppercase",border:`1px solid ${rm.border}`}}>{c.risk}</div>}
                  </Card>
                );})}

                {/* Export */}
                <Card S={S} style={{marginTop:8}}>
                  <div style={{fontSize:9,fontWeight:700,color:S.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:10}}>Export & Backup</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
                    <button onPointerDown={()=>haptic.l()} onClick={exportData} style={{padding:"11px 7px",background:"transparent",border:`1px solid ${S.border}`,borderRadius:9,fontSize:8,fontWeight:800,cursor:"pointer",color:S.muted,fontFamily:"inherit",letterSpacing:"0.08em",textTransform:"uppercase",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}><span style={{fontSize:13}}>▼</span>CSV</button>
                    <button onPointerDown={()=>haptic.l()} onClick={backupJSON} style={{padding:"11px 7px",background:`${S.ok}09`,border:`1px solid ${S.ok}44`,borderRadius:9,fontSize:8,fontWeight:800,cursor:"pointer",color:S.ok,fontFamily:"inherit",letterSpacing:"0.08em",textTransform:"uppercase",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}><span style={{fontSize:13}}>↓</span>Backup</button>
                    <label style={{padding:"11px 7px",background:`${S.gold}09`,border:`1px solid ${S.gold}44`,borderRadius:9,fontSize:8,fontWeight:800,cursor:"pointer",color:S.gold,fontFamily:"inherit",letterSpacing:"0.08em",textTransform:"uppercase",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}><span style={{fontSize:13}}>↑</span>Import<input type="file" accept=".json" onChange={e=>importJSON(e.target.files?.[0])} style={{display:"none"}}/></label>
                  </div>
                </Card>
              </>}
            </>)}
          </div>
        )}

        {/* ── DENKEN TAB ── */}
        {tab==="denken"&&(
          <div style={{animation:"fadeUp 0.4s ease both"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
              {[{id:"denken",l:"Denken",icon:"⊕"},{id:"werte",l:"Werte",icon:"◉"}].map(st=>(
                <button key={st.id} onPointerDown={()=>haptic.l()} onClick={()=>setDS(st.id)}
                  style={{padding:"9px",borderRadius:10,border:`1px solid ${dkSub===st.id?S.neon:S.border}`,background:dkSub===st.id?S.neonG:"transparent",color:dkSub===st.id?S.neon:S.muted,fontSize:9,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5,letterSpacing:"0.1em",textTransform:"uppercase",transition:"all 0.2s"}}>
                  <span style={{fontSize:12}}>{st.icon}</span>{st.l}
                </button>
              ))}
            </div>

            {dkSub==="werte"&&(
              <div style={{animation:"fadeUp 0.4s ease both"}}>
                <Card S={S} glow style={{marginBottom:14}}>
                  <div style={{fontSize:11,fontWeight:800,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>Deine Werte</div>
                  <div style={{fontSize:10,color:S.muted,marginBottom:12,lineHeight:1.6}}>Wähle bis zu 6 Dinge, für die du nüchtern bleiben willst. Diese erscheinen im SOS-Screen — genau dann wenn du sie brauchst.</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                    {["Familie","Gesundheit","Freiheit","Geld","Selbstrespekt","Zukunft","Klarheit","Beziehungen","Sport","Würde"].map(v=>{const sel=values.includes(v);return(
                      <button key={v} onPointerDown={()=>haptic.l()} onClick={()=>{const n=sel?values.filter(x=>x!==v):(values.length<6?[...values,v]:values);setValues(n);save("user_values",n);}}
                        style={{padding:"5px 11px",borderRadius:20,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${sel?S.neon:S.border}`,background:sel?S.neonG:"transparent",color:sel?S.neon:S.muted,transition:"all 0.15s"}}>
                        {v}
                      </button>
                    );})}
                  </div>
                  {values.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:5}}>{values.map(v=><div key={v} style={{display:"flex",alignItems:"center",gap:4,background:S.neonG,border:`1px solid ${S.neonB}`,borderRadius:20,padding:"3px 9px"}}><span style={{fontSize:10,fontWeight:700,color:S.neon}}>{v}</span><button onPointerDown={()=>haptic.l()} onClick={()=>{const n=values.filter(x=>x!==v);setValues(n);save("user_values",n);}} style={{background:"none",border:"none",color:S.muted,cursor:"pointer",fontSize:12,padding:0,lineHeight:1}}>×</button></div>)}</div>}
                </Card>
              </div>
            )}

            {dkSub==="denken"&&(<>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div style={{fontSize:9,color:S.muted,letterSpacing:"0.1em",textTransform:"uppercase"}}>Modus: <span style={{color:S.neon}}>{KI_MODI.find(m=>m.id===profile.kiModus)?.label}</span></div>
                <button onPointerDown={()=>haptic.l()} onClick={()=>setSett(true)} style={{background:"transparent",border:`1px solid ${S.border}`,borderRadius:5,padding:"3px 7px",fontSize:8,cursor:"pointer",color:S.muted,fontFamily:"inherit"}}>ändern</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:14}}>
                {[
                  {id:"analyse",    l:"Analysieren",  icon:"◈", hint:"Text verstehen"},
                  {id:"entscheidung",l:"Entscheiden", icon:"⊕", hint:"Pro & Contra"},
                  {id:"impuls",     l:"Impuls stoppen",icon:"⚡",hint:"Sofort-Hilfe"},
                  {id:"reframe",    l:"Umdenken",     icon:"⟳", hint:"Gedanken neu formulieren"},
                ].map(m=>(
                  <button key={m.id} onPointerDown={()=>haptic.l()} onClick={()=>{setDenkM(m.id);setDenkOut("");setDenkErr("");}}
                    style={{padding:"11px 5px",borderRadius:10,border:`1px solid ${denkM===m.id?S.neon:S.border}`,background:denkM===m.id?S.neonG:"transparent",color:denkM===m.id?S.neon:S.muted,fontSize:8,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:3,letterSpacing:"0.08em",textTransform:"uppercase",boxShadow:denkM===m.id?`0 0 14px ${S.neonG}`:"none",transition:"all 0.2s"}}>
                    <span style={{fontSize:15}}>{m.icon}</span>
                    <span style={{fontWeight:900}}>{m.l}</span>
                    <span style={{fontSize:7,opacity:0.7,letterSpacing:"0.04em",textTransform:"none",fontWeight:400}}>{m.hint}</span>
                  </button>
                ))}
              </div>
              {denkM==="reframe"&&<Card S={S} style={{marginBottom:9,padding:"9px 13px"}}>
                <div style={{fontSize:10,color:S.text,lineHeight:1.7,fontWeight:700,marginBottom:3}}>Wie funktioniert Reframe?</div>
                <div style={{fontSize:10,color:S.muted,lineHeight:1.7}}>Schreib den negativen Gedanken genau so auf, wie er in deinem Kopf klingt — nicht abgemildert. Die KI analysiert das Muster dahinter und formuliert ihn realistischer um. Kein positives Denken, nur mehr Präzision.<br/><span style={{color:S.neon}}>Beispiel: "Ich schaffe das nie." oder "Alle geben irgendwann auf."</span></div>
              </Card>}
              <Card S={S} glow={denkIn.length>0} style={{marginBottom:9}}>
                <textarea rows={6} placeholder={{analyse:"Text, Artikel oder Situation hier einfügen — KI bringt es auf den Punkt.",entscheidung:"Beschreib die Entscheidung und was du schon weißt. z.B. Soll ich den Job wechseln? Ich habe Angebot X...",impuls:"Was passiert gerade? Schreib es raus — ohne Filter. z.B. Ich will jetzt gerade...",reframe:"Welcher Gedanke dreht sich im Kreis? Genau so aufschreiben wie er kommt. z.B. Ich schaffe das nie..."}[denkM]} value={denkIn} onChange={e=>{setDenkIn(e.target.value);setDenkOut("");}}
                  style={{width:"100%",background:S.input,borderRadius:7,padding:"9px 11px",fontSize:13,lineHeight:1.6,color:S.text}}/>
              </Card>
              {denkErr&&<ErrBox msg={denkErr} S={S}/>}
              <Btn onClick={submitDenk} disabled={!denkIn.trim()||denkL} S={S}>
                {denkL?<Spin S={S}/>:`${({analyse:"◈",entscheidung:"⊕",impuls:"⚡",reframe:"⟳"}[denkM]||"◈")} Analysieren`}
              </Btn>
              {denkOut&&<Card S={S} glow style={{lineHeight:1.8,fontSize:13,marginTop:9,animation:"fadeUp 0.3s ease both"}}><div dangerouslySetInnerHTML={{__html:md(denkOut,S.neon)}}/></Card>}
            </>)}
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:`${S.card}f8`,backdropFilter:"blur(14px)",WebkitBackdropFilter:"blur(14px)",borderTop:`1px solid ${S.neonB}`,boxShadow:`0 -10px 36px ${S.neonG}`,display:"flex",paddingBottom:"max(env(safe-area-inset-bottom),8px)",transition:"all 0.5s",zIndex:100}}>
        {TABS.map(t=>(
          <button key={t.id} onPointerDown={()=>haptic.l()} onClick={()=>setTab(t.id)}
            style={{flex:1,background:"none",border:"none",cursor:"pointer",padding:"12px 0 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:4,position:"relative"}}>
            {t.id==="check"&&lastRisk&&RISK[lastRisk]&&<div style={{position:"absolute",top:8,right:"50%",transform:"translateX(11px)",width:6,height:6,borderRadius:"50%",background:RISK[lastRisk].dot,boxShadow:`0 0 7px ${RISK[lastRisk].dot}`,animation:"ripple 2s ease-in-out infinite"}}/>}
            <span style={{fontSize:17,color:tab===t.id?S.neon:S.muted,textShadow:tab===t.id?`0 0 12px ${S.neon}`:"none",transform:tab===t.id?"scale(1.1)":"scale(1)",display:"inline-block",transition:"all 0.25s"}}>{t.icon}</span>
            <span style={{fontSize:8,fontWeight:800,color:tab===t.id?S.neon:S.muted,letterSpacing:"0.12em",textTransform:"uppercase",transition:"color 0.25s"}}>{t.label}</span>
            <div style={{width:tab===t.id?18:0,height:2,borderRadius:2,background:S.neon,boxShadow:tab===t.id?`0 0 8px ${S.neon}`:"none",transition:"width 0.3s cubic-bezier(0.34,1.56,0.64,1)"}}/>
          </button>
        ))}
      </div>
    </div>
  );
}
