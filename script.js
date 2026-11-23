(() => {
  'use strict';

  const SUPABASE_URL = 'https://nsycpihoazhvyxykyvss.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_AbaWu56bbGhcJjL3F7DCgg_oXrWKkdj';
  const STORAGE_BUCKET = 'media';

  // الـ 500 كود المحفوظة في المنصة (10101 إلى 10600)
  const PRE_SAVED_500_CODES = Array.from({ length: 500 }, (_, i) => String(10101 + i));

  const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const authModal = $('#authModal');
  const mainApp = $('#mainApp');
  const loginForm = $('#loginForm');
  const accessCodeInput = $('#accessCode');
  const studentExtraFields = $('#studentExtraFields');
  const authMessage = $('#authMessage');
  const toast = $('#toast');
  const bellBtn = $('#bellBtn');
  const notifBadge = $('#notifBadge');
  const notificationsDropdown = $('#notificationsDropdown');
  const notificationsListContainer = $('#notificationsListContainer');
  const notifStatusText = $('#notifStatusText');
  const logoutBtn = $('#logoutBtn');
  const mobileMenuBtn = $('#mobileMenuBtn');
  const mobileNav = $('#mobileNav');
  const themeToggleBtn = $('#themeToggleBtn');
  const themeIcon = $('#themeIcon');

  // عارض الصور
  const imageModal = $('#imageModal');
  const modalImage = $('#modalImage');
  const closeModalBtn = $('#closeModalBtn');
  const rotateImgBtn = $('#rotateImgBtn');
  const downloadImgBtn = $('#downloadImgBtn');
  const particlesCanvas = $('#particlesCanvas');

  // عناصر الأدمن
  const adminNavLink = $('#adminNavLink');
  const mobileAdminLink = $('#mobileAdminLink');
  const adminPanel = $('#adminPanel');
  const adminUploadForm = $('#adminUploadForm');
  const adminUploadBtn = $('#adminUploadBtn');
  const sync500Btn = $('#sync500Btn');
  const printPdfBtn = $('#printPdfBtn');
  const adminStudentsTbody = $('#adminStudentsTbody');
  const adminSearchInput = $('#adminSearchInput');
  const adminFilterSelect = $('#adminFilterSelect');

  const SESSION_KEY = 'tareekh_alroqi_session_v4';
  const DEVICE_KEY = 'tareekh_alroqi_device_id';

  let currentSession = null;
  let allAdminStudents = [];
  let heartbeatTimer = null;
  let toastTimer;
  let activeImgSrc = '';
  let currentRotation = 0;

  function getDeviceId() {
    let id = '';
    try {
      id = localStorage.getItem(DEVICE_KEY) || '';
      if (!id) {
        id = 'DEV-' + Math.random().toString(36).slice(2, 10).toUpperCase();
        localStorage.setItem(DEVICE_KEY, id);
      }
    } catch (_) {
      id = 'DEV-TEMP';
    }
    return id;
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function setAuthMessage(message = '') {
    if (authMessage) authMessage.textContent = message;
  }

  function normalizePhone(phone) {
    return String(phone || '')
      .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/\s+/g, '');
  }

  function validateStudentInput(data) {
    const code = String(data.code || '').trim().toUpperCase();
    const name = String(data.name || '').trim().replace(/\s+/g, ' ');
    const phone = normalizePhone(String(data.phone || '').trim());

    if (!code || code.length !== 5) throw new Error('أدخل كود الدخول المكون من 5 أرقام.');
    if (name.length < 5 || name.split(' ').length < 3) throw new Error('اكتب الاسم الثلاثي على الأقل.');
    if (!/^01[0125]\d{8}$/.test(phone)) throw new Error('اكتب رقم هاتف مصري صحيحًا مكونًا من 11 رقمًا.');
    return { code, name, phone };
  }

  accessCodeInput?.addEventListener('input', () => {
    const val = accessCodeInput.value.trim().toUpperCase();
    const isAdminCode = val === '99999' || val === 'ADMIN';
    if (studentExtraFields) {
      studentExtraFields.style.opacity = isAdminCode ? '0.45' : '1';
      $$('#studentExtraFields input').forEach(el => {
        el.required = !isAdminCode;
      });
    }
  });

  themeToggleBtn?.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('theme-light');
    if (themeIcon) {
      themeIcon.className = isLight ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }
    showToast(isLight ? 'تم التبديل للوضع النهاري' : 'تم التبديل للوضع الليلي');
  });

  function renderSession(session) {
    currentSession = session;
    $('#displayName').textContent = session.full_name || 'المدير';
    $('#displayUniqueCode').textContent = session.access_code || '—';

    const isAdmin = Boolean(session.is_admin);
    adminNavLink?.classList.toggle('hidden', !isAdmin);
    mobileAdminLink?.classList.toggle('hidden', !isAdmin);
    adminPanel?.classList.toggle('hidden', !isAdmin);
  }

  function openApp(session) {
    renderSession(session);
    authModal.classList.add('hidden');
    mainApp.classList.remove('hidden');
    setupSearch();
    loadPosts();
    startHeartbeat();
    if (session.is_admin) {
      loadAdminStudents();
    }
  }

  function startHeartbeat() {
    clearInterval(heartbeatTimer);
    if (!currentSession || currentSession.is_admin) return;
    heartbeatTimer = setInterval(async () => {
      try {
        await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'heartbeat',
            code: currentSession.access_code,
            deviceId: getDeviceId()
          })
        });
      } catch (_) {}
    }, 30000);
  }

  loginForm?.addEventListener('submit', async event => {
    event.preventDefault();
    setAuthMessage('');

    const submitBtn = $('#submitBtn');
    const originalMarkup = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i><span>جارٍ التحقق...</span>';

    try {
      const rawCode = (accessCodeInput?.value || '').trim().toUpperCase();
      if (!rawCode || rawCode.length !== 5) {
        throw new Error('أدخل كود الدخول المكون من 5 أرقام.');
      }

      let payload = {
        action: 'login',
        code: rawCode,
        deviceId: getDeviceId(),
        deviceLabel: navigator.userAgent.slice(0, 60)
      };

      if (rawCode !== '99999' && rawCode !== 'ADMIN') {
        const validated = validateStudentInput({
          code: rawCode,
          name: $('#studentName')?.value,
          phone: $('#studentPhone')?.value
        });
        payload = { ...payload, ...validated };
      }

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'تعذر تسجيل الدخول.');
      }

      try { localStorage.setItem(SESSION_KEY, JSON.stringify(data.user)); } catch (_) {}
      openApp(data.user);
      showToast(data.user.is_admin ? 'مرحباً بك في لوحة تحكم الأدمن!' : 'تم تفعيل الكود والدخول بنجاح!');
    } catch (error) {
      setAuthMessage(error.message || 'حدث خطأ غير متوقع.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalMarkup;
    }
  });

  logoutBtn?.addEventListener('click', async () => {
    if (!confirm('هل تريد تسجيل الخروج؟')) return;
    clearInterval(heartbeatTimer);
    if (currentSession && !currentSession.is_admin) {
      try {
        await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'logout', code: currentSession.access_code })
        });
      } catch (_) {}
    }
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
    currentSession = null;
    mainApp.classList.add('hidden');
    authModal.classList.remove('hidden');
    loginForm.reset();
    setAuthMessage('');
    showToast('تم تسجيل الخروج.');
  });

  // تحميل المنشورات من Supabase وتفعيل التحديث اللحظي
  async function loadPosts() {
    if (!sb) return;
    const { data, error } = await sb
      .from('platform_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return;
    renderPosts(data || []);
    subscribeRealtimePosts();
  }

  function subscribeRealtimePosts() {
    if (!sb || window.__postsSub) return;
    window.__postsSub = sb
      .channel('public:platform_posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_posts' }, () => {
        loadPosts();
      })
      .subscribe();
  }

  function renderPosts(posts) {
    const learningTarget = $('#dynamicLearningGrid');
    const updatesTarget = $('#updatesGrid');
    if (!learningTarget || !updatesTarget) return;

    learningTarget.innerHTML = '';
    updatesTarget.innerHTML = '';

    if (notifBadge) notifBadge.textContent = String(posts.length);
    if (notifStatusText) {
      notifStatusText.textContent = posts.length ? `${posts.length} منشور` : 'لا توجد إشعارات';
    }
    if (notificationsListContainer) {
      notificationsListContainer.innerHTML = posts.length
        ? posts.slice(0, 6).map(p => `<p class="panel-footnote">• ${escapeHtml(p.title)}</p>`).join('')
        : '<p class="panel-footnote">لا توجد إشعارات حالياً.</p>';
    }

    posts.forEach(post => {
      const card = document.createElement('article');
      card.className = 'update-card searchable-item';
      card.dataset.title = post.title || '';

      let mediaHtml = '';
      if (post.media_type === 'image' && post.media_url) {
        mediaHtml = `
          <div class="update-art">
            <img src="${escapeAttr(post.media_url)}" alt="${escapeAttr(post.title)}" class="zoomable-image" style="width:100%;height:100%;object-fit:cover;">
            <button type="button" class="view-image-btn" data-img="${escapeAttr(post.media_url)}">
              <i class="fa-solid fa-expand"></i> عرض وتنزيل
            </button>
          </div>`;
      } else if (post.media_type === 'video' && post.media_url) {
        mediaHtml = `
          <div class="update-art" style="background:#000;">
            <video src="${escapeAttr(post.media_url)}" controls playsinline style="width:100%;height:100%;object-fit:cover;"></video>
          </div>`;
      } else if (post.media_type === 'audio' && post.media_url) {
        mediaHtml = `
          <div class="update-art" style="padding:16px;">
            <audio src="${escapeAttr(post.media_url)}" controls style="width:100%;"></audio>
          </div>`;
      } else {
        mediaHtml = `
          <div class="update-art">
            <i class="fa-solid fa-bullhorn" style="font-size:2rem;color:var(--primary);"></i>
          </div>`;
      }

      const deleteBtnHtml = currentSession?.is_admin
        ? `<button type="button" class="del-mini-btn danger" data-del-post="${escapeAttr(post.id)}"><i class="fa-solid fa-trash"></i> حذف</button>`
        : `<span>${escapeHtml(post.created_by || 'الإدارة')}</span>`;

      card.innerHTML = `
        ${mediaHtml}
        <div class="update-body">
          <span class="update-tag">${escapeHtml(post.tag || 'منشور')}</span>
          <h3>${escapeHtml(post.title)}</h3>
          <p>${escapeHtml(post.description || '')}</p>
          <div class="update-meta">
            <span><i class="fa-regular fa-clock"></i> مباشر</span>
            ${deleteBtnHtml}
          </div>
        </div>`;

      if (post.section === 'tips') {
        learningTarget.appendChild(card);
      } else {
        updatesTarget.appendChild(card);
      }
    });

    $$('[data-del-post]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postId = btn.dataset.delPost;
        if (!confirm('حذف هذا المنشور نهائياً؟')) return;
        const res = await fetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', postId, adminCode: currentSession.access_code })
        });
        if (res.ok) {
          showToast('تم حذف المنشور.');
          loadPosts();
        } else {
          showToast('تعذر حذف المنشور.');
        }
      });
    });
  }

  // نشر الوسائط من لوحة الأدمن
  adminUploadForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!currentSession?.is_admin) return;

    const section = $('#adminPostSection')?.value || 'updates';
    const mediaType = $('#adminMediaType')?.value || 'none';
    const title = ($('#adminPostTitle')?.value || '').trim();
    const description = ($('#adminPostDesc')?.value || '').trim();
    const file = $('#adminMediaFile')?.files?.[0] || null;

    if (!title) return showToast('اكتب عنوان المنشور أولاً.');

    adminUploadBtn.disabled = true;
    adminUploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>جارٍ الرفع والنشر...</span>';

    try {
      let mediaUrl = '';
      if (file && mediaType !== 'none' && sb) {
        const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const filePath = `${section}/${safeName}`;
        const { error: upErr } = await sb.storage.from(STORAGE_BUCKET).upload(filePath, file, { upsert: false });
        if (upErr) throw new Error('فشل رفع الملف: ' + upErr.message);

        const { data: pubData } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
        mediaUrl = pubData?.publicUrl || '';
      }

      const res = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          adminCode: currentSession.access_code,
          section,
          tag: section === 'video' ? 'فيديو' : section === 'tips' ? 'ملخص' : 'تحديث',
          title,
          description,
          media_type: mediaType,
          media_url: mediaUrl,
          created_by: currentSession.full_name || 'الأدمن'
        })
      });
      const out = await res.json();
      if (!res.ok || !out.ok) throw new Error(out.message || 'تعذر حفظ المنشور.');

      adminUploadForm.reset();
      showToast('تم النشر بنجاح للجميع!');
      loadPosts();
    } catch (err) {
      showToast(err.message || 'حدث خطأ أثناء النشر.');
    } finally {
      adminUploadBtn.disabled = false;
      adminUploadBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i><span>نشر الآن للجميع</span>';
    }
  });

  // تأكيد وحفظ الـ 500 كود في قاعدة البيانات
  sync500Btn?.addEventListener('click', async () => {
    if (!currentSession?.is_admin) return;
    sync500Btn.disabled = true;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync500', adminCode: currentSession.access_code })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'تعذر مزامنة الأكواد.');
      showToast('تم تأكيد وحفظ الـ 500 كود في المنصة بنجاح!');
      loadAdminStudents();
    } catch (err) {
      showToast(err.message);
    } finally {
      sync500Btn.disabled = false;
    }
  });

  // طباعة الـ 500 كود في صفحة منسقة جاهزة للحفظ PDF
  printPdfBtn?.addEventListener('click', () => {
    const codes = allAdminStudents.length
      ? allAdminStudents.map(s => ({
          code: s.access_code,
          burned: Boolean(s.full_name || (Array.isArray(s.devices) && s.devices.length > 0))
        }))
      : PRE_SAVED_500_CODES.map(c => ({ code: c, burned: false }));

    const win = window.open('', '_blank');
    if (!win) return showToast('اسمح بفتح النوافذ المنبثقة للطباعة.');

    const itemsHtml = codes
      .map(
        (item, idx) => `
        <div class="code-box ${item.burned ? 'burned' : ''}">
          <small>#${idx + 1}</small>
          <strong>${item.code}</strong>
          <span>${item.burned ? 'محروق / مستخدم' : 'متاح للتفعيل'}</span>
        </div>`
      )
      .join('');

    win.document.write(`
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>أكواد منصة تاريخ الرقي (500 كود)</title>
        <style>
          body { font-family: Tahoma, Arial, sans-serif; padding: 20px; color: #111; }
          h1 { text-align: center; margin-bottom: 6px; }
          p { text-align: center; color: #555; margin-bottom: 20px; }
          .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
          .code-box { border: 1.5px solid #222; border-radius: 8px; padding: 10px; text-align: center; page-break-inside: avoid; }
          .code-box.burned { background: #fee2e2; border-color: #b91c1c; }
          .code-box small { display: block; color: #666; font-size: 11px; }
          .code-box strong { display: block; font-size: 20px; letter-spacing: 2px; margin: 4px 0; }
          .code-box span { font-size: 11px; color: #333; }
        </style>
      </head>
      <body>
        <h1>منصة تاريخ الرُّقي — أ. محمد الجداوي</h1>
        <p>قائمة أكواد الدخول المعتمدة (500 كود) — اختر Save as PDF لحفظ الملف</p>
        <div class="grid">${itemsHtml}</div>
        <script>window.onload = () => window.print();<\/script>
      </body>
      </html>
    `);
    win.document.close();
  });

  // تحميل بيانات الأكواد والطلاب للأدمن
  async function loadAdminStudents() {
    if (!currentSession?.is_admin || !adminStudentsTbody) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listStudents', adminCode: currentSession.access_code })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) return;

      allAdminStudents = (data.students || []).filter(s => !s.is_admin);
      renderAdminTable();
    } catch (_) {}
  }

  function renderAdminTable() {
    if (!adminStudentsTbody) return;

    const burnedList = allAdminStudents.filter(
      s => Boolean(s.full_name) || (Array.isArray(s.devices) && s.devices.length > 0)
    );
    const onlineList = allAdminStudents.filter(s => Boolean(s.is_online));

    $('#kpiTotalCodes').textContent = String(allAdminStudents.length || 500);
    $('#kpiBurnedCodes').textContent = String(burnedList.length);
    $('#kpiAvailableCodes').textContent = String(Math.max((allAdminStudents.length || 500) - burnedList.length, 0));
    $('#kpiOnlineNow').textContent = String(onlineList.length);

    const searchQ = (adminSearchInput?.value || '').trim().toLowerCase();
    const filterVal = adminFilterSelect?.value || 'all';

    const filtered = allAdminStudents.filter(s => {
      const isBurned = Boolean(s.full_name) || (Array.isArray(s.devices) && s.devices.length > 0);
      if (filterVal === 'burned' && !isBurned) return false;
      if (filterVal === 'unused' && isBurned) return false;
      if (filterVal === 'online' && !s.is_online) return false;

      if (searchQ) {
        const hay = `${s.access_code || ''} ${s.full_name || ''} ${s.phone || ''}`.toLowerCase();
        if (!hay.includes(searchQ)) return false;
      }
      return true;
    });

    if (!filtered.length) {
      adminStudentsTbody.innerHTML = '<tr><td colspan="8" class="empty-cell">لا توجد نتائج مطابقة.</td></tr>';
      return;
    }

    adminStudentsTbody.innerHTML = filtered
      .map(s => {
        const devicesList = Array.isArray(s.devices) ? s.devices : [];
        const isBurned = Boolean(s.full_name) || devicesList.length > 0;
        const codeStateBadge = isBurned
          ? '<span class="badge-burned">🔥 محروق</span>'
          : '<span class="badge-unused">✅ متاح</span>';

        const devicesInfo = devicesList.length
          ? `${devicesList.length} جهاز (${devicesList.map(d => escapeHtml(typeof d === 'string' ? d : d.label || d.id)).join(' | ')})`
          : '—';

        const lastSeenStr = s.last_seen ? new Date(s.last_seen).toLocaleString('ar-EG') : '—';
        const statusHtml = s.is_online
          ? '<span class="status-badge-on">● متصل</span>'
          : '<span class="status-badge-off">○ غير متصل</span>';
        const toggleLabel = s.is_active === false ? 'تفعيل' : 'إيقاف';

        return `
          <tr>
            <td><strong>${escapeHtml(s.access_code)}</strong></td>
            <td>${codeStateBadge}</td>
            <td>${escapeHtml(s.full_name || 'لم يُستخدم بعد')}</td>
            <td>${escapeHtml(s.phone || '—')}</td>
            <td>${statusHtml}</td>
            <td>${escapeHtml(lastSeenStr)}</td>
            <td style="font-size:12px;">${devicesInfo}</td>
            <td style="display:flex;gap:6px;">
              <button type="button" class="del-mini-btn" data-toggle-code="${escapeAttr(s.access_code)}">${toggleLabel}</button>
              <button type="button" class="del-mini-btn danger" data-delete-code="${escapeAttr(s.access_code)}">حذف العضوية</button>
            </td>
          </tr>`;
      })
      .join('');

    $$('[data-toggle-code]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const code = btn.dataset.toggleCode;
        await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'toggleCode', adminCode: currentSession.access_code, targetCode: code })
        });
        showToast('تم تحديث حالة الكود.');
        loadAdminStudents();
      });
    });

    $$('[data-delete-code]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const code = btn.dataset.deleteCode;
        if (!confirm(`هل تريد حذف عضوية الكود ${code} نهائياً؟`)) return;
        const delRes = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deleteCode', adminCode: currentSession.access_code, targetCode: code })
        });
        if (delRes.ok) {
          showToast(`تم حذف العضوية (${code}) نهائياً.`);
          loadAdminStudents();
        } else {
          showToast('فشل حذف العضوية.');
        }
      });
    });
  }

  adminSearchInput?.addEventListener('input', renderAdminTable);
  adminFilterSelect?.addEventListener('change', renderAdminTable);

  function setupSearch() {
    $$('.section-search-input').forEach(input => {
      input.addEventListener('input', e => {
        const query = e.target.value.trim().toLowerCase();
        const container = document.getElementById(input.dataset.target);
        if (!container) return;
        container.querySelectorAll('.searchable-item').forEach(item => {
          const title = (item.dataset.title || item.querySelector('h3')?.textContent || '').toLowerCase();
          item.style.display = title.includes(query) ? '' : 'none';
        });
      });
    });
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }
  function escapeAttr(str) {
    return escapeHtml(str);
  }

  function initParticles() {
    if (!particlesCanvas) return;
    const ctx = particlesCanvas.getContext('2d');
    let width = (particlesCanvas.width = window.innerWidth);
    let height = (particlesCanvas.height = window.innerHeight);
    window.addEventListener('resize', () => {
      width = particlesCanvas.width = window.innerWidth;
      height = particlesCanvas.height = window.innerHeight;
    });
    const particles = Array.from({ length: 18 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: Math.random() * 2 + 1
    }));
    function animate() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(animate);
    }
    animate();
  }

  document.addEventListener('click', event => {
    const btn = event.target.closest('.view-image-btn') || event.target.closest('.zoomable-image');
    if (btn) {
      activeImgSrc = btn.dataset?.img || btn.src;
      currentRotation = 0;
      if (activeImgSrc && modalImage && imageModal) {
        modalImage.src = activeImgSrc;
        modalImage.style.transform = 'rotate(0deg)';
        imageModal.classList.remove('hidden');
      }
    }
  });

  rotateImgBtn?.addEventListener('click', () => {
    currentRotation = (currentRotation + 90) % 360;
    if (modalImage) modalImage.style.transform = `rotate(${currentRotation}deg)`;
  });

  downloadImgBtn?.addEventListener('click', () => {
    if (!activeImgSrc) return;
    const a = document.createElement('a');
    a.href = activeImgSrc;
    a.download = 'tareekh-alroqi-image.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  const closeImageModal = () => imageModal?.classList.add('hidden');
  closeModalBtn?.addEventListener('click', closeImageModal);
  imageModal?.addEventListener('click', event => {
    if (event.target === imageModal || event.target.classList.contains('image-modal-backdrop')) closeImageModal();
  });

  bellBtn?.addEventListener('click', event => {
    event.stopPropagation();
    const willOpen = notificationsDropdown.classList.contains('hidden');
    notificationsDropdown.classList.toggle('hidden', !willOpen);
    bellBtn.setAttribute('aria-expanded', String(willOpen));
  });

  document.addEventListener('click', () => {
    notificationsDropdown?.classList.add('hidden');
    bellBtn?.setAttribute('aria-expanded', 'false');
  });

  mobileMenuBtn?.addEventListener('click', event => {
    event.stopPropagation();
    const willOpen = mobileNav.classList.contains('hidden');
    mobileNav.classList.toggle('hidden', !willOpen);
    mobileMenuBtn.innerHTML = willOpen ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
  });

  const yearElement = $('#currentYear');
  if (yearElement) yearElement.textContent = new Date().getFullYear();

  initParticles();

  try {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      if (parsed && parsed.access_code) openApp(parsed);
    }
  } catch (_) {}
})();
