export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || (!serviceKey && !anonKey)) {
      return res.status(500).json({ error: "Missing Supabase environment variables" });
    }

    const apiKey = serviceKey || anonKey;
    const headers = {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    };

    if (req.method === "GET") {
      const section = String(req.query?.section || "").trim();
      const queryUrl = section
        ? `${supabaseUrl}/rest/v1/platform_posts?section=eq.${encodeURIComponent(section)}&select=*&order=created_at.desc`
        : `${supabaseUrl}/rest/v1/platform_posts?select=*&order=created_at.desc`;

      const r = await fetch(queryUrl, { headers });
      const data = await r.json();
      if (!r.ok) {
        return res.status(500).json({ error: data?.message || "Failed to load posts" });
      }
      return res.status(200).json({ ok: true, posts: Array.isArray(data) ? data : [] });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const action = String(body.action || "list").trim();

    if (action === "list") {
      const r = await fetch(`${supabaseUrl}/rest/v1/platform_posts?select=*&order=created_at.desc`, {
        headers
      });
      const data = await r.json();
      if (!r.ok) {
        return res.status(500).json({ error: data?.message || "Failed to load posts" });
      }
      return res.status(200).json({ ok: true, posts: Array.isArray(data) ? data : [] });
    }

    return res.status(400).json({ error: "Unsupported media action" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unexpected media error" });
  }
}
