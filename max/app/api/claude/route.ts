export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return Response.json({ error: data.error?.message }, { status: 500 });
    }

    const text =
      data.content?.map((b:any)=>b.text).join("") || "Keine Antwort";

    return Response.json({ text });
  } catch (e:any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}