
const AIRCALL_BASE = "https://api.aircall.io/v1";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const AUTH = Buffer.from(
    `${process.env.AIRCALL_API_ID}:${process.env.AIRCALL_API_TOKEN}`
  ).toString("base64");

  const HEADERS = { Authorization: `Basic ${AUTH}` };

  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "Missing phone number" });

  // Normalize: strip all non-digits for comparison
  const cleanSearch = phone.replace(/\D/g, "");
  // Also try last 9 digits (local format matching)
  const localSearch = cleanSearch.slice(-9);

  // Last 6 months
  const from = Math.floor(Date.now() / 1000) - 6 * 30 * 24 * 60 * 60;

  try {
    let allCalls = [];
    let page = 1;

    while (page <= 20) {
      const params = new URLSearchParams({ per_page: 50, from, page });
      const r = await fetch(`${AIRCALL_BASE}/calls?${params}`, { headers: HEADERS });
      if (!r.ok) break;
      const data = await r.json();
      const calls = data.calls || [];

      const matched = calls.filter(c => {
        // Check all phone number fields Aircall might use
        const fields = [
          c.raw_digits,
          c.phone_number,
          c.contact?.phone_number,
          c.contact?.direct_link,
        ].filter(Boolean).map(f => f.replace(/\D/g, ""));

        return fields.some(f =>
          f === cleanSearch ||
          f.endsWith(localSearch) ||
          cleanSearch.endsWith(f.slice(-9))
        );
      });

      allCalls = allCalls.concat(matched);
      if (calls.length < 50 || !data.meta?.next_page_link) break;
      page++;
    }

    return res.status(200).json({ calls: allCalls, total: allCalls.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}