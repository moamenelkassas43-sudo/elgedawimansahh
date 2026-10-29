import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getCountFromServer
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "ضع_API_KEY_هنا",
  authDomain: "ضع_PROJECT_ID.firebaseapp.com",
  projectId: "ضع_PROJECT_ID",
  appId: "ضع_APP_ID"
};

const ADMIN_UIDS = []; // ضع Firebase UID الخاص بالمدير هنا
const $ = id => document.getElementById(id);

let auth, db, confirmation, recaptcha, mode = "login";
let currentUser = null;
let soundEnabled = true;
let toastTimer;

const loading = $("loading");
const authScreen = $("authScreen");
const appScreen = $("app");

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function sound() {
  if (!soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 660;
    gain.gain.value = 0.035;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.055);
    oscillator.onended = () => ctx.close();
  } catch (_) {}
}

function showAuth(message = "") {
  loading.classList.add("hidden");
  appScreen.classList.add("hidden");
  authScreen.classList.remove("hidden");
  $("authMessage").textContent = message;
}

function showApp() {
  loading.classList.add("hidden");
  authScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
}

function setMode(nextMode) {
  mode = nextMode;
  document.querySelectorAll(".tab").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === mode);
  });
  $("registerFields").classList.toggle("hidden", mode !== "register");
  $("studentName").required = mode === "register";
  $("grade").required = mode === "register";
  $("gender").required = mode === "register";
  $("authSubmit").textContent = mode === "register" ? "إنشاء الحساب وإرسال الكود" : "إرسال كود الدخول";
  $("authMessage").textContent = "";
}

function normalizePhone(raw) {
  let phone = raw.replace(/[\s()-]/g, "");
  if (phone.startsWith("01") && phone.length === 11) phone = "+2" + phone;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new Error("اكتب رقم الهاتف بصيغة دولية صحيحة، مثل +2010xxxxxxxx.");
  }
  return phone;
}

function firebaseReady() {
  return firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.startsWith("ضع_") &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.startsWith("ضع_") &&
    firebaseConfig.appId &&
    !firebaseConfig.appId.startsWith("ضع_");
}

function setupRecaptcha() {
  if (recaptcha) return;
  recaptcha = new RecaptchaVerifier(auth, "authSubmit", {
    size: "invisible",
    callback: () => {}
  });
}

async function submitPhone(event) {
  event.preventDefault();
  if (!firebaseReady()) {
    $("authMessage").textContent =
      "لازم تضع إعدادات Firebase أولًا، وتفعّل Phone Authentication من لوحة Firebase.";
    return;
  }

  const button = $("authSubmit");
  button.disabled = true;

  try {
    const phone = normalizePhone($("phone").value);
    const name = $("studentName").value.trim();
    const grade = $("grade").value;
    const gender = $("gender").value;

    if (mode === "register" && (!name || !grade || !gender)) {
      throw new Error("أكمل بيانات التسجيل كلها.");
    }

    setupRecaptcha();
    const verifier = await recaptcha;
    confirmation = await signInWithPhoneNumber(auth, phone, verifier);

    window.pendingStudent = { phone, name, grade, gender, mode };
    askForCode();
  } catch (error) {
    $("authMessage").textContent = error.message || "تعذر إرسال كود التحقق.";
    if (recaptcha) {
      try { await recaptcha.clear(); } catch (_) {}
      recaptcha = null;
    }
  } finally {
    button.disabled = false;
  }
}

function askForCode() {
  const old = $("otpForm");
  if (old) old.remove();

  const form = document.createElement("form");
  form.id = "otpForm";
  form.innerHTML = `
    <label for="otp">كود التحقق المرسل إلى هاتفك</label>
    <input id="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required placeholder="أدخل كود SMS">
    <button class="primary-btn" style="width:100%;margin-top:16px" type="submit">تأكيد الكود</button>
  `;
  $("phoneForm").after(form);
  $("phoneForm").classList.add("hidden");

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      const result = await confirmation.confirm($("otp").value.trim());
      const pending = window.pendingStudent;

      if (pending.mode === "register") {
        const ref = doc(db, "students", result.user.uid);
        const existing = await getDoc(ref);

        if (!existing.exists()) {
          await setDoc(ref, {
            uid: result.user.uid,
            name: pending.name,
            phone: pending.phone,
            grade: pending.grade,
            gender: pending.gender,
            createdAt: new Date().toISOString()
          });
        }
      }

      form.remove();
      $("phoneForm").classList.remove("hidden");
      showToast("تم التحقق من الهاتف بنجاح.");
    } catch (error) {
      $("authMessage").textContent = "الكود غير صحيح أو انتهت صلاحيته. حاول مرة أخرى.";
    } finally {
      button.disabled = false;
    }
  });
}

async function loadProfile(user) {
  const snapshot = await getDoc(doc(db, "students", user.uid));

  if (!snapshot.exists()) {
    showAuth("لم يتم العثور على ملف طالب لهذا الحساب. سجّل حسابًا جديدًا.");
    await signOut(auth);
    return;
  }

  const student = snapshot.data();
  $("sidebarName").textContent = student.name || "الطالب";
  $("sidebarGrade").textContent = student.grade || "طالب مسجل";
  $("homeGrade").textContent = student.grade || "—";
  $("profileName").textContent = student.name || "—";
  $("profilePhone").textContent = student.phone || user.phoneNumber || "—";
  $("profileGrade").textContent = student.grade || "—";
  $("profileGender").textContent = student.gender === "female" ? "طالبة" : "طالب";

  const isAdmin = ADMIN_UIDS.includes(user.uid);
  $("adminNav").classList.toggle("hidden", !isAdmin);

  if (isAdmin) {
    $("studentCount").textContent = "جارٍ التحميل";
    try {
      const count = await getCountFromServer(collection(db, "students"));
      $("studentCount").textContent = count.data().count;
      $("databaseStatus").textContent = "متصلة";
    } catch (_) {
      $("studentCount").textContent = "غير متاح";
      $("databaseStatus").textContent = "تعذر الاتصال";
    }
  }

  showApp();
}

function navigate(page) {
  const target = $("page-" + page);
  if (!target) return;

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  target.classList.add("active");

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  const titles = {
    home: "الرئيسية",
    profile: "حسابي الشخصي",
    lessons: "الدروس التعليمية",
    groups: "مجموعات الدراسة",
    admin: "لوحة الإدارة"
  };

  $("pageTitle").textContent = titles[page] || "منصة تاريخ الرقي";
  $("sidebar").classList.remove("open");
  sound();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindNavigation() {
  document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.page === "admin" && !ADMIN_UIDS.includes(currentUser?.uid)) {
        showToast("ليس لديك صلاحية دخول لوحة الإدارة.");
        return;
      }
      navigate(button.dataset.page);
    });
  });

  document.querySelectorAll("[data-goto]").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.goto));
  });

  $("menuToggle").addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
    sound();
  });

  $("soundToggle").addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    $("soundToggle").textContent = soundEnabled ? "🔊 الأصوات: مفعلة" : "🔇 الأصوات: متوقفة";
    if (soundEnabled) sound();
  });

  $("logoutBtn").addEventListener("click", async () => {
    if (!auth) return;
    await signOut(auth);
    showAuth("تم تسجيل الخروج.");
    showToast("تم تسجيل الخروج.");
  });

  document.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", () => setMode(button.dataset.tab));
  });

  $("phoneForm").addEventListener("submit", submitPhone);
}

async function start() {
  bindNavigation();

  if (!firebaseReady()) {
    showAuth("المنصة جاهزة للربط. أضف إعدادات Firebase لتفعيل تسجيل الهاتف وحفظ الحسابات.");
    return;
  }

  try {
    const firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);

    onAuthStateChanged(auth, async user => {
      currentUser = user;

      if (!user) {
        showAuth();
        return;
      }

      try {
        await loadProfile(user);
      } catch (error) {
        console.error(error);
        showAuth("تعذر تحميل الحساب. تحقق من اتصال قاعدة البيانات وصلاحياتها.");
      }
    });
  } catch (error) {
    console.error(error);
    showAuth("تعذر تشغيل المنصة. راجع إعدادات Firebase.");
  }
}

start();
