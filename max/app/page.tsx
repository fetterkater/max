"use client";
import { useState } from "react";

export default function Page() {
  const [input, setInput] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!input.trim()) return;
    setLoading(true); setOut("");
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler");
      setOut(data.text);
    } catch (e:any) {
      setOut("Fehler: " + e.message);
    }
    setLoading(false);
  }

  return (
    <main style={{ padding: 20, maxWidth: 700, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>MindFiltwr v1</h1>

      <textarea
        value={input}
        onChange={(e)=>setInput(e.target.value)}
        placeholder="Was geht gerade ab?"
        style={{ width:"100%", height:120, marginTop:12, padding:10 }}
      />

      <button onClick={run} disabled={loading}
        style={{ marginTop:10, padding:12, width:"100%" }}>
        {loading ? "…" : "Analysieren"}
      </button>

      {out && (
        <div style={{ marginTop:20, whiteSpace:"pre-wrap" }}>
          {out}
        </div>
      )}
    </main>
  );
}