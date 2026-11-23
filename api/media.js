import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_CODE = (process.env.ADMIN_CODE || '99999').trim().toUpperCase();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { action, adminCode, postId, section, tag, title, description, media_type, media_url, created_by } = req.body || {};
  if (String(adminCode || '').trim().toUpperCase() !== ADMIN_CODE) {
    return res.status(403).json({ ok: false, message: 'صلاحية الأدمن مطلوبة.' });
  }

  try {
    if (action === 'create') {
      if (!title || !section) {
        return res.status(400).json({ ok: false, message: 'العنوان والقسم مطلوبان.' });
      }
      const { data, error } = await supabase
        .from('platform_posts')
        .insert([{
          section: String(section).trim(),
          tag: String(tag || 'تحديث').trim(),
          title: String(title).trim(),
          description: String(description || '').trim(),
          media_type: String(media_type || 'none').trim(),
          media_url: String(media_url || '').trim(),
          created_by: String(created_by || 'الأدمن').trim()
        }])
        .select('*')
        .single();

      if (error) throw error;
      return res.status(200).json({ ok: true, post: data });
    }

    if (action === 'delete') {
      if (!postId) return res.status(400).json({ ok: false, message: 'معرف المنشور مطلوب.' });
      const { error } = await supabase
        .from('platform_posts')
        .delete()
        .eq('id', postId);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, message: 'إجراء غير معروف.' });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || 'خطأ في السيرفر' });
  }
}
