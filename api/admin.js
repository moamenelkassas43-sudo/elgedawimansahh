export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminCode = String(process.env.ADMIN_CODE || "99999").trim();

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: "Missing Supabase environment variables" });
    }

    const body =
      req.method === "GET"
        ? req.query || {}
        : typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const providedAdminCode = String(
      body.admin_code || body.adminCode || body.access_code || req.headers["x-admin-code"] || ""
    ).trim();

    if (!providedAdminCode || providedAdminCode !== adminCode) {
      return res.status(401).json({ error: "غير مصرح - كود الإدارة غير صحيح" });
    }

    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    };

    const action = String(body.action || "list_students").trim();

    if (action === "list_students") {
      const r = await fetch(`${supabaseUrl}/rest/v1/students_access?select=*&order=created_at.desc`, {
        headers
      });
      const data = await r.json();
      if (!r.ok) return res.status(500).json({ error: data?.message || "Failed to load students" });
      return res.status(200).json({ ok: true, students: data });
    }

    if (action === "create_code" || action === "upsert_student") {
      const accessCode = String(body.access_code || body.code || "").trim();
      if (!accessCode) {
        return res.status(400).json({ error: "كود الطالب مطلوب" });
      }

      const payload = {
        access_code: accessCode,
        full_name: String(body.full_name || body.name || "").trim() || null,
        phone: String(body.phone || "").trim() || null,
        grade: String(body.grade || "").trim() || null,
        gender: String(body.gender || "male").trim(),
        is_admin: Boolean(body.is_admin || false),
        is_active: body.is_active !== undefined ? Boolean(body.is_active) : true
      };

      const r = await fetch(`${supabaseUrl}/rest/v1/students_access?on_conflict=access_code`, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(payload)
      });
      const data = await r.json();
      if (!r.ok) return res.status(500).json({ error: data?.message || "Failed to save student code" });
      return res.status(200).json({ ok: true, student: Array.isArray(data) ? data[0] : data });
    }

    if (action === "toggle_active") {
      const id = String(body.id || "").trim();
      const accessCode = String(body.access_code || "").trim();
      const isActive = Boolean(body.is_active);

      const filter = id
        ? `id=eq.${encodeURIComponent(id)}`
        : accessCode
        ? `access_code=eq.${encodeURIComponent(accessCode)}`
        : "";

      if (!filter) return res.status(400).json({ error: "معرف الطالب أو الكود مطلوب" });

      const r = await fetch(`${supabaseUrl}/rest/v1/students_access?${filter}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ is_active: isActive })
      });
      const data = await r.json();
      if (!r.ok) return res.status(500).json({ error: data?.message || "Failed to update status" });
      return res.status(200).json({ ok: true, student: Array.isArray(data) ? data[0] : data });
    }

    if (action === "delete_student") {
      const id = String(body.id || "").trim();
      const accessCode = String(body.access_code || "").trim();

      const filter = id
        ? `id=eq.${encodeURIComponent(id)}`
        : accessCode
        ? `access_code=eq.${encodeURIComponent(accessCode)}`
        : "";

      if (!filter) return res.status(400).json({ error: "معرف الطالب أو الكود مطلوب" });

      const r = await fetch(`${supabaseUrl}/rest/v1/students_access?${filter}`, {
        method: "DELETE",
        headers
      });
      if (!r.ok) {
        const errText = await r.text();
        return res.status(500).json({ error: errText || "Failed to delete student" });
      }
      return res.status(200).json({ ok: true });
    }

    if (action === "create_post") {
      const title = String(body.title || "").trim();
      const section = String(body.section || "عام").trim();
      if (!title) return res.status(400).json({ error: "عنوان المنشور مطلوب" });

      const payload = {
        section,
        tag: String(body.tag || "تحديث").trim(),
        title,
        description: String(body.description || "").trim() || null,
        media_type: String(body.media_type || "none").trim(),
        media_url: String(body.media_url || "").trim() || null,
        created_by: String(body.created_by || "الأستاذ محمد الجداوي").trim()
      };

      const r = await fetch(`${supabaseUrl}/rest/v1/platform_posts`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      const data = await r.json();
      if (!r.ok) return res.status(500).json({ error: data?.message || "Failed to create post" });
      return res.status(200).json({ ok: true, post: Array.isArray(data) ? data[0] : data });
    }

    if (action === "delete_post") {
      const id = String(body.id || "").trim();
      if (!id) return res.status(400).json({ error: "رقم المنشور مطلوب" });

      const r = await fetch(`${supabaseUrl}/rest/v1/platform_posts?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers
      });
      if (!r.ok) {
        const errText = await r.text();
        return res.status(500).json({ error: errText || "Failed to delete post" });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "عملية غير معروفة" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unexpected admin error" });
  }
}
