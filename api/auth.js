const ALLOWED_500_CODES = new Set(
  Array.from({ length: 500 }, (_, i) => String(10101 + i))
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminCode = String(process.env.ADMIN_CODE || "99999").trim().toUpperCase();

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ ok: false, message: "Missing Supabase environment variables" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const action = String(body.action || "login").trim().toLowerCase();
    const rawCode = String(body.code || body.access_code || "").trim().toUpperCase();

    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    };

    if (action === "heartbeat") {
      if (!rawCode) return res.status(200).json({ ok: true });
      await fetch(`${supabaseUrl}/rest/v1/students_access?access_code=eq.${encodeURIComponent(rawCode)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ is_online: true, last_seen: new Date().toISOString() })
      });
      return res.status(200).json({ ok: true });
    }

    if (action === "logout") {
      if (!rawCode) return res.status(200).json({ ok: true });
      await fetch(`${supabaseUrl}/rest/v1/students_access?access_code=eq.${encodeURIComponent(rawCode)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ is_online: false, last_seen: new Date().toISOString() })
      });
      return res.status(200).json({ ok: true });
    }

    if (!rawCode || rawCode.length !== 5) {
      return res.status(400).json({ ok: false, message: "أدخل كود الدخول الصحيح المكون من 5 أرقام." });
    }

    const isAdmin = rawCode === adminCode || rawCode === "ADMIN";
    const isPreSavedCode = ALLOWED_500_CODES.has(rawCode);

    if (!isAdmin && !isPreSavedCode) {
      return res.status(401).json({
        ok: false,
        message: "هذا الكود غير معتمد. تواصل مع إدارة المنصة للحصول على كود دخول."
      });
    }

    const lookupRes = await fetch(
      `${supabaseUrl}/rest/v1/students_access?access_code=eq.${encodeURIComponent(rawCode)}&select=*`,
      { headers }
    );
    if (!lookupRes.ok) {
      const errText = await lookupRes.text();
      return res.status(500).json({ ok: false, message: `خطأ قاعدة البيانات: ${errText}` });
    }

    const rows = await lookupRes.json();
    let userRecord = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (userRecord && userRecord.is_active === false && !isAdmin) {
      return res.status(403).json({
        ok: false,
        message: "تم إيقاف هذا الكود من قبل الإدارة."
      });
    }

    const deviceId = String(body.deviceId || "").trim();
    const deviceLabel = String(body.deviceLabel || "").trim();
    let devices = Array.isArray(userRecord?.devices) ? [...userRecord.devices] : [];
    if (deviceId && !devices.some(d => (typeof d === "string" ? d === deviceId : d?.id === deviceId))) {
      devices.push({ id: deviceId, label: deviceLabel || "جهاز", at: new Date().toISOString() });
    }

    const cleanName = String(body.name || body.full_name || "").trim();
    const cleanPhone = String(body.phone || "").trim();

    const payload = {
      access_code: rawCode,
      full_name: cleanName || userRecord?.full_name || (isAdmin ? "الأستاذ محمد الجداوي" : `طالب (${rawCode})`),
      phone: cleanPhone || userRecord?.phone || null,
      is_admin: isAdmin || Boolean(userRecord?.is_admin),
      is_active: true,
      is_online: true,
      last_seen: new Date().toISOString(),
      devices
    };

    if (userRecord) {
      const patchRes = await fetch(
        `${supabaseUrl}/rest/v1/students_access?id=eq.${encodeURIComponent(userRecord.id)}`,
        { method: "PATCH", headers, body: JSON.stringify(payload) }
      );
      if (!patchRes.ok) {
        const errText = await patchRes.text();
        return res.status(500).json({ ok: false, message: `فشل تحديث البيانات: ${errText}` });
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
        return res.status(500).json({ ok: false, message: `فشل إنشاء السجل: ${errText}` });
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
    return res.status(500).json({ ok: false, message: err.message || "Unexpected auth error" });
  }
}
