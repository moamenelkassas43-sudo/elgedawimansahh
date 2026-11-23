export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed", message: "Method not allowed" });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminCode = String(process.env.ADMIN_CODE || "99999").trim();

    if (!supabaseUrl || !serviceKey) {
      const msg = "Missing Supabase environment variables";
      return res.status(500).json({ ok: false, error: msg, message: msg });
    }

    const body =
      req.method === "GET"
        ? req.query || {}
        : typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const providedAdminCode = String(
      body.adminCode || body.admin_code || body.access_code || req.headers["x-admin-code"] || ""
    ).trim();

    if (!providedAdminCode || providedAdminCode !== adminCode) {
      const msg = "غير مصرح - كود الإدارة غير صحيح";
      return res.status(401).json({ ok: false, error: msg, message: msg });
    }

    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    };

    const rawAction = String(body.action || body.type || "listStudents").trim().toLowerCase();

    if (rawAction === "liststudents" || rawAction === "list_students" || rawAction === "get_students") {
      const r = await fetch(`${supabaseUrl}/rest/v1/students_access?select=*&order=created_at.desc`, {
        headers
      });
      const data = await r.json();
      if (!r.ok) {
        const msg = data?.message || "Failed to load students";
        return res.status(500).json({ ok: false, error: msg, message: msg });
      }
      return res.status(200).json({ ok: true, students: Array.isArray(data) ? data : [] });
    }

    if (
      rawAction === "generate500" ||
      rawAction === "generate_500" ||
      rawAction === "generate_codes" ||
      rawAction === "bulk_create"
    ) {
      const count = Math.min(Math.max(Number(body.count || 500) || 500, 1), 1000);
      const grade = String(body.grade || "").trim() || null;

      const existingRes = await fetch(`${supabaseUrl}/rest/v1/students_access?select=access_code`, {
        headers
      });
      const existingData = existingRes.ok ? await existingRes.json() : [];
      const usedCodes = new Set(
        Array.isArray(existingData) ? existingData.map((item) => String(item.access_code || "").trim()) : []
      );
      usedCodes.add(adminCode);

      const generated = [];
      let safetyCounter = 0;

      while (generated.length < count && safetyCounter < count * 25) {
        safetyCounter++;
        const code = String(Math.floor(10000 + Math.random() * 90000));
        if (!usedCodes.has(code)) {
          usedCodes.add(code);
          generated.push({
            access_code: code,
            full_name: null,
            phone: null,
            grade,
            gender: "male",
            is_admin: false,
            is_active: true,
            is_online: false,
            devices: []
          });
        }
      }

      const chunkSize = 250;
      const insertedAll = [];

      for (let i = 0; i < generated.length; i += chunkSize) {
        const chunk = generated.slice(i, i + chunkSize);
        const r = await fetch(`${supabaseUrl}/rest/v1/students_access?on_conflict=access_code`, {
          method: "POST",
          headers: { ...headers, Prefer: "resolution=ignore-duplicates,return=representation" },
          body: JSON.stringify(chunk)
        });
        const data = await r.json();
        if (!r.ok) {
          const msg = data?.message || "فشل حفظ الأكواد في قاعدة البيانات";
          return res.status(500).json({ ok: false, error: msg, message: msg });
        }
        if (Array.isArray(data)) {
          insertedAll.push(...data);
        }
      }

      const codesList = (insertedAll.length > 0 ? insertedAll : generated).map((row) => row.access_code);

      return res.status(200).json({
        ok: true,
        count: codesList.length,
        codes: codesList,
        students: insertedAll
      });
    }

    if (rawAction === "togglecode" || rawAction === "toggle_active" || rawAction === "toggle_code") {
      const targetCode = String(body.targetCode || body.access_code || body.code || "").trim();
      const id = String(body.id || "").trim();

      if (!targetCode && !id) {
        const msg = "كود الطالب مطلوب";
        return res.status(400).json({ ok: false, error: msg, message: msg });
      }

      const filter = id
        ? `id=eq.${encodeURIComponent(id)}`
        : `access_code=eq.${encodeURIComponent(targetCode)}`;

      const currentRes = await fetch(`${supabaseUrl}/rest/v1/students_access?${filter}&select=*`, {
        headers
      });
      const currentRows = await currentRes.json();
      const currentRow = Array.isArray(currentRows) && currentRows.length > 0 ? currentRows[0] : null;
      const nextActive = body.is_active !== undefined ? Boolean(body.is_active) : !(currentRow?.is_active !== false);

      const r = await fetch(`${supabaseUrl}/rest/v1/students_access?${filter}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ is_active: nextActive })
      });
      const data = await r.json();
      if (!r.ok) {
        const msg = data?.message || "Failed to update status";
        return res.status(500).json({ ok: false, error: msg, message: msg });
      }
      return res.status(200).json({ ok: true, student: Array.isArray(data) ? data[0] : data });
    }

    const unknownMsg = `عملية غير معروفة: ${rawAction}`;
    return res.status(400).json({ ok: false, error: unknownMsg, message: unknownMsg });
  } catch (err) {
    const msg = err.message || "Unexpected admin error";
    return res.status(500).json({ ok: false, error: msg, message: msg });
  }
}
