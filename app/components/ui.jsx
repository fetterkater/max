"use client";
import { useState } from "react";
import { haptic } from "../lib/helpers";

export function Card({ children, style, glow, S }) {
  return (
    <div style={{
      background: S.card, borderRadius: 14, padding: "16px 18px", marginBottom: 10,
      border: `1px solid ${glow ? S.neonB : S.border}`,
      boxShadow: glow ? `0 0 24px ${S.neonG}` : "0 2px 10px rgba(0,0,0,0.2)",
      transition: "all 0.5s", ...style
    }}>
      {children}
    </div>
  );
}

export function Btn({ onClick, disabled, children, color, S }) {
  const c = color || S.neon;
  const [p, setP] = useState(false);
  return (
    <button
      onPointerDown={() => { setP(true); haptic.m(); }}
      onPointerUp={() => setP(false)}
      onPointerLeave={() => setP(false)}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", padding: "15px",
        border: `1px solid ${disabled ? S.muted : c}`,
        background: p ? `${c}15` : "transparent",
        color: disabled ? S.muted : c,
        borderRadius: 12, fontSize: 11, fontWeight: 900, fontFamily: "inherit",
        cursor: disabled ? "default" : "pointer",
        letterSpacing: "0.13em", textTransform: "uppercase",
        boxShadow: disabled ? "none" : `0 0 20px ${c}22`,
        transform: p ? "scale(0.975)" : "scale(1)",
        transition: "transform 0.1s, background 0.15s",
        marginBottom: 4,
      }}
    >
      {children}
    </button>
  );
}

export function Slider({ label, min, max, low, high, value, onChange, color, S }) {
  const c = color || S.neon;
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: "0.14em", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 24, fontWeight: 900, fontFamily: "monospace", color: c, textShadow: `0 0 12px ${c}88`, lineHeight: 1, transition: "color 0.3s" }}>{value}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 8, color: S.muted, width: 40, flexShrink: 0 }}>{low}</span>
        <div style={{ flex: 1, position: "relative", height: 4, borderRadius: 4, background: S.input }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, borderRadius: 4, background: c, boxShadow: `0 0 8px ${c}88`, transition: "width 0.1s, background 0.3s" }} />
          <input
            type="range" min={min} max={max} value={value}
            onChange={(e) => { onChange(Number(e.target.value)); haptic.t(); }}
            style={{ position: "absolute", inset: "-8px 0", width: "100%", appearance: "none", WebkitAppearance: "none", background: "transparent", cursor: "pointer", height: 20, margin: 0 }}
          />
        </div>
        <span style={{ fontSize: 8, color: S.muted, width: 40, flexShrink: 0, textAlign: "right" }}>{high}</span>
      </div>
    </div>
  );
}

export function Spin({ S }) {
  return (
    <span style={{ display: "inline-block", width: 13, height: 13, border: `2px solid ${S.neonB}`, borderTopColor: S.neon, borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
  );
}

export function ErrBox({ msg, S }) {
  return (
    <div style={{ background: "rgba(255,77,109,0.08)", color: S.danger, borderRadius: 10, padding: "10px 14px", fontSize: 12, marginBottom: 10, border: "1px solid rgba(255,77,109,0.25)" }}>
      {msg}
    </div>
  );
}
