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

  // Strip ALL non-digits for comparison
  const cleanSearch = phone.replace(/\D/g, "");
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
        // raw_digits is the customer number e.g. "+61 400 203 798"
        // Strip spaces/non-digits before comparing
        const rawDigits = (c.raw_digits || "").replace(/\D/g, "");

        if (
          rawDigits === cleanSearch ||
          rawDigits.endsWith(last9) ||
          cleanSearch.endsWith(rawDigits.slice(-9))
        ) {
          allMatched.push(c);
        }
      }

      const nextLink = data.meta?.next_page_link;
      if (nextLink && calls.length === 50) {
        const nextUrl = new URL(nextLink);
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