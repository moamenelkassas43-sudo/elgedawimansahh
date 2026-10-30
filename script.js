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
  const notificationsDropdown = $('#notificationsDropdown');
  const logoutBtn = $('#logoutBtn');
  const mobileMenuBtn = $('#mobileMenuBtn');
  const mobileNav = $('#mobileNav');
  const imageModal = $('#imageModal');
  const modalImage = $('#modalImage');
  const closeModalBtn = $('#closeModalBtn');

  const STORAGE_KEY = 'tareekh_alroqi_profile_v2';
  let toastTimer;

  const API_BASE = '';

  function setTheme(gender) {
    const isFemale = gender === 'female';
    document.body.classList.toggle('theme-female', isFemale);
    document.body.classList.toggle('theme-male', !isFemale);
  }

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
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }

    return 'TR-' + [...bytes]
      .map(number => chars[number % chars.length])
      .join('');
  }

  function normalizePhone(phone) {
    return phone
      .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
      .replace(/\s+/g, '');
  }

  function validateProfile(data) {
    const name = String(data.name || '').trim().replace(/\s+/g, ' ');
    const phone = normalizePhone(String(data.phone || '').trim());

    const allowedGrades = [
      'الأول الثانوي',
      'الثاني الثانوي',
      'الثاني الثانوي (البكالوريا)',
      'الثالث الثانوي'
    ];

    if (name.length < 5 || name.split(' ').length < 3) {
      throw new Error('اكتب الاسم الثلاثي على الأقل.');
    }

    if (name.length > 90) {
      throw new Error('الاسم أطول من المسموح.');
    }

    if (!/^01[0125]\d{8}$/.test(phone)) {
      throw new Error('اكتب رقم هاتف مصري صحيحًا مكوّنًا من 11 رقمًا.');
    }

    if (!allowedGrades.includes(data.grade)) {
      throw new Error('اختر صفًا دراسيًا صحيحًا.');
    }

    if (!['male', 'female'].includes(data.gender)) {
      throw new Error('اختر النوع بشكل صحيح.');
    }

    return {
      name,
      phone,
      grade: data.grade,
      gender: data.gender
    };
  }

  function renderProfile(profile) {
    $('#displayName').textContent = profile.name;
    $('#displayGrade').textContent = profile.grade;
    $('#displayUniqueCode').textContent = profile.code || 'جلسة محلية';
    setTheme(profile.gender);
  }

  function setupReveal() {
    const elements = $$('.reveal');

    if (!('IntersectionObserver' in window)) {
      elements.forEach(element => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -35px 0px'
    });

    elements.forEach((element, index) => {
      if (!element.closest('#authModal')) {
        element.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
        observer.observe(element);
      }
    });
  }

  function openApp(profile) {
    renderProfile(profile);
    authModal.classList.add('is-leaving');

    setTimeout(() => {
      authModal.classList.add('hidden');
      mainApp.classList.remove('hidden');

      requestAnimationFrame(() => {
        mainApp.classList.add('is-ready');
      });

      setupReveal();
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
    submitBtn.innerHTML =
      '<i class="fa-solid fa-circle-notch fa-spin"></i><span>جارٍ تجهيز الدخول...</span>';

    try {
      const profile = validateProfile({
        name: $('#studentName').value,
        phone: $('#studentPhone').value,
        grade: $('#studentGrade').value,
        gender: genderSelect.value
      });

      const localProfile = {
        ...profile,
        code: makeSessionCode(),
        mode: 'local-preview'
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localProfile));
      } catch (_) {}

      openApp(localProfile);
      showToast('تم حفظ تسجيل الدخول بنجاح.');
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
    if (!confirm('هل تريد إنهاء الجلسة الحالية وتسجيل الخروج؟')) return;

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}

    closeApp();
    showToast('تم تسجيل الخروج بنجاح.');
  });

  // تفاعل فتح وإغلاق الصورة المكبرة (Modal)
  document.addEventListener('click', event => {
    const btn = event.target.closest('.view-image-btn') || event.target.closest('.zoomable-image');
    if (btn) {
      const imgSrc = btn.dataset?.img || btn.src;
      if (imgSrc && modalImage && imageModal) {
        modalImage.src = imgSrc;
        imageModal.classList.remove('hidden');
      }
    }
  });

  const closeImageModal = () => {
    if (imageModal) imageModal.classList.add('hidden');
  };

  closeModalBtn?.addEventListener('click', closeImageModal);
  imageModal?.addEventListener('click', event => {
    if (event.target === imageModal || event.target.classList.contains('image-modal-backdrop')) {
      closeImageModal();
    }
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
    mobileMenuBtn.setAttribute('aria-expanded', String(willOpen));
    mobileMenuBtn.innerHTML = willOpen
      ? '<i class="fa-solid fa-xmark"></i>'
      : '<i class="fa-solid fa-bars"></i>';
  });

  $$('#mobileNav a').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.add('hidden');
      mobileMenuBtn?.setAttribute('aria-expanded', 'false');
      if (mobileMenuBtn) {
        mobileMenuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
      }
    });
  });

  const yearElement = $('#currentYear');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  setTheme('male');
  setupReveal();

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
