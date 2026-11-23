import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_CODE = (process.env.ADMIN_CODE || '99999').trim().toUpperCase();

function make5Code() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 5; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { action, adminCode, targetCode } = req.body || {};
  if (String(adminCode || '').trim().toUpperCase() !== ADMIN_CODE) {
    return res.status(403).json({ ok: false, message: 'صلاحية الأدمن مطلوبة.' });
  }

  try {
    if (action === 'generate500') {
      const codeSet = new Set();
      while (codeSet.size < 500) {
        codeSet.add(make5Code());
      }
      const rows = [...codeSet].map(c => ({
        access_code: c,
        is_active: true,
        is_online: false,
        devices: []
      }));

      const { error } = await supabase
        .from('students_access')
        .upsert(rows, { onConflict: 'access_code', ignoreDuplicates: true });

      if (error) throw error;
      return res.status(200).json({ ok: true, codes: [...codeSet] });
    }

    if (action === 'listStudents') {
      const { data, error } = await supabase
        .from('students_access')
        .select('*')
        .order('last_seen', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ ok: true, students: data || [] });
    }

    if (action === 'toggleCode') {
      const cleanTarget = String(targetCode || '').trim().toUpperCase();
      const { data: current, error: getErr } = await supabase
        .from('students_access')
        .select('is_active')
        .eq('access_code', cleanTarget)
        .single();
      if (getErr) throw getErr;

      const { error: updErr } = await supabase
        .from('students_access')
        .update({ is_active: current.is_active === false ? true : false })
        .eq('access_code', cleanTarget);
      if (updErr) throw updErr;

      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, message: 'إجراء غير معروف.' });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || 'خطأ في السيرفر' });
  }
}
