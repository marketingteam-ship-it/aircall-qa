const AIRCALL_BASE = "https://api.aircall.io/v1";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const AUTH = Buffer.from(
    `${process.env.AIRCALL_API_ID}:${process.env.AIRCALL_API_TOKEN}`
  ).toString("base64");

  // Fetch just 3 calls and return the full raw object
  const r = await fetch(`${AIRCALL_BASE}/calls?per_page=3`, {
    headers: { Authorization: `Basic ${AUTH}` }
  });
  const data = await r.json();

  // Return the first call's full raw structure
  return res.status(200).json(data.calls?.[0] || {});
}