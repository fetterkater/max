"use client";
import { useState, useEffect } from "react";
import { haptic } from "../lib/helpers";
import { RISK } from "../lib/constants";
import { Card, Btn } from "./ui";

function Breath478({ onDone, S }) {
  const PH = [
    { l: "Einatmen", d: 4, c: S.cyan },
    { l: "Halten",   d: 7, c: S.neon },
    { l: "Ausatmen", d: 8, c: S.ok },
  ];
  const [ph, setPh] = useState(0);
  const [sec, setSec] = useState(4);
  const [cy, setCy] = useState(0);
  const [run, setRun] = useState(false);
  const [done, setDone] = useState(false);
  const MAX = 4;
  const cur = PH[ph];
  const circ = 2 * Math.PI * 44;

  useEffect(() => {
    if (!run || done) return;
    if (sec === 0) {
      const np = (ph + 1) % 3;
      if (np === 0) { const nc = cy + 1; if (nc >= MAX) { setRun(false); setDone(true); return; } setCy(nc); }
      setPh(np); setSec(PH[np].d); return;
    }
    const t = setTimeout(() => setSec((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [run, sec, ph, cy, done]);

  if (done) return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{ fontSize: 26, color: S.ok, marginBottom: 8 }}>✓</div>
      <div style={{ fontSize: 11, color: S.ok, fontWeight: 800, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.1em" }}>Fertig</div>
      <Btn onClick={onDone} color={S.ok} S={S}>Weiter</Btn>
    </div>
  );

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 9, color: S.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>4-7-8 Atmung · {MAX} Zyklen</div>
      <div style={{ position: "relative", width: 110, height: 110, margin: "0 auto 14px" }}>
        <svg width="110" height="110" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
          <circle cx="55" cy="55" r="44" fill="none" stroke={S.border} strokeWidth="2.5" />
          {run && <circle cx="55" cy="55" r="44" fill="none" stroke={cur.c} strokeWidth="2.5" strokeDasharray={circ} strokeDashoffset={circ * (1 - ((1 - sec / cur.d)))} style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 5px ${cur.c})` }} />}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {run
            ? <><div style={{ fontSize: 28, fontWeight: 900, fontFamily: "monospace", color: cur.c, lineHeight: 1 }}>{sec}</div><div style={{ fontSize: 8, color: cur.c, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 }}>{cur.l}</div></>
            : <div style={{ fontSize: 10, color: S.muted }}>Bereit</div>
          }
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 12 }}>
        {[...Array(MAX)].map((_, i) => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: i < cy ? S.ok : i === cy && run ? cur.c : S.border, transition: "all 0.3s" }} />)}
      </div>
      <Btn onClick={() => setRun((r) => !r)} color={cur.c} S={S}>{run ? "⏸ Pause" : "▶ Start"}</Btn>
    </div>
  );
}

export default function SOS({ onClose, values, lastRisk, S }) {
  const [active, setActive] = useState(null);
  const bc = lastRisk === "hoch" ? S.danger : lastRisk === "mittel" ? "#ffc107" : S.neon;

  const modal = (title, col, content) => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(8,8,16,0.95)", backdropFilter: "blur(12px)", zIndex: 1001, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, background: S.card, border: `1px solid ${col}44`, borderRadius: "18px 18px 0 0", padding: "22px 16px 32px", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: col, letterSpacing: "0.1em", textTransform: "uppercase" }}>{title}</span>
          <button onPointerDown={() => haptic.l()} onClick={() => setActive(null)} style={{ background: "transparent", border: `1px solid ${S.border}`, borderRadius: 7, padding: "5px 10px", fontSize: 11, cursor: "pointer", color: S.muted, fontFamily: "inherit" }}>←</button>
        </div>
        {content}
      </div>
    </div>
  );

  if (active === "atem") return modal("4-7-8 Atmung", S.cyan, <Breath478 onDone={() => setActive(null)} S={S} />);

  if (active === "bewegung") return modal("Körper aktivieren", S.sun, (
    <div>
      {[
        { icon: "🚿", t: "Kaltes Wasser",   b: "Gesicht oder Handgelenke 30 Sek kalt. Sofortige Wirkung auf das Nervensystem." },
        { icon: "🚶", t: "Raus gehen",       b: "Jetzt aufstehen und 5 Min laufen. Anderer Raum, draußen — irgendwo neu." },
        { icon: "💪", t: "Körperspannung",   b: "10 Liegestütze oder Kniebeugen. Physische Aktivierung unterbricht den Craving-Kreislauf." },
        { icon: "🫁", t: "Box Breathing",    b: "4 ein · 4 halten · 4 aus · 4 halten. Wiederholen bis ruhiger." },
      ].map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: i < 3 ? `1px solid ${S.border}` : "none" }}>
          <div style={{ fontSize: 22, flexShrink: 0, paddingTop: 2 }}>{it.icon}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: S.sun, marginBottom: 4 }}>{it.t}</div>
            <div style={{ fontSize: 11, color: S.muted, lineHeight: 1.6 }}>{it.b}</div>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 14 }}><Btn onClick={() => setActive(null)} color={S.sun} S={S}>← Zurück</Btn></div>
    </div>
  ));

  const actions = [
    { id: "atem",     icon: "◌", label: "4-7-8 Atmung",     sub: "Nervensystem beruhigen",   c: S.cyan },
    { id: "warte",    icon: "⏱", label: "20 Min warten",     sub: "Craving-Peak überbrücken", c: "#ffc107" },
    { id: "bewegung", icon: "▲", label: "Körper aktivieren", sub: "Kaltes Wasser · Bewegung", c: S.sun },
    { id: "kontakte", icon: "⊕", label: "Sicherer Kontakt",  sub: "Jemanden anrufen",         c: S.ok },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(8,8,16,0.95)", backdropFilter: "blur(12px)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, background: S.card, border: `1px solid ${bc}44`, borderRadius: "18px 18px 0 0", padding: "22px 16px 32px", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: S.danger, textShadow: `0 0 16px ${S.danger}` }}>SOS</div>
            <div style={{ fontSize: 9, color: S.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>Craving · Impuls · Krise</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${S.border}`, borderRadius: 7, padding: "7px 12px", fontSize: 14, cursor: "pointer", color: S.muted, fontFamily: "inherit" }}>×</button>
        </div>

        {values.length > 0 && (
          <div style={{ background: S.neonG, border: `1px solid ${S.neonB}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 8, color: S.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>Wofür du das machst</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {values.map((v, i) => <div key={i} style={{ background: S.neonG, border: `1px solid ${S.neonB}`, borderRadius: 20, padding: "4px 10px", fontSize: 10, fontWeight: 700, color: S.neon }}>{v}</div>)}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          {actions.map((a) => (
            <button key={a.id} onPointerDown={() => haptic.m()} onClick={() => setActive(a.id)}
              style={{ padding: "14px 10px", borderRadius: 12, border: `1px solid ${a.c}44`, background: `${a.c}09`, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
              <span style={{ fontSize: 18, color: a.c }}>{a.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: a.c }}>{a.label}</span>
              <span style={{ fontSize: 9, color: S.muted, lineHeight: 1.4 }}>{a.sub}</span>
            </button>
          ))}
        </div>

        <Card S={S} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: S.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Ablenkungsprotokoll</div>
          {[
            "5-Minuten-Timer stellen — dann neu entscheiden.",
            "Standort wechseln. Jetzt. Anderer Raum oder draußen.",
            "Ein großes Glas Wasser trinken.",
            "Aufschreiben was gerade los ist — ohne Filter.",
            "Eine Aufgabe starten die sowieso wartet.",
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: i < 4 ? `1px solid ${S.border}` : "none" }}>
              <span style={{ fontSize: 9, color: S.neonB, fontFamily: "monospace", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ fontSize: 11, color: S.muted, lineHeight: 1.5 }}>{s}</span>
            </div>
          ))}
        </Card>

        <button onClick={onClose} style={{ width: "100%", padding: "12px", background: "transparent", border: `1px solid ${S.border}`, borderRadius: 10, fontSize: 10, fontWeight: 700, cursor: "pointer", color: S.muted, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "inherit" }}>
          Schließen
        </button>
      </div>
    </div>
  );
}
