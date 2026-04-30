// ─── Theme ────────────────────────────────────────────────────────────────────
export const BASE = {
bg:”#080810”, card:”#0e0e1a”, input:”#12121f”,
neon:”#b44dff”, neonG:“rgba(180,77,255,0.18)”, neonB:“rgba(180,77,255,0.35)”,
cyan:”#00f5ff”, text:”#f0eaff”, muted:”#6b6485”, border:“rgba(180,77,255,0.15)”,
danger:”#ff4d6d”, ok:”#00ff9d”, sun:”#ff6b35”, eve:”#b44dff”, gold:”#ffd700”,
};
export const THEME = {
hoch:   {…BASE, neon:”#ff4d6d”, neonG:“rgba(255,77,109,0.20)”, neonB:“rgba(255,77,109,0.45)”, border:“rgba(255,77,109,0.18)”, card:”#100810”},
mittel: {…BASE, neon:”#ffc107”, neonG:“rgba(255,193,7,0.16)”,  neonB:“rgba(255,193,7,0.40)”,  border:“rgba(255,193,7,0.15)”,  card:”#0f0e09”},
normal: {…BASE},
};
export const RISK = {
niedrig:{bg:“rgba(0,255,157,0.08)”,  text:”#00ff9d”, dot:”#00ff9d”, border:“rgba(0,255,157,0.3)”},
mittel: {bg:“rgba(255,193,7,0.08)”,  text:”#ffc107”, dot:”#ffc107”, border:“rgba(255,193,7,0.3)”},
hoch:   {bg:“rgba(255,77,109,0.08)”, text:”#ff4d6d”, dot:”#ff4d6d”, border:“rgba(255,77,109,0.3)”},
};

// ─── Supplements ─────────────────────────────────────────────────────────────
export const DEF_SUPPS = {
morning:[
{id:“m1”,  name:“NAC”,           dose:“600 mg”,       effect:“Glutamat stabilisieren, Craving runter”},
{id:“m2”,  name:“Vitamin C”,     dose:“500 mg”,       effect:“Antioxidativ, NAC unterstützen”},
{id:“m3”,  name:“Omega-3”,       dose:“1000-1500 mg”, effect:“Entzündungshemmend, Stimmung”},
{id:“m4”,  name:“Kreatin”,       dose:“5 g”,          effect:“Energie, Nervensystem”},
{id:“m5”,  name:“Vitamin B12”,   dose:“1 Kapsel”,     effect:“Energie, Nervensystem”},
{id:“m6”,  name:“Vitamin D3+K2”, dose:“1 Kapsel”,     effect:“Stimmung, Immunsystem”},
{id:“m7”,  name:“Zink”,          dose:“25 mg”,        effect:“Immunsystem, Neurotransmitter”},
{id:“m8”,  name:“L-Theanin”,     dose:“200 mg”,       effect:“Angsthemmend, beruhigend”},
{id:“m9”,  name:“Rhodiola”,      dose:“200 mg”,       effect:“Stressresistenz, Energie”},
{id:“m10”, name:“L-Tyrosin”,     dose:“500 mg”,       effect:“Dopamin, Fokus”},
],
evening:[
{id:“e1”,  name:“NAC”,               dose:“600 mg”,     effect:“Glutamat/Dopamin stabilisieren”},
{id:“e2”,  name:“Glycin”,            dose:“3 g”,        effect:“Schlafqualität verbessern”},
{id:“e3”,  name:“Omega-3 Rest”,      dose:“Rest”,       effect:“Stimmung stabilisieren”},
{id:“e4”,  name:“Magnesium”,         dose:“200 mg”,     effect:“Entspannung, Nervensystem”},
{id:“e5”,  name:“Phosphatidylserin”, dose:“100-150 mg”, effect:“Cortisol senken, Stress reduzieren”},
],
};

// ─── KI Modi ─────────────────────────────────────────────────────────────────
export const KI_MODI = [
{id:“direkt”,        label:“Direkt”,       icon:“▸”, desc:“Klar. Ohne Umschweife.”},
{id:“ruhig”,         label:“Ruhig”,        icon:“◌”, desc:“Ruhig. Stabilisierend.”},
{id:“haerter”,       label:“Härter”,       icon:“⚡”, desc:“Direkt. Kein Weichspülen.”},
{id:“therapeutisch”, label:“Therapeutisch”,icon:“◎”, desc:“Reflektierend. Einfühlsam.”},
];
export const KI_INST = {
direkt:        “Sei direkt und klar. Keine Füllwörter.”,
ruhig:         “Sei ruhig und stabilisierend. Kein Druck.”,
haerter:       “Sei direkt und konfrontativ. Kein Beschönigen.”,
therapeutisch: “Sei einfühlsam und reflektierend.”,
};

// ─── Milestones ───────────────────────────────────────────────────────────────
export const MILESTONES = [
{days:1,   msg:(n)=>`${n}, der erste Tag ist der schwerste.`},
{days:3,   msg:(n)=>`${n}, 3 Tage. Das Nervensystem stabilisiert sich.`},
{days:7,   msg:(n)=>`${n}, eine Woche. Neue Muster entstehen.`},
{days:14,  msg:(n)=>`${n}, zwei Wochen. Neuroplastizität arbeitet.`},
{days:30,  msg:(n)=>`${n}, 30 Tage. Das ist ein System, keine Willenskraft.`},
{days:60,  msg:(n)=>`${n}, 60 Tage. Was du aufgebaut hast, gehört dir.`},
{days:90,  msg:(n)=>`${n}, 90 Tage. Nachhaltige Veränderung.`},
{days:180, msg:(n)=>`${n}, ein halbes Jahr.`},
{days:365, msg:(n)=>`${n}, ein Jahr. Jeder Tag war eine Entscheidung.`},
];

// ─── AI Prompts ───────────────────────────────────────────────────────────────
export const sysCheckin = (m) => `Du bist ein nüchternes, nicht-urtelendes Rückfall-Präventions-Tool. ${KI_INST[m]||KI_INST.direkt}
Antworte IMMER in diesem Format:

## Risiko: [niedrig / mittel / hoch]

**Was ich höre:** [2-3 Sätze, kein Coaching]
**Jetzt sofort:** [Eine Handlung. 1 Satz.]
**Anerkennung:** [1 echter Satz.]`;

export const sysPattern = `Du bist ein Recovery-Analyse-Tool.

## Muster erkannt

**Risiko-Trend:** [steigend/stabil/sinkend] - [1 Satz]
**Kritische Trigger:**

- [Muster 1]
- [Muster 2]
  **Fokus:** [Eine Empfehlung. Max 2 Sätze.]
  Kein Coaching.`;

export const sysFrueh = `Du bist ein KI-Frühwarnsystem für Recovery.

## Frühwarnung

**Status:** [Warnung / Stabil / Kritisch]
**Trends:**

- [Trend 1 mit Zahlen]
- [Trend 2 mit Zahlen]
  **Maßnahme:** [Eine konkrete Handlung.]
  Nur Fakten.`;

export const sysRelapse = `Du bist ein nicht-urtelendes Relapse-Analyse-Tool.

## Rückfall analysiert

**Muster:** [Was hat sich wiederholt? 2 Sätze.]
**Kritischer Moment:** [1 Satz.]
**Lernpunkte:**

- [Punkt 1]
- [Punkt 2]
  **Nächstes Mal:** [Eine Handlung. 1 Satz.]
  Kein Coaching.`;

export const sysDenk = {
analyse:       `## Kernaussage\n[1 Satz]\n**Punkte:**\n- [1]\n- [2]\n- [3]\n**Lücken:** [1-2 Sätze]`,
entscheidung:  `## Entscheidung: [benennen]\n**Dafür:**\n- [1]\n- [2]\n**Dagegen:**\n- [1]\n- [2]\n**Empfehlung:** [1 Satz]`,
impuls:        `## Stopp.\n**Was passiert:** [1 Satz]\n**Jetzt:** [1 Handlung]\n**Danach:** [1 Satz]`,
reframe:       `## Gedanke analysiert\n**Muster:** [1-2 Sätze]\n**Was stimmt:** [ehrlich]\n**Was übertrieben:** [1-2 Sätze]\n**Reframe:** [genauer, nicht positiver]\n**Frage:** [eine offene Frage]`,
};

export const TABS = [
{id:“supps”,  label:“Supps”,  icon:“◎”},
{id:“check”,  label:“Check”,  icon:“◈”},
{id:“verlauf”,label:“Verlauf”,icon:“▲”},
{id:“denken”, label:“Denken”, icon:“⊕”},
];

export const WERTE_OPTIONS = [“Familie”,“Gesundheit”,“Freiheit”,“Geld”,“Selbstrespekt”,“Zukunft”,“Klarheit”,“Beziehungen”,“Sport”,“Würde”];

export const DENK_MODI = [
{id:“analyse”,     l:“Analysieren”,   icon:“◈”, hint:“Text verstehen”},
{id:“entscheidung”,l:“Entscheiden”,   icon:“⊕”, hint:“Pro & Contra”},
{id:“impuls”,      l:“Impuls stoppen”,icon:“⚡”, hint:“Sofort-Hilfe”},
{id:“reframe”,     l:“Umdenken”,      icon:“⟳”, hint:“Gedanken neu formulieren”},
];