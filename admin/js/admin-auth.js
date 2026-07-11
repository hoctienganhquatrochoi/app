var ADMIN_AUTH_KEY = "efkAdminAuthed";

function isAdminAuthed() {
  return window.localStorage.getItem(ADMIN_AUTH_KEY) === "yes";
}

function setAdminAuthed() {
  window.localStorage.setItem(ADMIN_AUTH_KEY, "yes");
}

function showAdminApp() {
  document.getElementById("adminLoginOverlay").style.display = "none";
  document.getElementById("adminBody").style.display = "block";
}

function showAdminLogin() {
  document.getElementById("adminLoginOverlay").style.display = "flex";
  document.getElementById("adminBody").style.display = "none";
}

async function checkAdminPassword(password) {
  var result = await supabaseClient.from("game_admin_settings").select("password").eq("id", 1).maybeSingle();
  if (result.error || !result.data) {
    return false;
  }
  return result.data.password === password;
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
  var ok = await checkAdminPassword(password);

  if (!ok) {
    statusEl.textContent = "Sai mật khẩu";
    return;
  }

  setAdminAuthed();
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
  var ok = await checkAdminPassword(current);
  if (!ok) {
    statusEl.textContent = "Sai mật khẩu hiện tại";
    return;
  }

  statusEl.textContent = "Đang lưu...";
  var result = await supabaseClient
    .from("game_admin_settings")
    .update({ password: next, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (result.error) {
    statusEl.textContent = "Lỗi lưu: " + result.error.message;
    return;
  }

  closeChangeAdminPasswordModal();
  window.alert("Đã đổi mật khẩu thành công!");
}

document.addEventListener("DOMContentLoaded", function () {
  if (isAdminAuthed()) {
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
});
