export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const adminCode = String(process.env.ADMIN_CODE || "99999").trim().toUpperCase();

    if (!supabaseUrl || (!serviceKey && !anonKey)) {
      return res.status(500).json({ ok: false, message: "Missing Supabase environment variables" });
    }

    const body =
      req.method === "GET"
        ? req.query || {}
        : typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

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
      if (!r.ok) return res.status(500).json({ ok: false, message: data?.message || "Failed to load posts" });
      return res.status(200).json({ ok: true, posts: Array.isArray(data) ? data : [] });
    }

    const providedAdminCode = String(body.adminCode || body.admin_code || "").trim().toUpperCase();
    if (!providedAdminCode || providedAdminCode !== adminCode) {
      return res.status(401).json({ ok: false, message: "غير مصرح - كود الإدارة غير صحيح" });
    }

    if (!serviceKey) {
      return res.status(500).json({ ok: false, message: "SUPABASE_SERVICE_ROLE_KEY is required" });
    }

    const writeHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    };

    if (action === "create") {
      const title = String(body.title || "").trim();
      if (!title) return res.status(400).json({ ok: false, message: "عنوان المنشور مطلوب" });

      const payload = {
        section: String(body.section || "updates").trim(),
        tag: String(body.tag || "تحديث").trim(),
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
      if (!r.ok) return res.status(500).json({ ok: false, message: data?.message || "Failed to create post" });
      return res.status(200).json({ ok: true, post: Array.isArray(data) ? data[0] : data });
    }

    if (action === "delete") {
      const postId = String(body.postId || body.id || "").trim();
      if (!postId) return res.status(400).json({ ok: false, message: "رقم المنشور مطلوب" });

      const r = await fetch(`${supabaseUrl}/rest/v1/platform_posts?id=eq.${encodeURIComponent(postId)}`, {
        method: "DELETE",
        headers: writeHeaders
      });
      if (!r.ok) {
        const errText = await r.text();
        return res.status(500).json({ ok: false, message: errText || "فشل حذف المنشور" });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, message: `عملية غير معروفة: ${action}` });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Unexpected media error" });
  }
}
