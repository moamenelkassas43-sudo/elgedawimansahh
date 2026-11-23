const PRE_SAVED_500_CODES = Array.from({ length: 500 }, (_, i) => String(10101 + i));

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminCode = String(process.env.ADMIN_CODE || "99999").trim().toUpperCase();

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ ok: false, message: "Missing Supabase environment variables" });
    }

    const body =
      req.method === "GET"
        ? req.query || {}
        : typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const providedAdminCode = String(
      body.adminCode || body.admin_code || body.access_code || req.headers["x-admin-code"] || ""
    ).trim().toUpperCase();

    if (!providedAdminCode || providedAdminCode !== adminCode) {
      return res.status(401).json({ ok: false, message: "غير مصرح - كود الإدارة غير صحيح" });
    }

    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    };

    const rawAction = String(body.action || "listStudents").trim().toLowerCase();

    if (rawAction === "liststudents" || rawAction === "list_students") {
      const r = await fetch(`${supabaseUrl}/rest/v1/students_access?select=*&order=access_code.asc`, { headers });
      const data = await r.json();
      if (!r.ok) return res.status(500).json({ ok: false, message: data?.message || "Failed to load students" });
      return res.status(200).json({ ok: true, students: Array.isArray(data) ? data : [] });
    }

    if (rawAction === "sync500" || rawAction === "generate500" || rawAction === "generate_500") {
      const rowsToInsert = PRE_SAVED_500_CODES.map(code => ({
        access_code: code,
        full_name: null,
        phone: null,
        is_admin: false,
        is_active: true,
        is_online: false,
        devices: []
      }));

      for (let i = 0; i < rowsToInsert.length; i += 250) {
        const chunk = rowsToInsert.slice(i, i + 250);
        const r = await fetch(`${supabaseUrl}/rest/v1/students_access?on_conflict=access_code`, {
          method: "POST",
          headers: { ...headers, Prefer: "resolution=ignore-duplicates,return=representation" },
          body: JSON.stringify(chunk)
        });
        const data = await r.json();
        if (!r.ok) return res.status(500).json({ ok: false, message: data?.message || "فشل حفظ الـ 500 كود" });
      }

      return res.status(200).json({ ok: true, count: 500 });
    }

    if (rawAction === "togglecode" || rawAction === "toggle_code") {
      const targetCode = String(body.targetCode || body.access_code || "").trim().toUpperCase();
      if (!targetCode) return res.status(400).json({ ok: false, message: "كود الطالب مطلوب" });

      const currentRes = await fetch(
        `${supabaseUrl}/rest/v1/students_access?access_code=eq.${encodeURIComponent(targetCode)}&select=*`,
        { headers }
      );
      const rows = await currentRes.json();
      const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      const nextActive = !(row?.is_active !== false);

      const r = await fetch(`${supabaseUrl}/rest/v1/students_access?access_code=eq.${encodeURIComponent(targetCode)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ is_active: nextActive })
      });
      const data = await r.json();
      if (!r.ok) return res.status(500).json({ ok: false, message: data?.message || "Failed to update status" });
      return res.status(200).json({ ok: true, student: Array.isArray(data) ? data[0] : data });
    }

    if (rawAction === "deletecode" || rawAction === "delete_student" || rawAction === "deletestudent") {
      const targetCode = String(body.targetCode || body.access_code || "").trim().toUpperCase();
      if (!targetCode) return res.status(400).json({ ok: false, message: "كود العضوية مطلوب" });

      const r = await fetch(`${supabaseUrl}/rest/v1/students_access?access_code=eq.${encodeURIComponent(targetCode)}`, {
        method: "DELETE",
        headers
      });
      if (!r.ok) {
        const errText = await r.text();
        return res.status(500).json({ ok: false, message: errText || "فشل حذف العضوية" });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, message: `عملية غير معروفة: ${rawAction}` });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Unexpected admin error" });
  }
}
