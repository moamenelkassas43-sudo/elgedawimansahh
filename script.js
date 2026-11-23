(() => {
  'use strict';

  const SUPABASE_URL = 'https://nsycpihoazhvyxykyvss.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_AbaWu56bbGhcJjL3F7DCgg_oXrWKkdj';
  const STORAGE_BUCKET = 'media';

  const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const authModal = $('#authModal');
  const mainApp = $('#mainApp');
  const loginForm = $('#loginForm');
  const accessCodeInput = $('#accessCode');
  const studentExtraFields = $('#studentExtraFields');
  const genderSelect = $('#studentGender');
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

  // مشغل الفيديو الأساسي
  const platformVideo = $('#platformVideo');
  const vidPlayPauseBtn = $('#vidPlayPauseBtn');
  const vidPlayIcon = $('#vidPlayIcon');
  const vidMuteBtn = $('#vidMuteBtn');
  const vidMuteIcon = $('#vidMuteIcon');
  const vidVolumeSlider = $('#vidVolumeSlider');
  const vidFullscreenBtn = $('#vidFullscreenBtn');
  const vidProgressContainer = $('#vidProgressContainer');
  const vidProgressBar = $('#vidProgressBar');
  const vidTimeDisplay = $('#vidTimeDisplay');

  // العارض
  const imageModal = $('#imageModal');
  const modalImage = $('#modalImage');
  const modalImgContainerBox = $('#modalImgContainerBox');
  const closeModalBtn = $('#closeModalBtn');
  const rotateImgBtn = $('#rotateImgBtn');
  const downloadImgBtn = $('#downloadImgBtn');
  const fullscreenImgBtn = $('#fullscreenImgBtn');
  const qualityBtns = $$('.q-btn');
  const particlesCanvas = $('#particlesCanvas');

  // عناصر الأدمن
  const adminNavLink = $('#adminNavLink');
  const mobileAdminLink = $('#mobileAdminLink');
  const adminPanel = $('#adminPanel');
  const adminUploadForm = $('#adminUploadForm');
  const adminUploadBtn = $('#adminUploadBtn');
  const generate500Btn = $('#generate500Btn');
  const exportCsvBtn = $('#exportCsvBtn');
  const adminCodesStats = $('#adminCodesStats');
  const adminStudentsTbody = $('#adminStudentsTbody');

  const SESSION_KEY = 'tareekh_alroqi_session_v3';
  const DEVICE_KEY = 'tareekh_alroqi_device_id';
  const FAVORITES_KEY = 'tareekh_alroqi_favorites_v2';

  let currentSession = null;
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
    return String(phone || '').replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\s+/g, '');
  }

  function validateStudentInput(data) {
    const code = String(data.code || '').trim().toUpperCase();
    const name = String(data.name || '').trim().replace(/\s+/g, ' ');
    const phone = normalizePhone(String(data.phone || '').trim());
    const allowedGrades = ['الأول الثانوي', 'الثاني الثانوي', 'الثاني الثانوي (البكالوريا)', 'الثالث الثانوي'];

    if (!code || code.length !== 5) throw new Error('أدخل كود الدخول المكون من 5 خانات.');
    if (name.length < 5 || name.split(' ').length < 3) throw new Error('اكتب الاسم الثلاثي على الأقل.');
    if (!/^01[0125]\d{8}$/.test(phone)) throw new Error('اكتب رقم هاتف مصري صحيحًا مكونًا من 11 رقمًا.');
    if (!allowedGrades.includes(data.grade)) throw new Error('اختر صفًا دراسيًا صحيحًا.');
    return { code, name, phone, grade: data.grade, gender: data.gender };
  }

  // عند كتابة كود الأدمن يمكن تسهيل الدخول دون إلزام حقول الطالب
  accessCodeInput?.addEventListener('input', () => {
    const val = accessCodeInput.value.trim();
    const isAdminCode = val === '99999' || val.toUpperCase() === 'ADMIN';
    if (studentExtraFields) {
      studentExtraFields.style.opacity = isAdminCode ? '0.45' : '1';
      $$('#studentExtraFields input, #studentExtraFields select').forEach(el => {
        el.required = !isAdminCode;
      });
    }
  });

  function setTheme(gender) {
    const isFemale = gender === 'female';
    document.body.classList.toggle('theme-female', isFemale);
    document.body.classList.toggle('theme-male', !isFemale);
    if (themeIcon) {
      themeIcon.className = document.body.classList.contains('theme-female') ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }
  }

  themeToggleBtn?.addEventListener('click', () => {
    const isFemale = document.body.classList.contains('theme-female');
    if (isFemale) {
      document.body.classList.remove('theme-female');
      document.body.classList.add('theme-male');
      if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
      showToast('تم التبديل للوضع الليلي');
    } else {
      document.body.classList.remove('theme-male');
      document.body.classList.add('theme-female');
      if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
      showToast('تم التبديل للوضع النهاري');
    }
  });

  function renderSession(session) {
    currentSession = session;
    $('#displayName').textContent = session.full_name || 'المدير';
    $('#displayGrade').textContent = session.is_admin ? 'إدارة المنصة' : (session.grade || '—');
    $('#displayUniqueCode').textContent = session.access_code || '—';
    setTheme(session.gender || 'male');

    const isAdmin = Boolean(session.is_admin);
    adminNavLink?.classList.toggle('hidden', !isAdmin);
    mobileAdminLink?.classList.toggle('hidden', !isAdmin);
    adminPanel?.classList.toggle('hidden', !isAdmin);
  }

  function openApp(session) {
    renderSession(session);
    authModal.classList.add('hidden');
    mainApp.classList.remove('hidden');
    mainApp.classList.add('is-ready');
    setupReveal();
    setupFavorites();
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
        throw new Error('أدخل كود الدخول المكون من 5 خانات.');
      }

      let payload = {
        action: 'login',
        code: rawCode,
        deviceId: getDeviceId(),
        deviceLabel: navigator.userAgent.slice(0, 60)
      };

      // إذا لم يكن كود أدمن واضحاً نتحقق من بيانات الطالب
      if (rawCode !== '99999' && rawCode !== 'ADMIN') {
        const validated = validateStudentInput({
          code: rawCode,
          name: $('#studentName')?.value,
          phone: $('#studentPhone')?.value,
          grade: $('#studentGrade')?.value,
          gender: genderSelect?.value || 'male'
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
      showToast(data.user.is_admin ? 'مرحباً بك في لوحة تحكم الأدمن!' : 'مرحباً بك! تم تسجيل الدخول بنجاح.');
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

  // تحميل المنشورات من Supabase وتفعيل التحديث اللحظي Realtime
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

    // إزالة البطاقات الديناميكية السابقة قبل إعادة الرسم
    $$('.dynamic-post-card').forEach(el => el.remove());

    if (notifBadge) notifBadge.textContent = String(posts.length);
    if (notifStatusText) {
      notifStatusText.textContent = posts.length ? `${posts.length} منشور مباشر` : 'لا توجد إشعارات جديدة';
    }
    if (notificationsListContainer) {
      notificationsListContainer.innerHTML = posts.length
        ? posts.slice(0, 5).map(p => `<p class="panel-footnote">• ${escapeHtml(p.title)} (${escapeHtml(p.section)})</p>`).join('')
        : '<p class="panel-footnote">لا توجد أي إشعارات مضافة حالياً.</p>';
    }

    posts.forEach(post => {
      const card = document.createElement('article');
      card.className = 'update-card reveal is-visible searchable-item dynamic-post-card';
      card.dataset.title = post.title || '';

      let mediaHtml = '';
      if (post.media_type === 'image' && post.media_url) {
        mediaHtml = `
          <div class="update-art art-news" style="padding:0;height:180px;position:relative;overflow:hidden;">
            <img src="${escapeAttr(post.media_url)}" alt="${escapeAttr(post.title)}" class="zoomable-image" style="width:100%;height:100%;object-fit:cover;display:block;">
            <button type="button" class="view-image-btn haptic-btn" data-img="${escapeAttr(post.media_url)}">
              <i class="fa-solid fa-expand"></i> عرض وتنزيل
            </button>
          </div>`;
      } else if (post.media_type === 'video' && post.media_url) {
        mediaHtml = `
          <div class="update-art art-video" style="padding:0;height:190px;position:relative;background:#000;overflow:hidden;">
            <video src="${escapeAttr(post.media_url)}" controls playsinline style="width:100%;height:100%;object-fit:cover;"></video>
          </div>`;
      } else if (post.media_type === 'audio' && post.media_url) {
        mediaHtml = `
          <div class="update-art art-tips" style="height:auto;padding:18px;">
            <i class="fa-solid fa-microphone-lines"></i>
            <audio src="${escapeAttr(post.media_url)}" controls style="width:100%;margin-top:8px;"></audio>
          </div>`;
      } else {
        mediaHtml = `
          <div class="update-art art-tips">
            <i class="fa-solid fa-bullhorn"></i><span>PLATFORM POST</span>
          </div>`;
      }

      const deleteBtnHtml = currentSession?.is_admin
        ? `<button type="button" class="del-mini-btn" data-del-post="${escapeAttr(post.id)}"><i class="fa-solid fa-trash"></i> حذف</button>`
        : `<span>${escapeHtml(post.section || '')}</span>`;

      card.innerHTML = `
        ${mediaHtml}
        <div class="update-body">
          <span class="update-tag">${escapeHtml(post.tag || post.section || 'منشور')}</span>
          <h3>${escapeHtml(post.title)}</h3>
          <p>${escapeHtml(post.description || '')}</p>
          <div class="update-meta">
            <span><i class="fa-regular fa-clock"></i> مباشر</span>
            ${deleteBtnHtml}
          </div>
        </div>`;

      if (post.section === 'updates' || post.section === 'video') {
        updatesTarget.prepend(card);
      } else {
        learningTarget.prepend(card);
      }
    });

    $$('[data-del-post]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postId = btn.dataset.delPost;
        if (!confirm('حذف هذا المنشور من المنصة؟')) return;
        const res = await fetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', postId, adminCode: currentSession.access_code })
        });
        if (res.ok) {
          showToast('تم حذف المنشور.');
          loadPosts();
        }
      });
    });
  }

  // رفع الوسائط من لوحة الأدمن إلى Supabase Storage ثم حفظ المنشور
  adminUploadForm?.addEventListener('submit', async (e) => {
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
        if (upErr) throw new Error('فشل رفع الملف على Storage: ' + upErr.message);

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
          tag: section === 'video' ? 'الفيديوهات' : section === 'tips' ? 'نصيحة' : 'الأخبار',
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
      showToast('تم النشر وظهور الوسائط للجميع فوراً!');
      loadPosts();
    } catch (err) {
      showToast(err.message || 'حدث خطأ أثناء الرفع.');
    } finally {
      adminUploadBtn.disabled = false;
      adminUploadBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i><span>نشر الآن للجميع</span>';
    }
  });

  // توليد 500 كود وتصدير CSV
  let lastGeneratedCodes = [];

  generate500Btn?.addEventListener('click', async () => {
    if (!currentSession?.is_admin) return;
    generate500Btn.disabled = true;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate500', adminCode: currentSession.access_code })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'فشل توليد الأكواد.');
      lastGeneratedCodes = data.codes || [];
      if (adminCodesStats) {
        adminCodesStats.textContent = `تم توليد ${lastGeneratedCodes.length} كود جديد بنجاح! اضغط تصدير CSV لتحميلهم.`;
      }
      showToast(`تم توليد ${lastGeneratedCodes.length} كود دخول.`);
      loadAdminStudents();
    } catch (err) {
      showToast(err.message);
    } finally {
      generate500Btn.disabled = false;
    }
  });

  exportCsvBtn?.addEventListener('click', () => {
    const list = lastGeneratedCodes.length ? lastGeneratedCodes : [];
    if (!list.length) {
      return showToast('ولّد الأكواد أولاً ثم صدّر ملف CSV.');
    }
    const csvContent = 'data:text/csv;charset=utf-8,' + ['code'].concat(list).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'tareekh-alroqi-500-codes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('تم تصدير ملف CSV.');
  });

  // عرض جدول الطلاب والهواتف وحالة الاتصال
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

      const students = (data.students || []).filter(s => !s.is_admin);
      if (!students.length) {
        adminStudentsTbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--muted);">لا يوجد طلاب مسجلون بعد.</td></tr>';
        return;
      }

      adminStudentsTbody.innerHTML = students.map(s => {
        const devicesCount = Array.isArray(s.devices) ? s.devices.length : 0;
        const lastSeenStr = s.last_seen ? new Date(s.last_seen).toLocaleString('ar-EG') : '—';
        const statusHtml = s.is_online
          ? '<span class="status-badge-on">● متصل الآن</span>'
          : '<span class="status-badge-off">○ غير متصل</span>';
        const toggleLabel = s.is_active === false ? 'تفعيل' : 'إيقاف';
        return `
          <tr>
            <td><strong>${escapeHtml(s.access_code)}</strong></td>
            <td>${escapeHtml(s.full_name || 'لم يسجل بعد')}</td>
            <td>${escapeHtml(s.phone || '—')}</td>
            <td>${escapeHtml(s.grade || '—')}</td>
            <td>${statusHtml}</td>
            <td>${escapeHtml(lastSeenStr)}</td>
            <td>${devicesCount} هاتف</td>
            <td>
              <button type="button" class="del-mini-btn" data-toggle-code="${escapeAttr(s.access_code)}">${toggleLabel}</button>
            </td>
          </tr>`;
      }).join('');

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
    } catch (_) {}
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
  function escapeAttr(str) {
    return escapeHtml(str);
  }

  // مشغل الفيديو الأساسي
  if (platformVideo) {
    const formatTime = s => `${Math.floor(s / 60)}:${Math.floor(s % 60) < 10 ? '0' : ''}${Math.floor(s % 60)}`;
    const togglePlay = () => {
      if (platformVideo.paused) {
        platformVideo.play().then(() => { if (vidPlayIcon) vidPlayIcon.className = 'fa-solid fa-pause'; }).catch(() => {});
      } else {
        platformVideo.pause();
        if (vidPlayIcon) vidPlayIcon.className = 'fa-solid fa-play';
      }
    };
    vidPlayPauseBtn?.addEventListener('click', e => { e.stopPropagation(); togglePlay(); });
    platformVideo.addEventListener('click', togglePlay);
    platformVideo.addEventListener('timeupdate', () => {
      if (!platformVideo.duration) return;
      if (vidProgressBar) vidProgressBar.style.width = `${(platformVideo.currentTime / platformVideo.duration) * 100}%`;
      if (vidTimeDisplay) vidTimeDisplay.textContent = `${formatTime(platformVideo.currentTime)} / ${formatTime(platformVideo.duration)}`;
    });
    vidProgressContainer?.addEventListener('click', e => {
      const rect = vidProgressContainer.getBoundingClientRect();
      if (platformVideo.duration) platformVideo.currentTime = ((e.clientX - rect.left) / rect.width) * platformVideo.duration;
    });
    vidMuteBtn?.addEventListener('click', e => {
      e.stopPropagation();
      platformVideo.muted = !platformVideo.muted;
      if (vidMuteIcon) vidMuteIcon.className = platformVideo.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
      if (vidVolumeSlider) vidVolumeSlider.value = platformVideo.muted ? 0 : platformVideo.volume;
    });
    vidVolumeSlider?.addEventListener('input', e => {
      e.stopPropagation();
      const val = parseFloat(e.target.value);
      platformVideo.volume = val;
      platformVideo.muted = val === 0;
      if (vidMuteIcon) vidMuteIcon.className = val === 0 ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
    });
    vidFullscreenBtn?.addEventListener('click', e => {
      e.stopPropagation();
      const cardContainer = platformVideo.closest('.update-card');
      if (!document.fullscreenElement) cardContainer?.requestFullscreen?.().catch(() => {});
      else document.exitFullscreen?.();
    });
    platformVideo.addEventListener('ended', () => { if (vidPlayIcon) vidPlayIcon.className = 'fa-solid fa-play'; });
  }

  function setupFavorites() {
    let savedFavs = [];
    try { savedFavs = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch (_) {}
    $$('.favorite-btn, .favorite-btn-absolute').forEach(btn => {
      const card = btn.closest('.feature-card, .update-card');
      const title = card?.dataset?.title || card?.querySelector('h3')?.textContent || 'عنصر';
      if (savedFavs.includes(title)) {
        btn.classList.add('is-favorite');
        const icon = btn.querySelector('i');
        if (icon) icon.className = 'fa-solid fa-bookmark';
      }
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const isFav = btn.classList.toggle('is-favorite');
        const icon = btn.querySelector('i');
        if (icon) icon.className = isFav ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark';
        showToast(isFav ? `تم الحفظ: "${title}"` : 'تمت الإزالة من المحفوظات');
      });
    });
  }

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

  function initParticles() {
    if (!particlesCanvas) return;
    const ctx = particlesCanvas.getContext('2d');
    let width = particlesCanvas.width = window.innerWidth;
    let height = particlesCanvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
      width = particlesCanvas.width = window.innerWidth;
      height = particlesCanvas.height = window.innerHeight;
    });
    const particles = Array.from({ length: 20 }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      radius: Math.random() * 2 + 1
    }));
    function animate() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = document.body.classList.contains('theme-female') ? 'rgba(241,124,181,0.22)' : 'rgba(108,168,255,0.2)';
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
      });
      requestAnimationFrame(animate);
    }
    animate();
  }

  function setupReveal() {
    const elements = $$('.reveal');
    if (!('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    elements.forEach(el => observer.observe(el));
  }

  document.addEventListener('click', event => {
    const btn = event.target.closest('.view-image-btn') || event.target.closest('.zoomable-image');
    if (btn) {
      activeImgSrc = btn.dataset?.img || btn.src;
      currentRotation = 0;
      if (activeImgSrc && modalImage && imageModal) {
        modalImage.src = activeImgSrc;
        modalImage.style.transform = `rotate(0deg)`;
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
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  });

  fullscreenImgBtn?.addEventListener('click', () => {
    if (!modalImgContainerBox) return;
    if (!document.fullscreenElement) modalImgContainerBox.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  });

  qualityBtns.forEach(qBtn => {
    qBtn.addEventListener('click', () => {
      qualityBtns.forEach(b => b.classList.remove('active'));
      qBtn.classList.add('active');
      const q = qBtn.dataset.quality;
      if (modalImage) {
        modalImage.style.filter = q === '4k' ? 'contrast(1.1) saturate(1.15)' : q === 'hd' ? 'contrast(1.05) saturate(1.08)' : 'none';
      }
    });
  });

  const closeImageModal = () => { if (imageModal) imageModal.classList.add('hidden'); };
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
  setupReveal();

  try {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      if (parsed && parsed.access_code) openApp(parsed);
    }
  } catch (_) {}
})();
