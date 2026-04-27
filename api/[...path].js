const AIRCALL_BASE = "https://api.aircall.io/v1";

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowed = process.env.ALLOWED_ORIGIN || "";

  if (allowed && origin !== allowed) {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.setHeader("Access-Control-Allow-Origin", allowed || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const AUTH = Buffer.from(
    `${process.env.AIRCALL_API_ID}:${process.env.AIRCALL_API_TOKEN}`
  ).toString("base64");

  const HEADERS = {
    Authorization: `Basic ${AUTH}`,
    "Content-Type": "application/json",
  };

  const segments = req.query.path || [];
  const route = Array.isArray(segments) ? segments.join("/") : segments;

  const { path: _, ...rest } = req.query;
  const params = new URLSearchParams(rest).toString();
  const url = `${AIRCALL_BASE}/${route}${params ? "?" + params : ""}`;

  try {
    const r = await fetch(url, { headers: HEADERS });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}