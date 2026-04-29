const AIRCALL_BASE = "https://api.aircall.io/v1";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const AUTH = Buffer.from(
    `${process.env.AIRCALL_API_ID}:${process.env.AIRCALL_API_TOKEN}`
  ).toString("base64");

  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "Missing phone number" });

  // Last 6 months from today
  const from = Math.floor(Date.now() / 1000) - 6 * 30 * 24 * 60 * 60;

  try {
    // Fetch up to 50 pages to get all calls in 6 months
    let allCalls = [];
    let page = 1;
    while (true) {
      const params = new URLSearchParams({ per_page: 50, from, page });
      const r = await fetch(`${AIRCALL_BASE}/calls?${params}`, {
        headers: { Authorization: `Basic ${AUTH}` }
      });
      const data = await r.json();
      const calls = data.calls || [];
      // Filter by phone number (raw_digits or phone_number fields)
      const matched = calls.filter(c => {
        const raw = c.raw_digits || "";
        const num = c.phone_number || "";
        const clean = phone.replace(/\D/g, "");
        return raw.includes(clean) || num.includes(clean) ||
               raw.includes(phone) || num.includes(phone);
      });
      allCalls = allCalls.concat(matched);
      if (calls.length < 50 || page >= 20) break; // max 20 pages
      page++;
    }
    return res.status(200).json({ calls: allCalls, total: allCalls.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}