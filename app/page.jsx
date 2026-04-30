"use client";
import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

import { THEME, RISK, DEF_SUPPS, KI_MODI, MILESTONES, TABS, WERTE_OPTIONS, DENK_MODI, sysCheckin, sysPattern, sysFrueh, sysDenk } from "./lib/constants";
import { ls, haptic, fmt, parseRisk, md, soberDays, calcStreaks, DAY, iosSafeDownload } from "./lib/helpers";
import { Card, Btn, Slider, Spin, ErrBox } from "./components/ui";
import Onboarding from "./components/onboarding";
import SOS from "./components/SOS";
import MonatView from "./components/MonatView";
import PlaeneEditor from "./components/PlaeneEditor";

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [ready, setReady]     = useState(false);
  const [onboarded, setOnb]   = useState(false);
  const [profile, setProfile] = useState({ name: "", identity: "", kiModus: "direkt", soberStart: "" });
  const [supps, setSupps]     = useState(DEF_SUPPS);
  const [checked, setChecked] = useState({});
  const [checkins, setCIs]    = useState([]);
  const [relapses, setRels]   = useState([]);
  const [values, setValues]   = useState([]);
  const [plans, setPlans]     = useState([]);
  const [journal, setJournal] = useState([]);

  // Tab state
  const [tab, setTab]         = useState("supps");
  const [checkSub, setCS]     = useState("check");   // check|journal|plans
  const [suppSub, setSS]      = useState("list");    // list|morgen|info
  const [vlSub, setVS]        = useState("verlauf"); // verlauf|monat
  const [dkSub, setDS]        = useState("denken");  // denken|werte

  // Check-in
  const [ci, setCi]           = useState({ mood: 6, urge: 3, sleep: 7, energy: 6, trigger: "", context: "" });
  const [ciStep, setCiS]      = useState("sober"); // sober|relapse|form|loading|result
  const [ciResult, setCiR]    = useState("");
  const [ciRisk, setCiRisk]   = useState(null);
  const [ciErr, setCiErr]     = useState("");

  // Denken
  const [denkM, setDenkM]     = useState("analyse");
  const [denkIn, setDenkIn]   = useState("");
  const [denkOut, setDenkOut] = useState("");
  const [denkL, setDenkL]     = useState(false);
  const [denkErr, setDenkErr] = useState("");

  // Verlauf
  const [patRes, setPatRes]   = useState("");
  const [patL, setPatL]       = useState(false);
  const [patErr, setPatErr]   = useState("");
  const [fwRes, setFwRes]     = useState("");
  const [fwL, setFwL]         = useState(false);

  // UI
  const [showSOS, setShowSOS]   = useState(false);
  const [showSett, setSett]     = useState(false);
  const [jForm, setJForm]       = useState({ hard: "", helped: "" });
  const [jSaved, setJSaved]     = useState(false);

  // ─── Derived state ──────────────────────────────────────────────────────────
  const lastRisk   = checkins.length ? checkins[checkins.length - 1]?.risk : null;
  const S          = THEME[lastRisk === "hoch" ? "hoch" : lastRisk === "mittel" ? "mittel" : "normal"];
  const totalSupps = supps.morning.length + supps.evening.length;
  const doneSupps  = Object.values(checked).filter(Boolean).length;
  const { ci: ciStreak, su: suStreak } = calcStreaks(checkins, totalSupps);
  const sd         = soberDays(checkins, relapses);
  const nextMS     = MILESTONES.find((m) => m.days > sd);
  const latestMS   = [...MILESTONES].reverse().find((m) => m.days <= sd);
  const avgMood    = checkins.length ? (checkins.reduce((s, c) => s + c.mood, 0) / checkins.length).toFixed(1) : "–";
  const avgUrge    = checkins.length ? (checkins.reduce((s, c) => s + c.urge, 0) / checkins.length).toFixed(1) : "–";
  const chartData  = checkins.slice(-14).map((c) => ({ date: fmt(c.date), Stimmung: c.mood, Drang: c.urge }));

  // ─── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const p = ls.j("profile", null);
    if (p?.name) { setProfile(p); setOnb(true); }
    setChecked(ls.j("supp_" + DAY(), {}));
    setCIs(ls.j("checkins", []));
    setRels(ls.j("relapses", []));
    setValues(ls.j("user_values", []));
    const sv = ls.j("supplements", null); if (sv) setSupps(sv);
    setPlans(ls.j("wenn_dann", []));
    setJournal(ls.j("journal", []));
    setFwRes(ls.j("fw_result", ""));
    setReady(true);
  }, []);

  function save(key, val) { ls.set(key, JSON.stringify(val)); }

  // ─── API call ────────────────────────────────────────────────────────────────
  const callAI = useCallback(async (system, prompt) => {
    const r = await fetch("/api/claude", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, prompt }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "API Fehler");
    return d.text ?? "";
  }, []);

  // ─── Check-in ────────────────────────────────────────────────────────────────
  async function submitCI() {
    if (!ci.trigger.trim()) return;
    haptic.m(); setCiS("loading"); setCiErr("");
    try {
      const msg = `Check-in:\n- Stimmung: ${ci.mood}/10\n- Drang: ${ci.urge}/10\n- Schlaf: ${ci.sleep}h\n- Energie: ${ci.energy}/10\n- Trigger: ${ci.trigger}\n- Kontext: ${ci.context || "–"}`;
      const txt = await callAI(sysCheckin(profile.kiModus), msg);
      const risk = parseRisk(txt);
      if (risk === "hoch") haptic.e(); else if (risk === "mittel") haptic.m(); else haptic.s();
      setCiR(txt); setCiRisk(risk); setCiS("result");
      const entry = { date: new Date().toISOString(), mood: ci.mood, urge: ci.urge, sleep: ci.sleep, energy: ci.energy, risk, trigger: ci.trigger, suppsDone: doneSupps };
      setCIs((prev) => { const n = [...prev, entry]; save("checkins", n.slice(-30)); return n; });
    } catch (e) { haptic.e(); setCiErr(e.message || "Fehler"); setCiS("form"); }
  }

  function resetCI() {
    setCiS("sober"); setCiR(""); setCiRisk(null);
    setCi({ mood: 6, urge: 3, sleep: 7, energy: 6, trigger: "", context: "" });
  }

  // ─── Verlauf ─────────────────────────────────────────────────────────────────
  async function runPattern() {
    if (checkins.length < 2) return;
    haptic.m(); setPatL(true); setPatErr("");
    try { const p = checkins.slice(-14).map((c) => ({ date: fmt(c.date), mood: c.mood, urge: c.urge, sleep: c.sleep, risk: c.risk, trigger: c.trigger })); setPatRes(await callAI(sysPattern, JSON.stringify(p))); haptic.s(); }
    catch (e) { haptic.e(); setPatErr(e.message || "Fehler"); }
    setPatL(false);
  }

  async function runFW() {
    if (checkins.length < 3) return;
    haptic.m(); setFwL(true);
    try { const p = checkins.slice(-10).map((c) => ({ date: fmt(c.date), mood: c.mood, urge: c.urge, sleep: c.sleep || "?", risk: c.risk, suppsDone: c.suppsDone, trigger: c.trigger })); const txt = await callAI(sysFrueh, JSON.stringify(p)); setFwRes(txt); save("fw_result", txt); haptic.s(); }
    catch {}
    setFwL(false);
  }

  // ─── Denken ──────────────────────────────────────────────────────────────────
  async function submitDenk() {
    if (!denkIn.trim()) return;
    haptic.m(); setDenkL(true); setDenkErr(""); setDenkOut("");
    try { setDenkOut(await callAI(`Du bist ein präzises Tool. ${sysDenk[denkM]}`, denkIn)); haptic.s(); }
    catch (e) { haptic.e(); setDenkErr(e.message || "Fehler"); }
    setDenkL(false);
  }

  // ─── Supps ───────────────────────────────────────────────────────────────────
  function toggleSupp(id) {
    setChecked((prev) => {
      const n = { ...prev, [id]: !prev[id] };
      save("supp_" + DAY(), n);
      if (Object.values(n).filter(Boolean).length === totalSupps) haptic.s();
      return n;
    });
  }

  // ─── Export ──────────────────────────────────────────────────────────────────
  function exportData() {
    haptic.m();
    const rows = checkins.map((c) => [fmt(c.date), c.mood, c.urge, c.sleep || "", c.energy || "", c.risk || "", c.suppsDone, `"${(c.trigger || "").replace(/"/g, '""')}"`].join(","));
    iosSafeDownload("Datum,Stimmung,Drang,Schlaf,Energie,Risiko,Supps,Trigger\n" + rows.join("\n"), "text/csv", "balanx-export.csv");
  }

  function backupJSON() {
    haptic.m();
    iosSafeDownload(JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), profile, checkins, relapses, journal, plans, values, supplements: supps }, null, 2), "application/json", `balanx-backup-${new Date().toISOString().split("T")[0]}.json`);
  }

  function importJSON(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const d = JSON.parse(e.target.result);
        if (d.profile)     { setProfile(d.profile);    save("profile", d.profile); }
        if (d.checkins)    { setCIs(d.checkins);        save("checkins", d.checkins); }
        if (d.relapses)    { setRels(d.relapses);       save("relapses", d.relapses); }
        if (d.journal)     { setJournal(d.journal);     save("journal", d.journal); }
        if (d.plans)       { setPlans(d.plans);         save("wenn_dann", d.plans); }
        if (d.values)      { setValues(d.values);       save("user_values", d.values); }
        if (d.supplements) { setSupps(d.supplements);   save("supplements", d.supplements); }
        haptic.s(); alert("Import erfolgreich ✓");
      } catch (err) { haptic.e(); alert("Fehler: " + err.message); }
    };
    r.readAsText(file);
  }

  // ─── Guards ──────────────────────────────────────────────────────────────────
  if (!ready) return null;
  if (!onboarded) return <Onboarding onDone={() => { setProfile(ls.j("profile", {})); setOnb(true); }} />;

  const tabTitle = {
    supps:   suppSub === "morgen" ? "Morgen" : suppSub === "info" ? "Info" : "Supplements",
    check:   checkSub === "journal" ? "Journal" : checkSub === "plans" ? "Pläne" : "Check-in",
    verlauf: vlSub === "monat" ? "Monat" : "Verlauf",
    denken:  dkSub === "werte" ? "Werte" : "Denken",
  };

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: "'SF Mono','Fira Code',monospace", color: S.text, maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", transition: "background 0.6s" }}>
      <style>{`
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        input[type=range]{-webkit-appearance:none;appearance:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:7px;background:${S.neon};box-shadow:0 0 12px ${S.neon}88;border:2px solid rgba(255,255,255,0.15)}
        textarea,input{font-family:inherit;-webkit-font-smoothing:antialiased;font-size:16px !important}
        textarea{resize:none;outline:none;border:none}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:0.45}50%{opacity:1}}
        @keyframes scan{0%{transform:translateY(-100%)}100%{transform:translateY(200vh)}}
        @keyframes sosPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,77,109,0.6)}60%{box-shadow:0 0 0 12px rgba(255,77,109,0)}}
        @keyframes ripple{0%,100%{opacity:0.3}50%{opacity:0.8}}
        button{-webkit-tap-highlight-color:transparent;touch-action:manipulation}
        .scroll-area{overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
        ::-webkit-scrollbar{width:2px}::-webkit-scrollbar-thumb{background:${S.neonB};border-radius:2px}
      `}</style>

      {/* Background effects */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "100px", background: `linear-gradient(transparent,${S.neonG},transparent)`, animation: "scan 6s linear infinite", pointerEvents: "none", zIndex: 10, transition: "background 0.6s" }} />
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: "55%", height: 1, background: S.neon, boxShadow: `0 0 36px 6px ${S.neon}`, opacity: 0.5, pointerEvents: "none", zIndex: 10, transition: "background 0.5s,box-shadow 0.5s" }} />
      {lastRisk === "hoch" && <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1, background: "radial-gradient(ellipse at 50% 0%,rgba(255,77,109,0.05) 0%,transparent 70%)", animation: "ripple 3s ease-in-out infinite" }} />}

      {/* SOS Button */}
      <button onPointerDown={() => haptic.e()} onClick={() => setShowSOS(true)}
        style={{ position: "fixed", bottom: 84, right: 14, zIndex: 200, width: 50, height: 50, borderRadius: "50%", background: `radial-gradient(circle,${S.danger}18,${S.bg})`, border: `2px solid ${S.danger}`, color: S.danger, fontSize: 9, fontWeight: 900, fontFamily: "inherit", cursor: "pointer", animation: "sosPulse 2.5s ease-in-out infinite", display: "flex", alignItems: "center", justifyContent: "center" }}>
        SOS
      </button>

      {showSOS && <SOS onClose={() => setShowSOS(false)} values={values} lastRisk={lastRisk} S={S} />}

      {/* Settings Modal */}
      {showSett && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(8,8,16,0.95)", backdropFilter: "blur(12px)", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 430, background: S.card, border: `1px solid ${S.neonB}`, borderRadius: "18px 18px 0 0", padding: "22px 16px 32px", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: S.neon, letterSpacing: "0.1em", textTransform: "uppercase" }}>Einstellungen</span>
              <button onClick={() => setSett(false)} style={{ background: "transparent", border: `1px solid ${S.border}`, borderRadius: 7, padding: "5px 10px", fontSize: 12, cursor: "pointer", color: S.muted, fontFamily: "inherit" }}>×</button>
            </div>
            {[{ l: "Name", k: "name", p: "Vorname" }, { l: "Identität", k: "identity", p: "Ich bin..." }].map((f) => (
              <div key={f.k} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: S.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>{f.l}</div>
                <input value={profile[f.k] || ""} onChange={(e) => setProfile((p) => ({ ...p, [f.k]: e.target.value }))} placeholder={f.p}
                  style={{ width: "100%", background: S.input, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: S.text, outline: "none" }} />
              </div>
            ))}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 9, color: S.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>KI-Stil</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {KI_MODI.map((m) => (
                  <button key={m.id} onPointerDown={() => haptic.l()} onClick={() => setProfile((p) => ({ ...p, kiModus: m.id }))}
                    style={{ padding: "9px", borderRadius: 9, border: `1px solid ${profile.kiModus === m.id ? S.neon : S.border}`, background: profile.kiModus === m.id ? S.neonG : "transparent", color: profile.kiModus === m.id ? S.neon : S.muted, fontSize: 9, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, letterSpacing: "0.08em", textTransform: "uppercase", transition: "all 0.15s" }}>
                    <span style={{ fontSize: 13 }}>{m.icon}</span>{m.label}
                  </button>
                ))}
              </div>
            </div>
            <Btn onClick={() => { save("profile", profile); setSett(false); haptic.s(); }} S={S}>Speichern</Btn>
          </div>
        </div>
      )}

      {/* Main scroll area */}
      <div className="scroll-area" style={{ flex: 1, padding: "26px 16px 92px" }}>

        {/* Header */}
        <div style={{ marginBottom: 20, animation: "fadeUp 0.4s ease both" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 9, color: S.muted, letterSpacing: "0.18em", textTransform: "uppercase" }}>{new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}</div>
            <button onPointerDown={() => haptic.l()} onClick={() => setSett(true)} style={{ background: "transparent", border: `1px solid ${S.border}`, borderRadius: 6, padding: "4px 8px", fontSize: 9, cursor: "pointer", color: S.muted, fontFamily: "inherit" }}>
              ⚙ {profile.name}
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 28, background: S.neon, borderRadius: 2, boxShadow: `0 0 10px ${S.neon}`, transition: "background 0.4s,box-shadow 0.4s" }} />
              <h1 style={{ fontSize: 20, fontWeight: 900, letterSpacing: "0.06em", margin: 0, textTransform: "uppercase", color: S.text }}>{tabTitle[tab]}</h1>
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {suStreak > 0 && <div style={{ display: "flex", alignItems: "center", gap: 4, background: `${S.sun}11`, border: `1px solid ${S.sun}33`, borderRadius: 20, padding: "3px 9px" }}><span>🔥</span><span style={{ fontSize: 10, fontWeight: 800, color: S.sun, fontFamily: "monospace" }}>{suStreak}</span><span style={{ fontSize: 7, color: S.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Supps</span></div>}
              {ciStreak > 0 && <div style={{ display: "flex", alignItems: "center", gap: 4, background: `${S.neon}11`, border: `1px solid ${S.neon}33`, borderRadius: 20, padding: "3px 9px" }}><span>🔥</span><span style={{ fontSize: 10, fontWeight: 800, color: S.neon, fontFamily: "monospace" }}>{ciStreak}</span><span style={{ fontSize: 7, color: S.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Checks</span></div>}
            </div>
          </div>
          {profile.identity && tab === "supps" && <div style={{ fontSize: 10, color: S.neon, marginTop: 6, opacity: 0.8, fontStyle: "italic" }}>"{profile.identity}"</div>}
        </div>

        {/* ── SUPPS TAB ── */}
        {tab === "supps" && (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
              {[{ id: "list", l: "Liste", icon: "◎" }, { id: "morgen", l: "Morgen", icon: "▸" }, { id: "info", l: "Info", icon: "◈" }].map((st) => (
                <button key={st.id} onPointerDown={() => haptic.l()} onClick={() => setSS(st.id)}
                  style={{ padding: "9px 4px", borderRadius: 10, border: `1px solid ${suppSub === st.id ? S.neon : S.border}`, background: suppSub === st.id ? S.neonG : "transparent", color: suppSub === st.id ? S.neon : S.muted, fontSize: 8, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, letterSpacing: "0.08em", textTransform: "uppercase", boxShadow: suppSub === st.id ? `0 0 12px ${S.neonG}` : "none", transition: "all 0.2s" }}>
                  <span style={{ fontSize: 13 }}>{st.icon}</span>{st.l}
                </button>
              ))}
            </div>

            {suppSub === "list" && (<>
              {/* Milestone */}
              {sd > 0 && (
                <Card S={S} glow style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
                      <svg width="64" height="64" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="32" cy="32" r="26" fill="none" stroke={S.border} strokeWidth="2.5" />
                        {nextMS && <circle cx="32" cy="32" r="26" fill="none" stroke={S.ok} strokeWidth="2.5" strokeDasharray={2 * Math.PI * 26} strokeDashoffset={2 * Math.PI * 26 * (1 - sd / nextMS.days)} style={{ transition: "stroke-dashoffset 1s ease", filter: `drop-shadow(0 0 4px ${S.ok})` }} />}
                      </svg>
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 16, fontWeight: 900, fontFamily: "monospace", color: S.ok, lineHeight: 1 }}>{sd}</span>
                        <span style={{ fontSize: 6, color: S.ok, letterSpacing: "0.1em", textTransform: "uppercase" }}>Tage</span>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      {latestMS && <div style={{ fontSize: 10, fontWeight: 800, color: S.ok, marginBottom: 3 }}>✓ {latestMS.days} Tage erreicht</div>}
                      {nextMS && <div style={{ fontSize: 9, color: S.muted, marginBottom: 6 }}>Nächstes Ziel: <span style={{ color: S.text }}>{nextMS.days} Tage</span> ({nextMS.days - sd} noch)</div>}
                      <div style={{ height: 2, background: S.input, borderRadius: 2 }}><div style={{ height: "100%", borderRadius: 2, background: S.ok, width: nextMS ? `${(sd / nextMS.days) * 100}%` : "100%", boxShadow: `0 0 6px ${S.ok}`, transition: "width 1s ease" }} /></div>
                    </div>
                  </div>
                  {latestMS && <div style={{ marginTop: 10, padding: "8px 12px", background: `${S.ok}09`, borderRadius: 8, fontSize: 10, color: S.text, fontStyle: "italic", lineHeight: 1.6 }}>"{latestMS.msg(profile.name || "Du")}"</div>}
                </Card>
              )}

              {/* Progress */}
              <Card S={S} glow style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>Fortschritt</span>
                  <span style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 900, color: S.neon, textShadow: `0 0 10px ${S.neon}88`, transition: "color 0.4s" }}>{doneSupps} / {totalSupps}</span>
                </div>
                <div style={{ height: 4, background: S.input, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg,${S.neon},${S.cyan})`, width: `${(doneSupps / totalSupps) * 100}%`, boxShadow: `0 0 8px ${S.neon}`, transition: "width 0.4s ease" }} />
                </div>
              </Card>

              {[
                { label: "10:00 Uhr", sub: "mit Essen",    items: supps.morning, accent: S.sun },
                { label: "19-20 Uhr", sub: "zum Abendbrot", items: supps.evening, accent: S.eve },
              ].map((sec) => (
                <div key={sec.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, paddingBottom: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: sec.accent, boxShadow: `0 0 7px ${sec.accent}` }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: sec.accent, letterSpacing: "0.08em", textTransform: "uppercase" }}>{sec.label}</span>
                    <span style={{ fontSize: 9, color: S.muted, marginLeft: "auto" }}>{sec.sub}</span>
                  </div>
                  <Card S={S} style={{ padding: "0 16px" }}>
                    {sec.items.map((s) => (
                      <div key={s.id} onClick={() => toggleSupp(s.id)}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: `1px solid ${S.border}`, cursor: "pointer" }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: `1.5px solid ${checked[s.id] ? sec.accent : S.muted}`, background: checked[s.id] ? `${sec.accent}20` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", boxShadow: checked[s.id] ? `0 0 10px ${sec.accent}55` : "none" }}>
                          {checked[s.id] && <span style={{ color: sec.accent, fontSize: 11, fontWeight: 900 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: checked[s.id] ? S.muted : S.text, textDecoration: checked[s.id] ? "line-through" : "none", transition: "all 0.2s" }}>{s.name}</div>
                          <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>{s.effect}</div>
                        </div>
                        <div style={{ fontSize: 10, fontFamily: "monospace", color: checked[s.id] ? `${sec.accent}88` : S.muted }}>{s.dose}</div>
                      </div>
                    ))}
                  </Card>
                </div>
              ))}

              {doneSupps === totalSupps && <Card S={S} glow style={{ textAlign: "center", padding: "22px", border: `1px solid ${S.ok}` }}><div style={{ fontSize: 24, color: S.ok, marginBottom: 5 }}>✓</div><div style={{ fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: S.ok }}>System vollständig</div></Card>}
              <button onPointerDown={() => haptic.l()} onClick={() => { setChecked({}); save("supp_" + DAY(), {}); }}
                style={{ width: "100%", padding: "12px", background: "transparent", border: `1px solid ${S.border}`, borderRadius: 10, fontSize: 10, fontWeight: 700, cursor: "pointer", color: S.muted, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "inherit" }}>
                ↺ Reset
              </button>
            </>)}

            {suppSub === "morgen" && (
              <div style={{ animation: "fadeUp 0.4s ease both" }}>
                <Card S={S} glow>
                  <div style={{ fontSize: 9, color: S.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>Morgen-Protokoll</div>
                  <div style={{ fontSize: 10, color: S.muted, marginBottom: 14, lineHeight: 1.6 }}>Starte strukturiert in den Tag. Fülle die Felder aus — KI gibt dir einen kurzen personalisierten Impuls.</div>
                  {[
                    { k: "focus", l: "Worauf legst du heute den Fokus?",         p: "z.B. ruhig bleiben, Arbeit fertigstellen, Termine durchziehen..." },
                    { k: "ziel",  l: "Eine konkrete Sache die heute zählt", p: "z.B. heute Abend pünktlich nach Hause, kein Social Media nach 20 Uhr..." },
                  ].map((f) => (
                    <div key={f.k} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>{f.l}</div>
                      <textarea rows={2} placeholder={f.p} style={{ width: "100%", background: S.input, border: `1px solid ${S.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, lineHeight: 1.5, color: S.text }} />
                    </div>
                  ))}
                  <div style={{ fontSize: 9, color: S.muted, lineHeight: 1.6 }}>Tipp: KI-Stil "{profile.kiModus}" ist aktiv — in den Einstellungen ändern.</div>
                </Card>
              </div>
            )}

            {suppSub === "info" && (
              <div style={{ animation: "fadeUp 0.4s ease both" }}>
                <div style={{ fontSize: 9, color: S.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>Supplement-Liste · {totalSupps} Einträge</div>
                {[{ items: supps.morning, accent: S.sun, label: "Morgen · 10:00 Uhr" }, { items: supps.evening, accent: S.eve, label: "Abend · 19-20 Uhr" }].map((sec) => (
                  <Card key={sec.label} S={S} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: sec.accent, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{sec.label}</div>
                    {sec.items.map((s) => (
                      <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${S.border}` }}>
                        <div><div style={{ fontSize: 13, fontWeight: 700, color: S.text }}>{s.name}</div><div style={{ fontSize: 10, color: S.muted, marginTop: 1 }}>{s.effect}</div></div>
                        <span style={{ fontSize: 10, fontFamily: "monospace", color: S.muted, flexShrink: 0, marginLeft: 8 }}>{s.dose}</span>
                      </div>
                    ))}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CHECK TAB ── */}
        {tab === "check" && (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
              {[{ id: "check", l: "Check-in", icon: "◈" }, { id: "journal", l: "Journal", icon: "✦" }, { id: "plans", l: "Pläne", icon: "→" }].map((st) => (
                <button key={st.id} onPointerDown={() => haptic.l()} onClick={() => setCS(st.id)}
                  style={{ padding: "9px 4px", borderRadius: 10, border: `1px solid ${checkSub === st.id ? S.neon : S.border}`, background: checkSub === st.id ? S.neonG : "transparent", color: checkSub === st.id ? S.neon : S.muted, fontSize: 8, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, letterSpacing: "0.08em", textTransform: "uppercase", boxShadow: checkSub === st.id ? `0 0 12px ${S.neonG}` : "none", transition: "all 0.2s" }}>
                  <span style={{ fontSize: 13 }}>{st.icon}</span>{st.l}
                </button>
              ))}
            </div>

            {checkSub === "check" && (<>
              {ciStep === "sober" && (
                <Card S={S} glow style={{ textAlign: "center", padding: "26px 18px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: S.text, letterSpacing: "0.04em", marginBottom: 4 }}>Warst du heute nüchtern?</div>
                  <div style={{ fontSize: 10, color: S.muted, marginBottom: 18, lineHeight: 1.6 }}>Ehrliche Antwort — kein Urteil. Bei Nein kommt zuerst ein kurzes Relapse-Review.</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <button onPointerDown={() => haptic.s()} onClick={() => setCiS("form")} style={{ padding: "16px", borderRadius: 11, border: `1px solid ${S.ok}`, background: `${S.ok}11`, color: S.ok, fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 0 14px ${S.ok}33` }}>✓ Ja</button>
                    <button onPointerDown={() => haptic.m()} onClick={() => setCiS("relapse")} style={{ padding: "16px", borderRadius: 11, border: `1px solid ${S.danger}`, background: `${S.danger}11`, color: S.danger, fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 0 14px ${S.danger}33` }}>Nein</button>
                  </div>
                </Card>
              )}

              {ciStep === "relapse" && (
                <div>
                  <div style={{ background: S.neonG, border: `1px solid ${S.neonB}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14, lineHeight: 1.8 }}>
                    <strong style={{ color: S.neon, fontSize: 11 }}>Kein Vorwurf. Kein Urteil.</strong><br />
                    <span style={{ color: S.muted, fontSize: 10 }}>Je ehrlicher du antwortest, desto besser erkennt die KI das Muster. Du musst nicht alles ausfüllen.</span>
                  </div>
                  {["Trigger (was hat es ausgelöst?)", "Gedanke davor", "Emotion", "Ort"].map((l, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>{l}</div>
                      <textarea rows={l.includes("Trigger") || l.includes("Gedanke") ? 2 : 1} style={{ width: "100%", background: S.input, border: `1px solid ${S.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, lineHeight: 1.5, color: S.text }} />
                    </div>
                  ))}
                  <Btn onClick={() => setCiS("form")} color={S.danger} S={S}>Weiter zum Check-in</Btn>
                  <button onPointerDown={() => haptic.l()} onClick={() => setCiS("form")} style={{ width: "100%", padding: "10px", background: "transparent", border: `1px solid ${S.border}`, borderRadius: 10, fontSize: 9, fontWeight: 700, cursor: "pointer", color: S.muted, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "inherit" }}>Überspringen</button>
                </div>
              )}

              {ciStep === "form" && (<>
                {ci.urge >= 7 && <div style={{ background: "rgba(255,77,109,0.06)", border: "1px solid rgba(255,77,109,0.2)", borderRadius: 9, padding: "7px 11px", marginBottom: 10, fontSize: 10, color: "#ff6b85", display: "flex", alignItems: "center", gap: 7 }}><span style={{ animation: "pulse 1.5s ease-in-out infinite" }}>⚠️</span>Hoher Drang erkannt. Hol tief Luft.</div>}
                {ci.sleep <= 4 && <div style={{ background: "rgba(255,193,7,0.06)", border: "1px solid rgba(255,193,7,0.2)", borderRadius: 9, padding: "7px 11px", marginBottom: 10, fontSize: 10, color: "#ffc107", display: "flex", alignItems: "center", gap: 7 }}>😴 Schlafmangel — heute besonders achtsam bleiben.</div>}
                <Card S={S} glow style={{ marginBottom: 10 }}>
                  <Slider label="Stimmung"    min={1} max={10} low="Schlecht" high="Gut"   value={ci.mood}   onChange={(v) => setCi((c) => ({ ...c, mood: v }))}   color={S.cyan} S={S} />
                  <Slider label="Drang"       min={0} max={10} low="Keiner"  high="Stark"  value={ci.urge}   onChange={(v) => setCi((c) => ({ ...c, urge: v }))}   color={ci.urge >= 8 ? S.danger : ci.urge >= 5 ? "#ffc107" : S.ok} S={S} />
                  <Slider label="Schlaf (h)"  min={0} max={12} low="0h"      high="12h"    value={ci.sleep}  onChange={(v) => setCi((c) => ({ ...c, sleep: v }))}  color={ci.sleep <= 4 ? "#ffc107" : S.cyan} S={S} />
                  <Slider label="Energie"     min={1} max={10} low="Leer"    high="Voll"   value={ci.energy} onChange={(v) => setCi((c) => ({ ...c, energy: v }))} color={S.sun} S={S} />
                </Card>
                <Card S={S} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Was hat heute Druck gemacht?</div>
                  <div style={{ fontSize: 9, color: S.muted, marginBottom: 8, lineHeight: 1.5 }}>Stress, Streit, Einsamkeit, Langeweile, eine bestimmte Situation...</div>
                  <textarea rows={3} placeholder="Was hat heute Druck gemacht? z.B. Stress bei der Arbeit, Streit, Einsamkeit, Langeweile..." value={ci.trigger} onChange={(e) => setCi((c) => ({ ...c, trigger: e.target.value }))}
                    style={{ width: "100%", background: S.input, borderRadius: 7, padding: "9px 11px", fontSize: 13, lineHeight: 1.5, color: S.text }} />
                </Card>
                <Card S={S} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Zusätzlicher Kontext</div>
                  <div style={{ fontSize: 9, color: S.muted, marginBottom: 8, lineHeight: 1.5 }}>Optional — hilft der KI. z.B. schlechter Schlaf, wenig gegessen, bestimmte Person getroffen.</div>
                  <textarea rows={2} placeholder="Optional: Wie war dein Schlaf? Hast du gegessen? Was ist heute noch passiert?" value={ci.context} onChange={(e) => setCi((c) => ({ ...c, context: e.target.value }))}
                    style={{ width: "100%", background: S.input, borderRadius: 7, padding: "9px 11px", fontSize: 13, lineHeight: 1.5, color: S.text }} />
                </Card>
                <div style={{ fontSize: 9, color: S.muted, textAlign: "center", marginBottom: 10 }}>◎ {doneSupps}/{totalSupps} Supplements · {profile.kiModus} Modus</div>
                {ciErr && <ErrBox msg={ciErr} S={S} />}
                <Btn onClick={submitCI} disabled={!ci.trigger.trim()} S={S}>◈ Auswerten</Btn>
              </>)}

              {ciStep === "loading" && (
                <div style={{ textAlign: "center", padding: "70px 0" }}>
                  <div style={{ width: 38, height: 38, border: `2px solid ${S.neonB}`, borderTopColor: S.neon, borderRadius: "50%", animation: "spin 0.6s linear infinite", margin: "0 auto 14px", boxShadow: `0 0 18px ${S.neonG}` }} />
                  <p style={{ color: S.muted, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", animation: "pulse 1.5s ease infinite" }}>Analyse läuft...</p>
                </div>
              )}

              {ciStep === "result" && (<>
                {ciRisk && (
                  <div style={{ background: RISK[ciRisk].bg, borderRadius: 11, padding: "11px 14px", display: "flex", alignItems: "center", gap: 9, marginBottom: 11, border: `1px solid ${RISK[ciRisk].border}` }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: RISK[ciRisk].dot, boxShadow: `0 0 8px ${RISK[ciRisk].dot}`, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: RISK[ciRisk].text, letterSpacing: "0.1em", textTransform: "uppercase" }}>Risiko: {ciRisk}</span>
                    {ciRisk === "hoch" && <button onPointerDown={() => haptic.e()} onClick={() => setShowSOS(true)} style={{ marginLeft: "auto", padding: "5px 10px", borderRadius: 7, border: `1px solid ${S.danger}`, background: `${S.danger}18`, color: S.danger, fontSize: 9, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.1em", textTransform: "uppercase" }}>SOS öffnen</button>}
                  </div>
                )}
                <Card S={S} glow style={{ marginBottom: 12, lineHeight: 1.8, fontSize: 13 }}>
                  <div dangerouslySetInnerHTML={{ __html: md(ciResult, S.neon) }} />
                </Card>
                <Btn onClick={resetCI} S={S}>↺ Neuer Check-in</Btn>
              </>)}
            </>)}

            {checkSub === "journal" && (
              <div style={{ animation: "fadeUp 0.4s ease both" }}>
                <Card S={S} glow style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, color: S.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>Tages-Journal</div>
                  <div style={{ fontSize: 10, color: S.muted, marginBottom: 12, lineHeight: 1.6 }}>2 Fragen, ca. 30 Sekunden. Wird täglich gespeichert.</div>
                  {[
                    { id: "hard",   l: "Was war heute schwer?",              p: "Kurz und ehrlich. Was hat dich gefordert oder belastet?",          c: "#ff6b85" },
                    { id: "helped", l: "Was hat geholfen oder gut getan?",   p: "Auch kleine Dinge zählen. z.B. Spaziergang, Gespräch, Musik.",     c: S.ok },
                  ].map((q) => (
                    <div key={q.id} style={{ marginBottom: 11 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: q.c, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>{q.l}</div>
                      <textarea rows={2} placeholder={q.p} value={jForm[q.id]} onChange={(e) => setJForm((p) => ({ ...p, [q.id]: e.target.value }))}
                        style={{ width: "100%", background: S.input, border: `1px solid ${S.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, lineHeight: 1.5, color: S.text }} />
                    </div>
                  ))}
                  {jSaved
                    ? <div style={{ textAlign: "center", padding: "10px", color: S.ok, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>✓ Gespeichert</div>
                    : <Btn onClick={() => {
                        if (!jForm.hard.trim() && !jForm.helped.trim()) return;
                        haptic.s();
                        const entry = { date: new Date().toISOString(), ...jForm };
                        const n = [entry, ...journal.filter((j) => new Date(j.date).toDateString() !== new Date().toDateString())].slice(0, 60);
                        setJournal(n); save("journal", n);
                        setJForm({ hard: "", helped: "" }); setJSaved(true); setTimeout(() => setJSaved(false), 2000);
                      }} color={S.ok} S={S} disabled={!jForm.hard.trim() && !jForm.helped.trim()}>
                        ✦ Speichern
                      </Btn>
                  }
                </Card>
                {journal.slice(0, 8).map((e, i) => (
                  <Card key={i} S={S} style={{ marginBottom: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 9, color: S.muted, fontFamily: "monospace", marginBottom: 7 }}>{fmt(e.date)}</div>
                    {e.hard && <div style={{ marginBottom: 5 }}><div style={{ fontSize: 8, color: "#ff6b85", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Schwer</div><div style={{ fontSize: 12, color: S.text, lineHeight: 1.5 }}>{e.hard}</div></div>}
                    {e.helped && <div><div style={{ fontSize: 8, color: S.ok, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Geholfen</div><div style={{ fontSize: 12, color: S.text, lineHeight: 1.5 }}>{e.helped}</div></div>}
                  </Card>
                ))}
              </div>
            )}

            {checkSub === "plans" && (
              <div style={{ animation: "fadeUp 0.4s ease both" }}>
                <PlaeneEditor plans={plans} setPlans={setPlans} save={save} S={S} />
              </div>
            )}
          </div>
        )}

        {/* ── VERLAUF TAB ── */}
        {tab === "verlauf" && (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
              {[{ id: "verlauf", l: "Verlauf", icon: "▲" }, { id: "monat", l: "Monat", icon: "◉" }].map((st) => (
                <button key={st.id} onPointerDown={() => haptic.l()} onClick={() => setVS(st.id)}
                  style={{ padding: "9px", borderRadius: 10, border: `1px solid ${vlSub === st.id ? S.neon : S.border}`, background: vlSub === st.id ? S.neonG : "transparent", color: vlSub === st.id ? S.neon : S.muted, fontSize: 9, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, letterSpacing: "0.1em", textTransform: "uppercase", transition: "all 0.2s" }}>
                  <span style={{ fontSize: 12 }}>{st.icon}</span>{st.l}
                </button>
              ))}
            </div>

            {vlSub === "monat" && <MonatView checkins={checkins} totalSupps={totalSupps} S={S} />}

            {vlSub === "verlauf" && (
              checkins.length === 0
                ? <Card S={S} style={{ textAlign: "center", padding: "50px 20px", color: S.muted }}>
                    <div style={{ fontSize: 26, opacity: 0.3, marginBottom: 10 }}>▲</div>
                    <div style={{ fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Noch keine Daten</div>
                    <div style={{ fontSize: 11, lineHeight: 1.7 }}>Mach deinen ersten Check-in im Check-Tab.<br />Deine Daten erscheinen dann hier.</div>
                  </Card>
                : <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                      {[
                        { l: "Ø Stimmung", v: avgMood,          c: S.cyan },
                        { l: "Ø Drang",    v: avgUrge,          c: S.danger },
                        { l: "Rückfälle",  v: relapses.length,  c: S.sun },
                      ].map((s) => (
                        <Card key={s.l} S={S} style={{ textAlign: "center", padding: "13px 7px", marginBottom: 0 }}>
                          <div style={{ fontSize: 19, fontWeight: 900, color: s.c, textShadow: `0 0 10px ${s.c}` }}>{s.v}</div>
                          <div style={{ fontSize: 7, color: S.muted, marginTop: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{s.l}</div>
                        </Card>
                      ))}
                    </div>

                    {chartData.length > 0 && (
                      <Card S={S} style={{ marginBottom: 12, paddingLeft: 6, paddingRight: 6 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>Letzte {chartData.length} Einträge</div>
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -28, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={S.border} />
                            <XAxis dataKey="date" tick={{ fontSize: 8, fill: S.muted, fontFamily: "monospace" }} />
                            <YAxis domain={[0, 10]} tick={{ fontSize: 8, fill: S.muted, fontFamily: "monospace" }} />
                            <Tooltip contentStyle={{ fontFamily: "monospace", fontSize: 11, background: S.card, border: `1px solid ${S.neonB}`, borderRadius: 7, color: S.text }} />
                            <Legend iconType="circle" iconSize={5} wrapperStyle={{ fontSize: 9, fontFamily: "monospace" }} />
                            <Line type="monotone" dataKey="Stimmung" stroke={S.cyan}   strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="Drang"    stroke={S.danger} strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </Card>
                    )}

                    {/* Frühwarnsystem */}
                    <Card S={S} glow style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800 }}>KI-Frühwarnsystem</div>
                          <div style={{ fontSize: 9, color: S.muted, marginTop: 1 }}>{checkins.length >= 3 ? `${Math.min(checkins.length, 10)} Einträge · läuft täglich automatisch` : "Mind. 3 Check-ins nötig"}</div>
                        </div>
                        <button onPointerDown={() => haptic.m()} onClick={runFW} disabled={fwL || checkins.length < 3}
                          style={{ background: "transparent", color: fwL ? S.muted : S.gold, border: `1px solid ${fwL ? S.border : "rgba(255,215,0,0.35)"}`, borderRadius: 7, padding: "7px 12px", fontSize: 9, fontWeight: 800, cursor: fwL || checkins.length < 3 ? "default" : "pointer", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                          {fwL ? <Spin S={S} /> : "▶ Scan"}
                        </button>
                      </div>
                      {fwRes
                        ? <div style={{ fontSize: 12, lineHeight: 1.7, borderTop: `1px solid ${S.border}`, paddingTop: 10 }} dangerouslySetInnerHTML={{ __html: md(fwRes, S.neon) }} />
                        : <div style={{ fontSize: 11, color: S.muted, lineHeight: 1.6 }}>{checkins.length < 3 ? "Mind. 3 Check-ins nötig — danach analysiert das System täglich automatisch." : "Klick auf Scan für eine aktuelle Analyse."}</div>
                      }
                    </Card>

                    {/* Muster-Analyse */}
                    <Card S={S} glow style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800 }}>Muster-Analyse</div>
                          <div style={{ fontSize: 9, color: S.muted, marginTop: 1 }}>KI · letzte {Math.min(checkins.length, 14)} Einträge</div>
                        </div>
                        <button onPointerDown={() => haptic.m()} onClick={runPattern} disabled={patL || checkins.length < 2}
                          style={{ background: "transparent", color: patL ? S.muted : S.neon, border: `1px solid ${patL ? S.border : S.neonB}`, borderRadius: 7, padding: "7px 12px", fontSize: 9, fontWeight: 800, cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                          {patL ? <Spin S={S} /> : "◈ Scan"}
                        </button>
                      </div>
                      {patErr && <ErrBox msg={patErr} S={S} />}
                      {checkins.length < 2
                        ? <div style={{ fontSize: 11, color: S.muted, lineHeight: 1.6 }}>Mind. 2 Check-ins nötig — danach siehst du hier deine Trigger-Muster.</div>
                        : patRes
                          ? <div style={{ fontSize: 12, lineHeight: 1.7, borderTop: `1px solid ${S.border}`, paddingTop: 10 }} dangerouslySetInnerHTML={{ __html: md(patRes, S.neon) }} />
                          : <div style={{ fontSize: 11, color: S.muted }}>Klick auf Scan um Muster in deinen Check-ins zu finden.</div>
                      }
                    </Card>

                    <div style={{ fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 7 }}>Letzte Einträge</div>
                    {[...checkins].reverse().slice(0, 6).map((c, i) => {
                      const rm = c.risk ? RISK[c.risk] : null;
                      return (
                        <Card key={i} S={S} style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10, padding: "11px 13px" }}>
                          <div style={{ fontFamily: "monospace", fontSize: 9, color: S.muted, flexShrink: 0 }}>{fmt(c.date)}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.trigger}</div>
                            <div style={{ fontSize: 9, color: S.muted, fontFamily: "monospace" }}>↑{c.mood} · ↑{c.urge}{c.sleep ? ` · 💤${c.sleep}h` : ""}</div>
                          </div>
                          {rm && <div style={{ background: rm.bg, color: rm.text, fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 20, flexShrink: 0, textTransform: "uppercase", border: `1px solid ${rm.border}` }}>{c.risk}</div>}
                        </Card>
                      );
                    })}

                    {/* Export */}
                    <Card S={S} style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>Export & Backup</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
                        <button onPointerDown={() => haptic.l()} onClick={exportData} style={{ padding: "11px 7px", background: "transparent", border: `1px solid ${S.border}`, borderRadius: 9, fontSize: 8, fontWeight: 800, cursor: "pointer", color: S.muted, fontFamily: "inherit", letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}><span style={{ fontSize: 13 }}>▼</span>CSV</button>
                        <button onPointerDown={() => haptic.l()} onClick={backupJSON} style={{ padding: "11px 7px", background: `${S.ok}09`, border: `1px solid ${S.ok}44`, borderRadius: 9, fontSize: 8, fontWeight: 800, cursor: "pointer", color: S.ok, fontFamily: "inherit", letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}><span style={{ fontSize: 13 }}>↓</span>Backup</button>
                        <label style={{ padding: "11px 7px", background: `${S.gold}09`, border: `1px solid ${S.gold}44`, borderRadius: 9, fontSize: 8, fontWeight: 800, cursor: "pointer", color: S.gold, fontFamily: "inherit", letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}><span style={{ fontSize: 13 }}>↑</span>Import<input type="file" accept=".json" onChange={(e) => importJSON(e.target.files?.[0])} style={{ display: "none" }} /></label>
                      </div>
                    </Card>
                  </>
            )}
          </div>
        )}

        {/* ── DENKEN TAB ── */}
        {tab === "denken" && (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
              {[{ id: "denken", l: "Denken", icon: "⊕" }, { id: "werte", l: "Werte", icon: "◉" }].map((st) => (
                <button key={st.id} onPointerDown={() => haptic.l()} onClick={() => setDS(st.id)}
                  style={{ padding: "9px", borderRadius: 10, border: `1px solid ${dkSub === st.id ? S.neon : S.border}`, background: dkSub === st.id ? S.neonG : "transparent", color: dkSub === st.id ? S.neon : S.muted, fontSize: 9, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, letterSpacing: "0.1em", textTransform: "uppercase", transition: "all 0.2s" }}>
                  <span style={{ fontSize: 12 }}>{st.icon}</span>{st.l}
                </button>
              ))}
            </div>

            {dkSub === "werte" && (
              <Card S={S} glow style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Deine Werte</div>
                <div style={{ fontSize: 10, color: S.muted, marginBottom: 12, lineHeight: 1.6 }}>Wähle bis zu 6 Dinge, für die du nüchtern bleiben willst. Diese erscheinen im SOS-Screen — genau dann wenn du sie brauchst.</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {WERTE_OPTIONS.map((v) => {
                    const sel = values.includes(v);
                    return (
                      <button key={v} onPointerDown={() => haptic.l()} onClick={() => {
                        const n = sel ? values.filter((x) => x !== v) : (values.length < 6 ? [...values, v] : values);
                        setValues(n); save("user_values", n);
                      }}
                        style={{ padding: "5px 11px", borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${sel ? S.neon : S.border}`, background: sel ? S.neonG : "transparent", color: sel ? S.neon : S.muted, transition: "all 0.15s" }}>
                        {v}
                      </button>
                    );
                  })}
                </div>
                {values.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {values.map((v) => (
                      <div key={v} style={{ display: "flex", alignItems: "center", gap: 4, background: S.neonG, border: `1px solid ${S.neonB}`, borderRadius: 20, padding: "3px 9px" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: S.neon }}>{v}</span>
                        <button onPointerDown={() => haptic.l()} onClick={() => { const n = values.filter((x) => x !== v); setValues(n); save("user_values", n); }} style={{ background: "none", border: "none", color: S.muted, cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {dkSub === "denken" && (<>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: S.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Modus: <span style={{ color: S.neon }}>{KI_MODI.find((m) => m.id === profile.kiModus)?.label}</span></div>
                <button onPointerDown={() => haptic.l()} onClick={() => setSett(true)} style={{ background: "transparent", border: `1px solid ${S.border}`, borderRadius: 5, padding: "3px 7px", fontSize: 8, cursor: "pointer", color: S.muted, fontFamily: "inherit" }}>ändern</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 14 }}>
                {DENK_MODI.map((m) => (
                  <button key={m.id} onPointerDown={() => haptic.l()} onClick={() => { setDenkM(m.id); setDenkOut(""); setDenkErr(""); }}
                    style={{ padding: "11px 5px", borderRadius: 10, border: `1px solid ${denkM === m.id ? S.neon : S.border}`, background: denkM === m.id ? S.neonG : "transparent", color: denkM === m.id ? S.neon : S.muted, fontSize: 8, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, letterSpacing: "0.08em", textTransform: "uppercase", boxShadow: denkM === m.id ? `0 0 14px ${S.neonG}` : "none", transition: "all 0.2s" }}>
                    <span style={{ fontSize: 15 }}>{m.icon}</span>
                    <span style={{ fontWeight: 900 }}>{m.l}</span>
                    <span style={{ fontSize: 7, opacity: 0.7, letterSpacing: "0.04em", textTransform: "none", fontWeight: 400 }}>{m.hint}</span>
                  </button>
                ))}
              </div>

              {denkM === "reframe" && (
                <Card S={S} style={{ marginBottom: 9, padding: "9px 13px" }}>
                  <div style={{ fontSize: 10, color: S.text, lineHeight: 1.7, fontWeight: 700, marginBottom: 3 }}>Wie funktioniert Umdenken?</div>
                  <div style={{ fontSize: 10, color: S.muted, lineHeight: 1.7 }}>Schreib den negativen Gedanken genau so auf, wie er in deinem Kopf klingt — nicht abgemildert. Die KI analysiert das Muster dahinter und formuliert ihn realistischer um. Kein positives Denken, nur mehr Präzision.<br /><span style={{ color: S.neon }}>Beispiel: "Ich schaffe das nie." oder "Alle geben irgendwann auf."</span></div>
                </Card>
              )}

              <Card S={S} glow={denkIn.length > 0} style={{ marginBottom: 9 }}>
                <textarea rows={6}
                  placeholder={{ analyse: "Text, Artikel oder Situation hier einfügen — KI bringt es auf den Punkt.", entscheidung: "Beschreib die Entscheidung und was du schon weißt. z.B. Soll ich den Job wechseln? Ich habe Angebot X...", impuls: "Was passiert gerade? Schreib es raus — ohne Filter. z.B. Ich will jetzt gerade...", reframe: "Welcher Gedanke dreht sich im Kreis? Genau so aufschreiben wie er kommt. z.B. Ich schaffe das nie..." }[denkM]}
                  value={denkIn} onChange={(e) => { setDenkIn(e.target.value); setDenkOut(""); }}
                  style={{ width: "100%", background: S.input, borderRadius: 7, padding: "9px 11px", fontSize: 13, lineHeight: 1.6, color: S.text }} />
              </Card>

              {denkErr && <ErrBox msg={denkErr} S={S} />}
              <Btn onClick={submitDenk} disabled={!denkIn.trim() || denkL} S={S}>
                {denkL ? <Spin S={S} /> : `${({ analyse: "◈", entscheidung: "⊕", impuls: "⚡", reframe: "⟳" }[denkM] || "◈")} Analysieren`}
              </Btn>

              {denkOut && (
                <Card S={S} glow style={{ lineHeight: 1.8, fontSize: 13, marginTop: 9, animation: "fadeUp 0.3s ease both" }}>
                  <div dangerouslySetInnerHTML={{ __html: md(denkOut, S.neon) }} />
                </Card>
              )}
            </>)}
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: `${S.card}f8`, backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderTop: `1px solid ${S.neonB}`, boxShadow: `0 -10px 36px ${S.neonG}`, display: "flex", paddingBottom: "max(env(safe-area-inset-bottom),8px)", transition: "all 0.5s", zIndex: 100 }}>
        {TABS.map((t) => (
          <button key={t.id} onPointerDown={() => haptic.l()} onClick={() => setTab(t.id)}
            style={{ flex: 1, background: "none", border: "none", cursor: "pointer", padding: "12px 0 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative" }}>
            {t.id === "check" && lastRisk && RISK[lastRisk] && (
              <div style={{ position: "absolute", top: 8, right: "50%", transform: "translateX(11px)", width: 6, height: 6, borderRadius: "50%", background: RISK[lastRisk].dot, boxShadow: `0 0 7px ${RISK[lastRisk].dot}`, animation: "ripple 2s ease-in-out infinite" }} />
            )}
            <span style={{ fontSize: 17, color: tab === t.id ? S.neon : S.muted, textShadow: tab === t.id ? `0 0 12px ${S.neon}` : "none", transform: tab === t.id ? "scale(1.1)" : "scale(1)", display: "inline-block", transition: "all 0.25s" }}>{t.icon}</span>
            <span style={{ fontSize: 8, fontWeight: 800, color: tab === t.id ? S.neon : S.muted, letterSpacing: "0.12em", textTransform: "uppercase", transition: "color 0.25s" }}>{t.label}</span>
            <div style={{ width: tab === t.id ? 18 : 0, height: 2, borderRadius: 2, background: S.neon, boxShadow: tab === t.id ? `0 0 8px ${S.neon}` : "none", transition: "width 0.3s cubic-bezier(0.34,1.56,0.64,1)" }} />
          </button>
        ))}
      </div>
    </div>
  );
}
