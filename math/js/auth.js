var currentStudent = null;
var deviceCheckInterval = null;

function getDeviceId() {
  var id = window.localStorage.getItem("deviceId");
  if (!id) {
    id = "dev_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
    window.localStorage.setItem("deviceId", id);
  }
  return id;
}

async function claimDeviceSession(studentId) {
  await supabaseClient.from("game_students").update({
    active_device_id: getDeviceId(),
    active_session_at: new Date().toISOString()
  }).eq("id", studentId);
}

async function checkDeviceSessionValid() {
  if (!currentStudent) {
    return;
  }
  var result = await supabaseClient
    .from("game_students")
    .select("active_device_id")
    .eq("id", currentStudent.id)
    .maybeSingle();

  if (result.data && result.data.active_device_id && result.data.active_device_id !== getDeviceId()) {
    var name = currentStudent.full_name;
    currentStudent = null;
    storeStudent(null);
    if (deviceCheckInterval) {
      clearInterval(deviceCheckInterval);
      deviceCheckInterval = null;
    }
    renderAuthArea();
    onAuthChanged();
    window.alert("Tài khoản " + name + " vừa đăng nhập ở thiết bị khác nên đã bị đăng xuất ở đây.");
  }
}

function startDeviceSessionWatch() {
  if (deviceCheckInterval) {
    clearInterval(deviceCheckInterval);
  }
  deviceCheckInterval = setInterval(checkDeviceSessionValid, 20000);
}

function localDateKey(dateInput) {
  var d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  var yyyy = d.getFullYear();
  var mm = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : "" + (d.getMonth() + 1);
  var dd = d.getDate() < 10 ? "0" + d.getDate() : "" + d.getDate();
  return yyyy + "-" + mm + "-" + dd;
}

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
  if (deviceCheckInterval) {
    clearInterval(deviceCheckInterval);
    deviceCheckInterval = null;
  }
  renderAuthArea();
  onAuthChanged();
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
  var today = localDateKey(new Date());
  if (student.expiry_date < today) {
    statusEl.textContent = "Tài khoản đã hết hạn, liên hệ để gia hạn";
    return;
  }

  currentStudent = { id: student.id, full_name: student.full_name, group_id: student.group_id };
  storeStudent(currentStudent);
  await claimDeviceSession(currentStudent.id);
  startDeviceSessionWatch();
  closeLoginModal();
  renderAuthArea();
  onAuthChanged();
}

document.addEventListener("DOMContentLoaded", function () {
  currentStudent = loadStoredStudent();
  renderAuthArea();

  if (currentStudent) {
    checkDeviceSessionValid();
    startDeviceSessionWatch();
  }

  document.getElementById("loginCancelBtn").addEventListener("click", closeLoginModal);
  document.getElementById("loginSubmitBtn").addEventListener("click", handleLoginSubmit);

  var passwordToggle = document.querySelector(".password-toggle-btn");
  if (passwordToggle) {
    passwordToggle.addEventListener("click", function () {
      var input = document.getElementById(this.getAttribute("data-target"));
      var isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      this.textContent = isHidden ? "🙈" : "👁️";
    });
  }
});
