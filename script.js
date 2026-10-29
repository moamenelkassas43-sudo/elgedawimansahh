"use strict";

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const loginSection = document.getElementById("loginSection");
    const dashboardSection = document.getElementById("dashboardSection");
    const logoutButton = document.getElementById("logoutButton");
    const studentNameInput = document.getElementById("studentName");
    const studentGradeSelect = document.getElementById("studentGrade");
    const formError = document.getElementById("formError");
    const dashboardStudentName = document.getElementById("dashboardStudentName");
    const dashboardStudentInfo = document.getElementById("dashboardStudentInfo");
    const toast = document.getElementById("toast");

    const STORAGE_KEY = "tareekhAlroqiStudent";
    let toastTimer;

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(toastTimer);

        toastTimer = setTimeout(function () {
            toast.classList.remove("show");
        }, 2800);
    }

    function showError(message) {
        formError.textContent = message;
        formError.classList.remove("hidden");
    }

    function clearError() {
        formError.textContent = "";
        formError.classList.add("hidden");
    }

    function getSelectedGender() {
        const selected = document.querySelector('input[name="studentGender"]:checked');
        return selected ? selected.value : "";
    }

    function setGender(gender) {
        document.body.classList.toggle("theme-female", gender === "female");
    }

    function saveStudent(student) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(student));
            return true;
        } catch (error) {
            showToast("تعذر حفظ البيانات على هذا الجهاز.");
            return false;
        }
    }

    function readStudent() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) {
                return null;
            }

            const student = JSON.parse(saved);

            if (
                !student ||
                typeof student.name !== "string" ||
                typeof student.grade !== "string" ||
                !["male", "female"].includes(student.gender)
            ) {
                localStorage.removeItem(STORAGE_KEY);
                return null;
            }

            return student;
        } catch (error) {
            return null;
        }
    }

    function showDashboard(student) {
        dashboardStudentName.textContent = student.name;
        dashboardStudentInfo.textContent = student.grade;
        setGender(student.gender);

        loginSection.classList.add("hidden");
        dashboardSection.classList.remove("hidden");
        logoutButton.classList.remove("hidden");
    }

    function showLogin() {
        dashboardSection.classList.add("hidden");
        loginSection.classList.remove("hidden");
        logoutButton.classList.add("hidden");
        setGender("");
        clearError();
    }

    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();
        clearError();

        const name = studentNameInput.value.trim();
        const grade = studentGradeSelect.value;
        const gender = getSelectedGender();

        if (name.length < 2) {
            showError("من فضلك اكتب اسمك بصورة صحيحة.");
            studentNameInput.focus();
            return;
        }

        if (!grade) {
            showError("من فضلك اختر الصف الدراسي.");
            studentGradeSelect.focus();
            return;
        }

        if (!gender) {
            showError("من فضلك اختر طالب أو طالبة.");
            return;
        }

        const student = {
            name: name,
            grade: grade,
            gender: gender
        };

        saveStudent(student);
        showDashboard(student);
        showToast("أهلًا بك في منصة تاريخ الرقي.");
    });

    logoutButton.addEventListener("click", function () {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            showToast("تعذر مسح بيانات الدخول المحفوظة.");
        }

        loginForm.reset();
        showLogin();
        studentNameInput.focus();
        showToast("تم تسجيل الخروج.");
    });

    document.querySelectorAll('input[name="studentGender"]').forEach(function (input) {
        input.addEventListener("change", function () {
            setGender(input.value);
        });
    });

    const savedStudent = readStudent();

    if (savedStudent) {
        showDashboard(savedStudent);
    } else {
        showLogin();
    }
});
