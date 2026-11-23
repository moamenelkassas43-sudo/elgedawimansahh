export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminCode = String(process.env.ADMIN_CODE || "99999").trim();

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: "Missing Supabase environment variables" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const accessCode = String(body.access_code || body.accessCode || body.code || "").trim();
    const fullName = String(body.full_name || body.fullName || body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const grade = String(body.grade || "").trim();
    const gender = String(body.gender || "male").trim();

    if (!accessCode) {
      return res.status(400).json({ error: "كود الدخول مطلوب" });
    }

    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    };

    const isAdmin = accessCode === adminCode;

    const lookupRes = await fetch(
      `${supabaseUrl}/rest/v1/students_access?access_code=eq.${encodeURIComponent(accessCode)}&select=*`,
      { headers }
    );

    if (!lookupRes.ok) {
      const errText = await lookupRes.text();
      return res.status(500).json({ error: `Database error: ${errText}` });
    }

    const existingRows = await lookupRes.json();
    let userRecord = Array.isArray(existingRows) && existingRows.length > 0 ? existingRows[0] : null;

    if (userRecord && userRecord.is_active === false && !isAdmin) {
      return res.status(403).json({ error: "تم إيقاف هذا الكود من الإدارة" });
    }

    const payload = {
      access_code: accessCode,
      full_name: fullName || userRecord?.full_name || (isAdmin ? "الأستاذ محمد الجداوي" : "طالب"),
      phone: phone || userRecord?.phone || "",
      grade: grade || userRecord?.grade || "",
      gender: gender || userRecord?.gender || "male",
      is_admin: isAdmin || Boolean(userRecord?.is_admin),
      is_active: true,
      is_online: true,
      last_seen: new Date().toISOString()
    };

    if (userRecord) {
      const patchRes = await fetch(
        `${supabaseUrl}/rest/v1/students_access?id=eq.${encodeURIComponent(userRecord.id)}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify(payload)
        }
      );
      if (!patchRes.ok) {
        const errText = await patchRes.text();
        return res.status(500).json({ error: `Update failed: ${errText}` });
      }
      const updated = await patchRes.json();
      userRecord = Array.isArray(updated) && updated.length > 0 ? updated[0] : { ...userRecord, ...payload };
    } else {
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/students_access`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      if (!insertRes.ok) {
        const errText = await insertRes.text();
        return res.status(500).json({ error: `Insert failed: ${errText}` });
      }
      const created = await insertRes.json();
      userRecord = Array.isArray(created) && created.length > 0 ? created[0] : payload;
    }

    return res.status(200).json({
      ok: true,
      user: userRecord,
      is_admin: Boolean(userRecord.is_admin || isAdmin)
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unexpected auth error" });
  }
}
