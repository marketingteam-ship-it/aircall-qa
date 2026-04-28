const AIRCALL_BASE = "https://api.aircall.io/v1";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const AUTH = Buffer.from(
    `${process.env.AIRCALL_API_ID}:${process.env.AIRCALL_API_TOKEN}`
  ).toString("base64");

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing call id" });

  try {
    const r = await fetch(`${AIRCALL_BASE}/calls/${id}/transcription`, {
      headers: { Authorization: `Basic ${AUTH}` }
    });

    if (!r.ok) return res.status(200).json({ transcription: "[No transcript available]" });

    const data = await r.json();
    const utterances = data?.transcription?.content?.utterances || [];

    if (!utterances.length) return res.status(200).json({ transcription: "[No transcript available]" });

    // Convert utterances to readable plain text
    const text = utterances.map(u => {
      const speaker = u.participant_type === "internal" ? "Agent" : "Customer";
      return `${speaker}: ${u.text}`;
    }).join("\n");

    return res.status(200).json({ transcription: text });
  } catch (e) {
    return res.status(500).json({ transcription: "[Error fetching transcript]" });
  }
}