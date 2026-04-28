
const AIRCALL_BASE = "https://api.aircall.io/v1";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const AUTH = Buffer.from(
    `${process.env.AIRCALL_API_ID}:${process.env.AIRCALL_API_TOKEN}`
  ).toString("base64");

  const { per_page = 20, from, to, direction } = req.query;
  const params = new URLSearchParams({ per_page });
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  if (direction && direction !== "all") params.append("direction", direction);

  try {
    const r = await fetch(`${AIRCALL_BASE}/calls?${params}`, {
      headers: { Authorization: `Basic ${AUTH}` }
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}