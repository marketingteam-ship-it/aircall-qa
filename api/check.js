const AIRCALL_BASE = "https://api.aircall.io/v1";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const AUTH = Buffer.from(
    `${process.env.AIRCALL_API_ID}:${process.env.AIRCALL_API_TOKEN}`
  ).toString("base64");

  try {
    const r = await fetch(`${AIRCALL_BASE}/calls?per_page=1`, {
      headers: { Authorization: `Basic ${AUTH}` }
    });
    if (r.ok) return res.status(200).json({ status: "ok" });
    return res.status(r.status).json({ status: "fail" });
  } catch (e) {
    return res.status(500).json({ status: "fail", error: e.message });
  }
}