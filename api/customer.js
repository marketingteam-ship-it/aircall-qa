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

  // Normalize search number — digits only
  const cleanSearch = phone.replace(/\D/g, "");
  // Last 9 digits for local format matching
  const last9 = cleanSearch.slice(-9);

  // Last 6 months
  const from = Math.floor(Date.now() / 1000) - 6 * 30 * 24 * 60 * 60;

  try {
    let allMatched = [];
    let url = `${AIRCALL_BASE}/calls?per_page=50&from=${from}`;

    while (url) {
      const r = await fetch(url, { headers: HEADERS });
      if (!r.ok) break;
      const data = await r.json();
      const calls = data.calls || [];

      for (const c of calls) {
        // Collect every phone-like field on the call object
        const candidates = [
          c.raw_digits,
          c.phone_number,
          c.asset,
          c.contact?.phone_number,
          c.contact?.information,
          c.number?.digits,
          c.number?.name,
        ]
          .filter(Boolean)
          .map(f => String(f).replace(/\D/g, ""))
          .filter(f => f.length >= 7);

        const matched = candidates.some(f =>
          f === cleanSearch ||
          f.endsWith(last9) ||
          cleanSearch.endsWith(f.slice(-9))
        );

        if (matched) allMatched.push(c);
      }

      // Follow next page
      const nextLink = data.meta?.next_page_link;
      if (nextLink && calls.length === 50) {
        const nextUrl = new URL(nextLink);
        // Keep the from filter on subsequent pages
        url = `${AIRCALL_BASE}/calls?${nextUrl.searchParams.toString()}`;
      } else {
        url = null;
      }
    }

    return res.status(200).json({ calls: allMatched, total: allMatched.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}