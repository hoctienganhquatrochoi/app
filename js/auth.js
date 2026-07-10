var currentStudent = null;

function loadStoredStudent() {
  var raw = window.localStorage.getItem("currentStudent");
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function storeStudent(student) {
  if (student) {
    window.localStorage.setItem("currentStudent", JSON.stringify(student));
  } else {
    window.localStorage.removeItem("currentStudent");
  }
}

function renderAuthArea() {
  var authArea = document.getElementById("authArea");
  authArea.innerHTML = "";

  if (!currentStudent) {
    var loginBtn = document.createElement("button");
    loginBtn.className = "login-btn";
    loginBtn.type = "button";
    loginBtn.textContent = "Đăng nhập học sinh";
    loginBtn.addEventListener("click", openLoginModal);
    authArea.appendChild(loginBtn);
    return;
  }

  var wrap = document.createElement("div");
  wrap.className = "student-badge";
  wrap.title = "Bấm để đăng xuất";

  var avatar = document.createElement("div");
  avatar.className = "student-avatar";
  avatar.textContent = currentStudent.full_name.trim().charAt(0).toUpperCase();
  wrap.appendChild(avatar);

  var name = document.createElement("span");
  name.className = "student-name";
  name.textContent = currentStudent.full_name;
  wrap.appendChild(name);

  wrap.addEventListener("click", function () {
    if (window.confirm("Đăng xuất khỏi tài khoản " + currentStudent.full_name + "?")) {
      logoutStudent();
    }
  });

  authArea.appendChild(wrap);
}

function openLoginModal() {
  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPin").value = "";
  document.getElementById("loginStatus").textContent = "";
  document.getElementById("loginModalOverlay").style.display = "flex";
}

function closeLoginModal() {
  document.getElementById("loginModalOverlay").style.display = "none";
}

function logoutStudent() {
  currentStudent = null;
  storeStudent(null);
  renderAuthArea();
}

async function handleLoginSubmit() {
  var username = document.getElementById("loginUsername").value.trim();
  var pin = document.getElementById("loginPin").value.trim();
  var statusEl = document.getElementById("loginStatus");

  if (!username || !pin) {
    statusEl.textContent = "Nhập đủ tài khoản và mã PIN";
    return;
  }

  statusEl.textContent = "Đang kiểm tra...";

  var result = await supabaseClient
    .from("game_students")
    .select("*")
    .eq("username", username)
    .eq("pin", pin)
    .maybeSingle();

  if (result.error || !result.data) {
    statusEl.textContent = "Sai tài khoản hoặc mã PIN";
    return;
  }

  var student = result.data;
  var today = new Date().toISOString().slice(0, 10);
  if (student.expiry_date < today) {
    statusEl.textContent = "Tài khoản đã hết hạn, liên hệ để gia hạn";
    return;
  }

  currentStudent = { id: student.id, full_name: student.full_name, class_id: student.class_id };
  storeStudent(currentStudent);
  closeLoginModal();
  renderAuthArea();
}

document.addEventListener("DOMContentLoaded", function () {
  currentStudent = loadStoredStudent();
  renderAuthArea();

  document.getElementById("loginCancelBtn").addEventListener("click", closeLoginModal);
  document.getElementById("loginSubmitBtn").addEventListener("click", handleLoginSubmit);
});
