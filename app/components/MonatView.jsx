"use client";
import { Card } from "./ui";

export default function MonatView({ checkins, totalSupps, S }) {
  const now = new Date(), y = now.getFullYear(), mo = now.getMonth();
  const dim = new Date(y, mo + 1, 0).getDate();
  const dm = {};

  checkins.forEach((c) => {
    const d = new Date(c.date);
    if (d.getFullYear() === y && d.getMonth() === mo) {
      const k = d.getDate();
      if (!dm[k]) dm[k] = { r: null, s: 0 };
      if (!dm[k].r || c.risk === "hoch") dm[k].r = c.risk;
      dm[k].s = Math.max(dm[k].s, c.suppsDone || 0);
    }
  });

  const off = (new Date(y, mo, 1).getDay() + 6) % 7;
  const ciD = Object.keys(dm).length;
  const sdD = Object.values(dm).filter((d) => d.s >= totalSupps).length;
  const hrD = Object.values(dm).filter((d) => d.r === "hoch").length;

  function dc(day) {
    const d = dm[day];
    if (!d)          return S.input;
    if (d.r === "hoch")   return "rgba(255,77,109,0.5)";
    if (d.r === "mittel") return "rgba(255,193,7,0.45)";
    return "rgba(0,255,157,0.4)";
  }

  return (
    <Card S={S} style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: S.text, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {now.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginBottom: 14 }}>
        {[
          { l: "Check-ins",   v: `${Math.round(ciD / dim * 100)}%`, c: S.neon },
          { l: "Volle Supps", v: `${Math.round(sdD / dim * 100)}%`, c: S.ok },
          { l: "Hoch-Risiko", v: hrD, c: hrD > 0 ? S.danger : S.muted },
        ].map((s) => (
          <div key={s.l} style={{ background: S.input, borderRadius: 9, padding: "9px 7px", textAlign: "center", border: `1px solid ${S.border}` }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: s.c, textShadow: `0 0 8px ${s.c}` }}>{s.v}</div>
            <div style={{ fontSize: 7, color: S.muted, marginTop: 2, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 6 }}>
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
          <div key={d} style={{ fontSize: 7, color: S.muted, textAlign: "center", padding: "2px 0" }}>{d}</div>
        ))}
        {[...Array(off)].map((_, i) => <div key={`e${i}`} />)}
        {[...Array(dim)].map((_, i) => {
          const day = i + 1, isT = day === now.getDate();
          return (
            <div key={day} style={{ aspectRatio: "1", borderRadius: 3, background: dc(day), border: isT ? `1px solid ${S.neon}` : "1px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: dm[day] ? S.text : S.muted }}>
              {day}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { c: "rgba(0,255,157,0.4)",  l: "Niedrig" },
          { c: "rgba(255,193,7,0.4)",  l: "Mittel" },
          { c: "rgba(255,77,109,0.5)", l: "Hoch" },
          { c: S.input,               l: "Kein Check-in" },
        ].map((l) => (
          <div key={l.l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: l.c }} />
            <span style={{ fontSize: 7, color: S.muted }}>{l.l}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
