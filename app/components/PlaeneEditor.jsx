"use client";
import { useState } from "react";
import { haptic } from "../lib/helpers";
import { Card, Btn } from "./ui";

const SUGGESTIONS = [
  ["Einsamkeit",          "Einen Freund anrufen oder anschreiben"],
  ["Suchtdruck",          "Kalt duschen + 10 Minuten draußen gehen"],
  ["Stress nach Arbeit",  "Musik an, 5 Minuten draußen stehen"],
  ["Langeweile abends",   "Sport oder ein konkretes Hobby starten"],
];

export default function PlaeneEditor({ plans, setPlans, save, S }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ wenn: "", dann: "" });

  function add() {
    if (!form.wenn.trim() || !form.dann.trim()) return;
    haptic.s();
    const n = [...plans, { id: Date.now(), ...form }];
    setPlans(n); save("wenn_dann", n);
    setForm({ wenn: "", dann: "" }); setAdding(false);
  }

  function remove(id) {
    haptic.l();
    const n = plans.filter((p) => p.id !== id);
    setPlans(n); save("wenn_dann", n);
  }

  return (
    <div>
      {plans.length === 0 && !adding && (
        <Card S={S} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: S.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Vorschläge zum Starten</div>
          <div style={{ fontSize: 10, color: S.muted, marginBottom: 10, lineHeight: 1.5 }}>Tippe einen an um ihn direkt hinzuzufügen.</div>
          {SUGGESTIONS.map(([w, d], i) => (
            <div key={i} onPointerDown={() => haptic.l()} onClick={() => { const n = [...plans, { id: Date.now(), wenn: w, dann: d }]; setPlans(n); save("wenn_dann", n); }}
              style={{ display: "flex", gap: 8, padding: "9px 0", borderBottom: i < SUGGESTIONS.length - 1 ? `1px solid ${S.border}` : "none", cursor: "pointer" }}>
              <span style={{ fontSize: 11, color: S.cyan }}>Wenn {w}</span>
              <span style={{ fontSize: 11, color: S.muted }}>→</span>
              <span style={{ fontSize: 11, color: S.text }}>{d}</span>
            </div>
          ))}
        </Card>
      )}

      {plans.map((p) => (
        <Card key={p.id} S={S} glow style={{ marginBottom: 8, padding: "11px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, fontSize: 11, lineHeight: 1.6 }}>
              <span style={{ color: S.muted, fontSize: 9, textTransform: "uppercase" }}>Wenn </span>
              <span style={{ color: S.cyan, fontWeight: 700 }}>{p.wenn}</span>
              <span style={{ color: S.muted }}> → </span>
              <span style={{ color: S.text, fontWeight: 700 }}>{p.dann}</span>
            </div>
            <button onPointerDown={() => haptic.l()} onClick={() => remove(p.id)}
              style={{ width: 24, height: 24, borderRadius: 5, border: "1px solid rgba(255,77,109,0.3)", background: "rgba(255,77,109,0.08)", color: S.danger, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              ×
            </button>
          </div>
        </Card>
      ))}

      {adding ? (
        <Card S={S} glow style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: S.neon, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Neuer Plan</div>
          {[
            { k: "wenn", l: "Wenn... (Situation oder Gefühl)",  p: "z.B. Einsamkeit abends, Streit, Stress" },
            { k: "dann", l: "Dann... (eine konkrete Handlung)", p: "z.B. Freund anrufen, kalt duschen" },
          ].map((f) => (
            <div key={f.k} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>{f.l}</div>
              <input value={form[f.k]} onChange={(e) => setForm((p) => ({ ...p, [f.k]: e.target.value }))} placeholder={f.p}
                style={{ width: "100%", background: S.input, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: S.text, fontFamily: "inherit", outline: "none" }} />
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
            <Btn onClick={add} disabled={!form.wenn.trim() || !form.dann.trim()} S={S}>+ Hinzufügen</Btn>
            <button onPointerDown={() => haptic.l()} onClick={() => { setAdding(false); setForm({ wenn: "", dann: "" }); }}
              style={{ padding: "15px", background: "transparent", border: `1px solid ${S.border}`, borderRadius: 12, fontSize: 11, fontWeight: 900, cursor: "pointer", color: S.muted, fontFamily: "inherit", letterSpacing: "0.13em", textTransform: "uppercase" }}>
              Abbrechen
            </button>
          </div>
        </Card>
      ) : (
        <button onPointerDown={() => haptic.l()} onClick={() => setAdding(true)}
          style={{ width: "100%", padding: "12px", background: "transparent", border: `1px dashed ${S.neonB}`, borderRadius: 10, fontSize: 10, fontWeight: 800, cursor: "pointer", color: S.neon, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "inherit" }}>
          + Neuer Plan
        </button>
      )}
    </div>
  );
}
