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

async function fetchAssignedUnitIds(studentId) {
  var result = await supabaseClient
    .from("game_assignment_access")
    .select("game_assignments!inner(unit_id, due_at)")
    .eq("student_id", studentId)
    .gte("game_assignments.due_at", new Date().toISOString());

  if (result.error || !result.data) {
    return [];
  }
  return result.data.map(function (row) { return row.game_assignments.unit_id; });
}

async function refreshCurrentStudentAccess() {
  if (!currentStudent) {
    return;
  }
  var result = await supabaseClient
    .from("game_students")
    .select("allowed_class_ids")
    .eq("id", currentStudent.id)
    .maybeSingle();

  if (result.data) {
    currentStudent.allowed_class_ids = result.data.allowed_class_ids || [];
  }
  currentStudent.assignedUnitIds = await fetchAssignedUnitIds(currentStudent.id);
  storeStudent(currentStudent);
}

function logoutStudent() {
  currentStudent = null;
  storeStudent(null);
  renderAuthArea();
  renderSidebar();
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

  currentStudent = { id: student.id, full_name: student.full_name, group_id: student.group_id, allowed_class_ids: student.allowed_class_ids || [] };
  currentStudent.assignedUnitIds = await fetchAssignedUnitIds(currentStudent.id);
  storeStudent(currentStudent);
  closeLoginModal();
  renderAuthArea();
  renderSidebar();
}

document.addEventListener("DOMContentLoaded", async function () {
  currentStudent = loadStoredStudent();
  renderAuthArea();

  if (currentStudent) {
    await refreshCurrentStudentAccess();
    renderSidebar();
  }

  document.getElementById("loginCancelBtn").addEventListener("click", closeLoginModal);
  document.getElementById("loginSubmitBtn").addEventListener("click", handleLoginSubmit);

  var passwordToggles = document.querySelectorAll(".password-toggle-btn");
  var i;
  for (i = 0; i < passwordToggles.length; i++) {
    passwordToggles[i].addEventListener("click", function () {
      var input = document.getElementById(this.getAttribute("data-target"));
      var isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      this.textContent = isHidden ? "🙈" : "👁️";
    });
  }
});
