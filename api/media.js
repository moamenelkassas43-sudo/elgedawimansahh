export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed", message: "Method not allowed" });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const adminCode = String(process.env.ADMIN_CODE || "99999").trim();

    if (!supabaseUrl || (!serviceKey && !anonKey)) {
      const msg = "Missing Supabase environment variables";
      return res.status(500).json({ ok: false, error: msg, message: msg });
    }

    if (req.method === "GET") {
      const apiKey = serviceKey || anonKey;
      const headers = {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      };
      const section = String(req.query?.section || "").trim();
      const queryUrl = section
        ? `${supabaseUrl}/rest/v1/platform_posts?section=eq.${encodeURIComponent(section)}&select=*&order=created_at.desc`
        : `${supabaseUrl}/rest/v1/platform_posts?select=*&order=created_at.desc`;

      const r = await fetch(queryUrl, { headers });
      const data = await r.json();
      if (!r.ok) {
        const msg = data?.message || "Failed to load posts";
        return res.status(500).json({ ok: false, error: msg, message: msg });
      }
      return res.status(200).json({ ok: true, posts: Array.isArray(data) ? data : [] });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const action = String(body.action || "list").trim().toLowerCase();

    if (action === "list") {
      const apiKey = serviceKey || anonKey;
      const r = await fetch(`${supabaseUrl}/rest/v1/platform_posts?select=*&order=created_at.desc`, {
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      });
      const data = await r.json();
      if (!r.ok) {
        const msg = data?.message || "Failed to load posts";
        return res.status(500).json({ ok: false, error: msg, message: msg });
      }
      return res.status(200).json({ ok: true, posts: Array.isArray(data) ? data : [] });
    }

    const providedAdminCode = String(body.adminCode || body.admin_code || "").trim();
    if (!providedAdminCode || providedAdminCode !== adminCode) {
      const msg = "غير مصرح - كود الإدارة غير صحيح";
      return res.status(401).json({ ok: false, error: msg, message: msg });
    }

    if (!serviceKey) {
      const msg = "SUPABASE_SERVICE_ROLE_KEY is required for write/delete actions";
      return res.status(500).json({ ok: false, error: msg, message: msg });
    }

    const writeHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    };

    if (action === "create") {
      const title = String(body.title || "").trim();
      if (!title) {
        const msg = "عنوان المنشور مطلوب";
        return res.status(400).json({ ok: false, error: msg, message: msg });
      }

      const payload = {
        section: String(body.section || "updates").trim(),
        tag: String(body.tag || "الأخبار").trim(),
        title,
        description: String(body.description || "").trim() || null,
        media_type: String(body.media_type || "none").trim(),
        media_url: String(body.media_url || "").trim() || null,
        created_by: String(body.created_by || "الأدمن").trim()
      };

      const r = await fetch(`${supabaseUrl}/rest/v1/platform_posts`, {
        method: "POST",
        headers: writeHeaders,
        body: JSON.stringify(payload)
      });
      const data = await r.json();
      if (!r.ok) {
        const msg = data?.message || "Failed to create post";
        return res.status(500).json({ ok: false, error: msg, message: msg });
      }
      return res.status(200).json({ ok: true, post: Array.isArray(data) ? data[0] : data });
    }

    if (action === "delete") {
      const postId = String(body.postId || body.id || "").trim();
      if (!postId) {
        const msg = "رقم المنشور مطلوب";
        return res.status(400).json({ ok: false, error: msg, message: msg });
      }

      const r = await fetch(`${supabaseUrl}/rest/v1/platform_posts?id=eq.${encodeURIComponent(postId)}`, {
        method: "DELETE",
        headers: writeHeaders
      });
      if (!r.ok) {
        const errText = await r.text();
        const msg = errText || "Failed to delete post";
        return res.status(500).json({ ok: false, error: msg, message: msg });
      }
      return res.status(200).json({ ok: true });
    }

    const msg = `عملية غير معروفة: ${action}`;
    return res.status(400).json({ ok: false, error: msg, message: msg });
  } catch (err) {
    const msg = err.message || "Unexpected media error";
    return res.status(500).json({ ok: false, error: msg, message: msg });
  }
}
