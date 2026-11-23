import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_CODE = (process.env.ADMIN_CODE || '99999').trim().toUpperCase();

// حماية بسيطة ضد التخمين العشوائي في الذاكرة
const failedAttempts = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = failedAttempts.get(ip) || { count: 0, resetAt: now + 60000 };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60000;
  }
  if (entry.count >= 8) return false;
  failedAttempts.set(ip, entry);
  return true;
}

function recordFail(ip) {
  const now = Date.now();
  const entry = failedAttempts.get(ip) || { count: 0, resetAt: now + 60000 };
  entry.count += 1;
  failedAttempts.set(ip, entry);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const { action, code, name, phone, grade, gender, deviceId, deviceLabel } = req.body || {};
  const cleanCode = String(code || '').trim().toUpperCase();

  if (!cleanCode) {
    return res.status(400).json({ ok: false, message: 'الكود مطلوب.' });
  }

  try {
    if (action === 'heartbeat') {
      await supabase
        .from('students_access')
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq('access_code', cleanCode);
      return res.status(200).json({ ok: true });
    }

    if (action === 'logout') {
      await supabase
        .from('students_access')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('access_code', cleanCode);
      return res.status(200).json({ ok: true });
    }

    if (!checkRateLimit(ip)) {
      return res.status(429).json({ ok: false, message: 'محاولات كثيرة، انتظر دقيقة ثم أعد المحاولة.' });
    }

    // دخول الأدمن
    if (cleanCode === ADMIN_CODE) {
      return res.status(200).json({
        ok: true,
        user: {
          access_code: cleanCode,
          full_name: 'الأستاذ محمد الجداوي / المدير',
          is_admin: true,
          gender: 'male'
        }
      });
    }

    // البحث عن الكود في جدول الأكواد/الطلاب
    const { data: existing, error: findErr } = await supabase
      .from('students_access')
      .select('*')
      .eq('access_code', cleanCode)
      .maybeSingle();

    if (findErr) throw findErr;

    if (!existing) {
      recordFail(ip);
      return res.status(401).json({ ok: false, message: 'الكود غير صحيح أو غير مسجل.' });
    }

    if (existing.is_active === false) {
      return res.status(403).json({ ok: false, message: 'تم إيقاف هذا الكود بواسطة الإدارة.' });
    }

    // تحديث قائمة الأجهزة (الهواتف) التي دخل منها الطالب
    const currentDevices = Array.isArray(existing.devices) ? existing.devices : [];
    const devId = String(deviceId || 'unknown-device');
    const alreadyHasDev = currentDevices.some(d => d && d.id === devId);
    const updatedDevices = alreadyHasDev
      ? currentDevices.map(d => (d.id === devId ? { ...d, lastUsed: new Date().toISOString() } : d))
      : [...currentDevices, { id: devId, label: String(deviceLabel || 'هاتف'), firstUsed: new Date().toISOString() }];

    const updatePayload = {
      is_online: true,
      last_seen: new Date().toISOString(),
      devices: updatedDevices
    };

    // تسجيل بيانات الطالب عند أول دخول أو تحديثها إذا لم تكن مسجلة
    if (!existing.full_name && name) {
      updatePayload.full_name = String(name).trim();
      updatePayload.phone = String(phone || '').trim();
      updatePayload.grade = String(grade || '').trim();
      updatePayload.gender = gender === 'female' ? 'female' : 'male';
    }

    const { data: updatedUser, error: updErr } = await supabase
      .from('students_access')
      .update(updatePayload)
      .eq('access_code', cleanCode)
      .select('*')
      .single();

    if (updErr) throw updErr;

    return res.status(200).json({
      ok: true,
      user: { ...updatedUser, is_admin: false }
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || 'خطأ في السيرفر' });
  }
}
