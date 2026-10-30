(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const authModal = $('#authModal');
  const mainApp = $('#mainApp');
  const loginForm = $('#loginForm');
  const genderSelect = $('#studentGender');
  const authMessage = $('#authMessage');
  const toast = $('#toast');
  const bellBtn = $('#bellBtn');
  const notifBadge = $('#notifBadge');
  const notificationsDropdown = $('#notificationsDropdown');
  const logoutBtn = $('#logoutBtn');
  const mobileMenuBtn = $('#mobileMenuBtn');
  const mobileNav = $('#mobileNav');
  const themeToggleBtn = $('#themeToggleBtn');
  const themeIcon = $('#themeIcon');
  const imageModal = $('#imageModal');
  const modalImage = $('#modalImage');
  const modalImgContainerBox = $('#modalImgContainerBox');
  const closeModalBtn = $('#closeModalBtn');
  const rotateImgBtn = $('#rotateImgBtn');
  const downloadImgBtn = $('#downloadImgBtn');
  const fullscreenImgBtn = $('#fullscreenImgBtn');
  const qualityBtns = $$('.q-btn');
  const particlesCanvas = $('#particlesCanvas');

  const STORAGE_KEY = 'tareekh_alroqi_profile_v2';
  const FAVORITES_KEY = 'tareekh_alroqi_favorites_v2';
  let toastTimer;
  let activeImgSrc = '';
  let currentRotation = 0;

  // تأثير الصوت التفاعلي (Web Audio API)
  function playClickSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, audioCtx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.06);
    } catch (_) {}
  }

  // تأثير الاهتزاز والصوت
  function triggerHaptic() {
    if (navigator.vibrate) {
      try { navigator.vibrate(35); } catch (_) {}
    }
    playClickSound();
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('button, a, select');
    if (btn) triggerHaptic();
  });

  // إدارة المفضلة والحفظ في جميع الأقسام وعند دخول القسم وفرز العناصر
  function setupFavorites() {
    let savedFavs = [];
    try {
      savedFavs = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    } catch (_) {}

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
        if (icon) {
          icon.className = isFav ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark';
        }

        try {
          let current = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
          if (isFav) {
            if (!current.includes(title)) current.push(title);
            showToast(`تم الحفظ والإعجاب بـ "${title}"`);
          } else {
            current = current.filter(t => t !== title);
            showToast(`تمت الإزالة من المحفوظات`);
          }
          localStorage.setItem(FAVORITES_KEY, JSON.stringify(current));
        } catch (_) {}
      });
    });
  }

  // البحث الفوري في كل قسم
  function setupSearch() {
    $$('.section-search-input').forEach(input => {
      input.addEventListener('input', e => {
        const query = e.target.value.trim().toLowerCase();
        const targetId = input.dataset.target;
        const container = document.getElementById(targetId);
        if (!container) return;

        const items = container.querySelectorAll('.searchable-item');
        items.forEach(item => {
          const title = (item.dataset.title || item.querySelector('h3')?.textContent || '').toLowerCase();
          const match = title.includes(query);
          item.style.display = match ? '' : 'none';
        });
      });
    });
  }

  // خلفية النقاط المتحركة (Particles)
  function initParticles() {
    if (!particlesCanvas) return;
    const ctx = particlesCanvas.getContext('2d');
    let width = particlesCanvas.width = window.innerWidth;
    let height = particlesCanvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = particlesCanvas.width = window.innerWidth;
      height = particlesCanvas.height = window.innerHeight;
    });

    const particles = Array.from({ length: 42 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      radius: Math.random() * 2 + 1
    }));

    function animate() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = document.body.classList.contains('theme-female') ? 'rgba(241,124,181,0.28)' : 'rgba(108,168,255,0.25)';
      ctx.strokeStyle = document.body.classList.contains('theme-female') ? 'rgba(241,124,181,0.08)' : 'rgba(108,168,255,0.08)';

      particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        for (let j = index + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });
      requestAnimationFrame(animate);
    }
    animate();
  }

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

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  function setAuthMessage(message = '') {
    if (authMessage) authMessage.textContent = message;
  }

  function makeSessionCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(7);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) { bytes[i] = Math.floor(Math.random() * 256); }
    }
    return 'TR-' + [...bytes].map(n => chars[n % chars.length]).join('');
  }

  function normalizePhone(phone) {
    return phone.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\s+/g, '');
  }

  function validateProfile(data) {
    const name = String(data.name || '').trim().replace(/\s+/g, ' ');
    const phone = normalizePhone(String(data.phone || '').trim());
    const allowedGrades = ['الأول الثانوي', 'الثاني الثانوي', 'الثاني الثانوي (البكالوريا)', 'الثالث الثانوي'];

    if (name.length < 5 || name.split(' ').length < 3) {
      throw new Error('اكتب الاسم الثلاثي على الأقل.');
    }
    if (!/^01[0125]\d{8}$/.test(phone)) {
      throw new Error('اكتب رقم هاتف مصري صحيحًا مكونًا من 11 رقمًا.');
    }
    if (!allowedGrades.includes(data.grade)) {
      throw new Error('اختر صفًا دراسيًا صحيحًا.');
    }
    return { name, phone, grade: data.grade, gender: data.gender };
  }

  function renderProfile(profile) {
    $('#displayName').textContent = profile.name;
    $('#displayGrade').textContent = profile.grade;
    $('#displayUniqueCode').textContent = profile.code || 'جلسة محلية';
    setTheme(profile.gender);
    if (genderSelect) genderSelect.value = profile.gender;
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
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });

    elements.forEach((el, index) => {
      if (!el.closest('#authModal')) {
        el.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
        observer.observe(el);
      }
    });
  }

  function openApp(profile) {
    renderProfile(profile);
    authModal.classList.add('is-leaving');
    setTimeout(() => {
      authModal.classList.add('hidden');
      mainApp.classList.remove('hidden');
      requestAnimationFrame(() => { mainApp.classList.add('is-ready'); });
      setupReveal();
      setupFavorites();
      setupSearch();
    }, 260);
  }

  function closeApp() {
    mainApp.classList.remove('is-ready');
    mainApp.classList.add('hidden');
    authModal.classList.remove('hidden', 'is-leaving');
    loginForm.reset();
    setTheme('male');
    setAuthMessage('');
  }

  loginForm?.addEventListener('submit', async event => {
    event.preventDefault();
    setAuthMessage('');

    const submitBtn = $('#submitBtn');
    const originalMarkup = submitBtn.innerHTML;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i><span>جارٍ تجهيز الدخول...</span>';

    try {
      const profile = validateProfile({
        name: $('#studentName').value,
        phone: $('#studentPhone').value,
        grade: $('#studentGrade').value,
        gender: genderSelect.value
      });

      const localProfile = { ...profile, code: makeSessionCode(), mode: 'local-preview' };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(localProfile)); } catch (_) {}

      openApp(localProfile);
      showToast('مرحباً بك! تم تسجيل الدخول بنجاح.');
    } catch (error) {
      setAuthMessage(error.message || 'حدث خطأ غير متوقع.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalMarkup;
    }
  });

  genderSelect?.addEventListener('change', event => {
    setTheme(event.target.value);
  });

  logoutBtn?.addEventListener('click', async () => {
    if (!confirm('هل تريد تسجيل الخروج؟')) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    closeApp();
    showToast('تم تسجيل الخروج.');
  });

  // تفاعل عرض الصورة وملء الشاشة وتنزيل الصورة الحقيقية
  document.addEventListener('click', event => {
    const btn = event.target.closest('.view-image-btn') || event.target.closest('.zoomable-image');
    if (btn) {
      activeImgSrc = btn.dataset?.img || btn.src;
      currentRotation = 0;
      if (activeImgSrc && modalImage && imageModal) {
        modalImage.src = activeImgSrc;
        modalImage.style.transform = `rotate(${currentRotation}deg)`;
        imageModal.classList.remove('hidden');
      }
    }
  });

  rotateImgBtn?.addEventListener('click', () => {
    currentRotation = (currentRotation + 90) % 360;
    if (modalImage) modalImage.style.transform = `rotate(${currentRotation}deg)`;
  });

  // زر تنزيل الصورة الحقيقية
  downloadImgBtn?.addEventListener('click', () => {
    if (!activeImgSrc) return;
    const a = document.createElement('a');
    a.href = activeImgSrc;
    a.download = 'tareekh-alroqi-image.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('جارٍ تنزيل الصورة الحقيقية...');
  });

  // زر ملء الشاشة بالكامل للعارض
  fullscreenImgBtn?.addEventListener('click', () => {
    if (modalImgContainerBox) {
      if (!document.fullscreenElement) {
        modalImgContainerBox.requestFullscreen?.().catch(() => {});
        showToast('تم التفعيل لوضع ملء الشاشة');
      } else {
        document.exitFullscreen?.();
      }
    }
  });

  qualityBtns.forEach(qBtn => {
    qBtn.addEventListener('click', () => {
      qualityBtns.forEach(b => b.classList.remove('active'));
      qBtn.classList.add('active');
      const q = qBtn.dataset.quality;
      if (modalImage) {
        if (q === '4k') {
          modalImage.style.filter = 'contrast(1.1) saturate(1.15) brightness(1.02)';
          showToast('الدقة الفائقة (4K)');
        } else if (q === 'hd') {
          modalImage.style.filter = 'contrast(1.05) saturate(1.08)';
          showToast('الجودة العالية (HD)');
        } else {
          modalImage.style.filter = 'none';
          showToast('الجودة العادية');
        }
      }
    });
  });

  const closeImageModal = () => { if (imageModal) imageModal.classList.add('hidden'); };
  closeModalBtn?.addEventListener('click', closeImageModal);
  imageModal?.addEventListener('click', event => {
    if (event.target === imageModal || event.target.classList.contains('image-modal-backdrop')) {
      closeImageModal();
    }
  });

  // الجرس والإشعارات (مطابق تماماً لما تحدده بدون زيادة)
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
    mobileMenuBtn.setAttribute('aria-expanded', String(willOpen));
    mobileMenuBtn.innerHTML = willOpen ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
  });

  $$('#mobileNav a').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.add('hidden');
      mobileMenuBtn?.setAttribute('aria-expanded', 'false');
      if (mobileMenuBtn) mobileMenuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
    });
  });

  const yearElement = $('#currentYear');
  if (yearElement) yearElement.textContent = new Date().getFullYear();

  setTheme('male');
  setupReveal();
  initParticles();
  setupFavorites();
  setupSearch();

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const profile = JSON.parse(saved);
      if (profile && profile.mode === 'local-preview' && profile.name) {
        openApp(profile);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  } catch (_) {
    localStorage.removeItem(STORAGE_KEY);
  }
})();
