var ADMIN_EMAIL = "phonglan6883@gmail.com";

async function hasAdminSession() {
  var result = await supabaseClient.auth.getSession();
  return !!(result.data && result.data.session);
}

function showAdminApp() {
  document.getElementById("adminLoginOverlay").style.display = "none";
  document.getElementById("adminBody").style.display = "block";
}

function showAdminLogin() {
  document.getElementById("adminLoginOverlay").style.display = "flex";
  document.getElementById("adminBody").style.display = "none";
}

async function handleAdminLoginSubmit() {
  var pwInput = document.getElementById("adminLoginPassword");
  var statusEl = document.getElementById("adminLoginStatus");
  var password = pwInput.value;

  if (!password) {
    statusEl.textContent = "Nhập mật khẩu";
    return;
  }

  statusEl.textContent = "Đang kiểm tra...";
  var result = await supabaseClient.auth.signInWithPassword({ email: ADMIN_EMAIL, password: password });

  if (result.error) {
    statusEl.textContent = "Sai mật khẩu";
    return;
  }

  statusEl.textContent = "";
  pwInput.value = "";
  showAdminApp();
}

function openChangeAdminPasswordModal() {
  document.getElementById("currentAdminPassword").value = "";
  document.getElementById("newAdminPassword").value = "";
  document.getElementById("confirmAdminPassword").value = "";
  document.getElementById("changeAdminPasswordStatus").textContent = "";
  document.getElementById("changeAdminPasswordOverlay").style.display = "flex";
}

function closeChangeAdminPasswordModal() {
  document.getElementById("changeAdminPasswordOverlay").style.display = "none";
}

async function handleChangeAdminPasswordSubmit() {
  var current = document.getElementById("currentAdminPassword").value;
  var next = document.getElementById("newAdminPassword").value;
  var confirmNext = document.getElementById("confirmAdminPassword").value;
  var statusEl = document.getElementById("changeAdminPasswordStatus");

  if (!current || !next || !confirmNext) {
    statusEl.textContent = "Nhập đủ cả 3 ô";
    return;
  }
  if (next !== confirmNext) {
    statusEl.textContent = "Mật khẩu mới nhập lại không khớp";
    return;
  }

  statusEl.textContent = "Đang kiểm tra...";
  var checkResult = await supabaseClient.auth.signInWithPassword({ email: ADMIN_EMAIL, password: current });
  if (checkResult.error) {
    statusEl.textContent = "Sai mật khẩu hiện tại";
    return;
  }

  statusEl.textContent = "Đang lưu...";
  var result = await supabaseClient.auth.updateUser({ password: next });

  if (result.error) {
    statusEl.textContent = "Lỗi lưu: " + result.error.message;
    return;
  }

  closeChangeAdminPasswordModal();
  window.alert("Đã đổi mật khẩu thành công!");
}

document.addEventListener("DOMContentLoaded", async function () {
  var authed = await hasAdminSession();
  if (authed) {
    showAdminApp();
  } else {
    showAdminLogin();
  }

  document.getElementById("adminLoginSubmitBtn").addEventListener("click", handleAdminLoginSubmit);
  document.getElementById("adminLoginPassword").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      handleAdminLoginSubmit();
    }
  });

  document.getElementById("changeAdminPasswordBtn").addEventListener("click", openChangeAdminPasswordModal);
  document.getElementById("cancelChangeAdminPasswordBtn").addEventListener("click", closeChangeAdminPasswordModal);
  document.getElementById("submitChangeAdminPasswordBtn").addEventListener("click", handleChangeAdminPasswordSubmit);

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
