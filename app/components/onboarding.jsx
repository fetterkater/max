"use client";
import { useState } from "react";
import { KI_MODI } from "../lib/constants";
import { ls, haptic } from "../lib/helpers";

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [identity, setIdentity] = useState("");
  const [kiModus, setKiModus] = useState("direkt");
  const [soberStart, setSoberStart] = useState("");

  const IDS = [
    "Ich bin stabil.",
    "Ich baue Kontrolle auf.",
    "Ich wähle Klarheit.",
    "Ich bin stärker als der Drang.",
    "Ich entscheide mich täglich neu.",
  ];

  function finish() {
    ls.set("profile", JSON.stringify({
      name: name.trim(), identity, kiModus,
      soberStart: soberStart || new Date().toISOString(),
    }));
    onDone();
  }

  const inp = {
    width: "100%", background: "#12121f", border: "1px solid rgba(180,77,255,0.35)",
    borderRadius: 10, padding: "13px 16px", fontSize: 16, fontWeight: 700,
    color: "#f0eaff", fontFamily: "inherit", outline: "none", marginBottom: 16,
  };

  const NextBtn = ({ label, action, disabled }) => (
    <button
      onPointerDown={() => haptic.m()} onClick={action} disabled={disabled}
      style={{ width: "100%", padding: "15px", border: `1px solid ${disabled ? "#6b6485" : "#b44dff"}`, background: "transparent", color: disabled ? "#6b6485" : "#b44dff", borderRadius: 12, fontSize: 12, fontWeight: 900, fontFamily: "inherit", cursor: disabled ? "default" : "pointer", letterSpacing: "0.13em", textTransform: "uppercase", boxShadow: disabled ? "none" : "0 0 20px rgba(180,77,255,0.2)" }}
    >
      {label}
    </button>
  );

  const SkipBtn = ({ action }) => (
    <button onPointerDown={() => haptic.l()} onClick={action}
      style={{ width: "100%", padding: "8px", marginTop: 4, background: "none", border: "none", color: "#6b6485", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
      Überspringen
    </button>
  );

  const steps = [
    // Step 1: Name
    <div key="n" style={{ animation: "fadeUp 0.4s ease both" }}>
      <div style={{ fontSize: 24, fontWeight: 900, color: "#f0eaff", marginBottom: 8 }}>Wie heißt du?</div>
      <div style={{ fontSize: 12, color: "#6b6485", marginBottom: 28, lineHeight: 1.7 }}>Nur lokal gespeichert. Kein Account, kein Server.</div>
      <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && setStep(1)} placeholder="Vorname..." autoFocus style={inp} />
      <NextBtn label="Weiter →" action={() => setStep(1)} disabled={!name.trim()} />
    </div>,

    // Step 2: Identity
    <div key="i" style={{ animation: "fadeUp 0.4s ease both" }}>
      <div style={{ fontSize: 24, fontWeight: 900, color: "#f0eaff", marginBottom: 8 }}>Deine Recovery-Identität</div>
      <div style={{ fontSize: 12, color: "#6b6485", marginBottom: 20, lineHeight: 1.7 }}>Ein Satz der beschreibt, wer du gerade wirst. Erscheint im SOS-Screen.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
        {IDS.map((s) => (
          <button key={s} onPointerDown={() => haptic.l()} onClick={() => setIdentity(s)}
            style={{ padding: "11px 14px", borderRadius: 10, border: `1px solid ${identity === s ? "#b44dff" : "rgba(180,77,255,0.15)"}`, background: identity === s ? "rgba(180,77,255,0.1)" : "transparent", color: identity === s ? "#b44dff" : "#6b6485", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.15s" }}>
            {s}
          </button>
        ))}
      </div>
      <input value={identity} onChange={(e) => setIdentity(e.target.value)} placeholder="Oder eigenen Satz schreiben..." style={{ ...inp, fontSize: 13 }} />
      <NextBtn label="Weiter →" action={() => setStep(2)} disabled={!identity.trim()} />
      <SkipBtn action={() => setStep(2)} />
    </div>,

    // Step 3: KI-Stil
    <div key="k" style={{ animation: "fadeUp 0.4s ease both" }}>
      <div style={{ fontSize: 24, fontWeight: 900, color: "#f0eaff", marginBottom: 8 }}>Wie soll die KI mit dir sprechen?</div>
      <div style={{ fontSize: 12, color: "#6b6485", marginBottom: 20 }}>Jederzeit in den Einstellungen änderbar.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 20 }}>
        {KI_MODI.map((m) => (
          <button key={m.id} onPointerDown={() => haptic.l()} onClick={() => setKiModus(m.id)}
            style={{ padding: "13px 16px", borderRadius: 12, border: `1px solid ${kiModus === m.id ? "#b44dff" : "rgba(180,77,255,0.15)"}`, background: kiModus === m.id ? "rgba(180,77,255,0.1)" : "transparent", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s" }}>
            <span style={{ fontSize: 18, color: kiModus === m.id ? "#b44dff" : "#6b6485", width: 22 }}>{m.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: kiModus === m.id ? "#b44dff" : "#f0eaff" }}>{m.label}</div>
              <div style={{ fontSize: 10, color: "#6b6485" }}>{m.desc}</div>
            </div>
          </button>
        ))}
      </div>
      <NextBtn label="Weiter →" action={() => setStep(3)} disabled={false} />
    </div>,

    // Step 4: Sober date
    <div key="s" style={{ animation: "fadeUp 0.4s ease both" }}>
      <div style={{ fontSize: 24, fontWeight: 900, color: "#f0eaff", marginBottom: 8 }}>Seit wann bist du nüchtern?</div>
      <div style={{ fontSize: 12, color: "#6b6485", marginBottom: 24, lineHeight: 1.7 }}>Für Milestones und Streaks. Du kannst es jederzeit ändern.</div>
      <input type="date" value={soberStart ? soberStart.split("T")[0] : ""}
        onChange={(e) => setSoberStart(new Date(e.target.value).toISOString())}
        style={{ ...inp, fontSize: 14, fontFamily: "monospace", fontWeight: 800, color: "#b44dff", colorScheme: "dark" }}
      />
      <button onPointerDown={() => haptic.s()} onClick={finish}
        style={{ width: "100%", padding: "17px", border: "1px solid #b44dff", background: "rgba(180,77,255,0.1)", color: "#b44dff", borderRadius: 12, fontSize: 13, fontWeight: 900, fontFamily: "inherit", cursor: "pointer", letterSpacing: "0.13em", textTransform: "uppercase", boxShadow: "0 0 28px rgba(180,77,255,0.25)" }}>
        Starten →
      </button>
      <SkipBtn action={finish} />
    </div>,
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080810", fontFamily: "'SF Mono','Fira Code',monospace", color: "#f0eaff", maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 22px" }}>
      <style>{`*{box-sizing:border-box}@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}input{font-family:inherit}`}</style>
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, color: "rgba(180,77,255,0.6)", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 6 }}>BALANX · {step + 1}/4</div>
        <div style={{ width: 36, height: 2, background: "#b44dff", borderRadius: 2, boxShadow: "0 0 10px #b44dff" }} />
      </div>
      {steps[step]}
    </div>
  );
}
