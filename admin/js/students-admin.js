function populateClassSelect(selectId) {
  var select = document.getElementById(selectId || "studentClassSelect");
  select.innerHTML = "";
  var i;
  for (i = 0; i < DATA.classes.length; i++) {
    var opt = document.createElement("option");
    opt.value = DATA.classes[i].id;
    opt.text = DATA.classes[i].name;
    select.appendChild(opt);
  }
}

function classNameById(classId) {
  var i;
  for (i = 0; i < DATA.classes.length; i++) {
    if (DATA.classes[i].id === classId) {
      return DATA.classes[i].name;
    }
  }
  return classId;
}

function parseISODate(dateStr) {
  var parts = dateStr.split("-");
  return { y: parseInt(parts[0], 10), m: parseInt(parts[1], 10), d: parseInt(parts[2], 10) };
}

function formatISODate(y, m, d) {
  var mm = m < 10 ? "0" + m : "" + m;
  var dd = d < 10 ? "0" + d : "" + d;
  return y + "-" + mm + "-" + dd;
}

function todayStr() {
  var d = new Date();
  return formatISODate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function addYears(dateStr, years) {
  var p = parseISODate(dateStr);
  var d = new Date(Date.UTC(p.y + years, p.m - 1, p.d));
  return formatISODate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function daysUntil(dateStr) {
  var now = new Date();
  var todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  var p = parseISODate(dateStr);
  var targetUTC = Date.UTC(p.y, p.m - 1, p.d);
  var diffMs = targetUTC - todayUTC;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

async function loadStudents() {
  var wrap = document.getElementById("studentsTableWrap");
  wrap.textContent = "Đang tải...";

  var result = await supabaseClient
    .from("game_students")
    .select("*")
    .order("expiry_date", { ascending: true });

  if (result.error) {
    wrap.textContent = "Lỗi tải dữ liệu: " + result.error.message;
    return;
  }

  renderStudentsTable(result.data);
}

var currentStudentRows = [];
var editingStudentId = null;

function renderStudentsTable(rows) {
  currentStudentRows = rows;
  var wrap = document.getElementById("studentsTableWrap");
  wrap.innerHTML = "";

  if (!rows.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Chưa có tài khoản học sinh nào.";
    wrap.appendChild(empty);
    return;
  }

  var table = document.createElement("table");
  table.className = "admin-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  var headers = ["Tên", "Lớp", "Tài khoản", "Ngày bắt đầu", "Hạn dùng", "Trạng thái", ""];
  var i;
  for (i = 0; i < headers.length; i++) {
    var th = document.createElement("th");
    th.textContent = headers[i];
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  for (i = 0; i < rows.length; i++) {
    tbody.appendChild(buildStudentRow(rows[i]));
  }
  table.appendChild(tbody);

  wrap.appendChild(table);
}

function buildStudentRow(row) {
  if (editingStudentId === row.id) {
    return buildStudentEditRow(row);
  }

  var tr = document.createElement("tr");
  tr.appendChild(makeTd(row.full_name));
  tr.appendChild(makeTd(classNameById(row.class_id)));
  tr.appendChild(makeTd(row.username));
  tr.appendChild(makeTd(row.start_date));
  tr.appendChild(makeTd(row.expiry_date));

  var remaining = daysUntil(row.expiry_date);
  var statusTd = document.createElement("td");
  var badge = document.createElement("span");
  if (remaining < 0) {
    badge.className = "status-badge status-expired";
    badge.textContent = "Đã hết hạn";
  } else if (remaining <= 30) {
    badge.className = "status-badge status-soon";
    badge.textContent = "Sắp hết hạn (" + remaining + " ngày)";
  } else {
    badge.className = "status-badge status-active";
    badge.textContent = "Còn hạn (" + remaining + " ngày)";
  }
  statusTd.appendChild(badge);
  tr.appendChild(statusTd);

  var actionsTd = document.createElement("td");

  var editBtn = document.createElement("button");
  editBtn.className = "admin-btn-secondary";
  editBtn.type = "button";
  editBtn.textContent = "Sửa";
  editBtn.addEventListener("click", function () {
    editingStudentId = row.id;
    renderStudentsTable(currentStudentRows);
  });
  actionsTd.appendChild(editBtn);

  var renewBtn = document.createElement("button");
  renewBtn.className = "admin-btn-primary";
  renewBtn.type = "button";
  renewBtn.textContent = "Gia hạn +1 năm";
  renewBtn.addEventListener("click", function () {
    renewStudent(row);
  });
  actionsTd.appendChild(renewBtn);

  var delBtn = document.createElement("button");
  delBtn.className = "admin-btn-danger";
  delBtn.type = "button";
  delBtn.textContent = "Xóa";
  delBtn.addEventListener("click", function () {
    deleteStudent(row.id);
  });
  actionsTd.appendChild(delBtn);

  tr.appendChild(actionsTd);
  return tr;
}

function makeInlineInputTd(value) {
  var td = document.createElement("td");
  var input = document.createElement("input");
  input.type = "text";
  input.value = value || "";
  input.className = "admin-inline-input";
  td.appendChild(input);
  td.inputEl = input;
  return td;
}

function buildStudentEditRow(row) {
  var tr = document.createElement("tr");
  tr.className = "editing-row";

  var nameTd = makeInlineInputTd(row.full_name);
  tr.appendChild(nameTd);

  var classTd = document.createElement("td");
  var classSelect = document.createElement("select");
  classSelect.className = "admin-inline-input";
  var i;
  for (i = 0; i < DATA.classes.length; i++) {
    var opt = document.createElement("option");
    opt.value = DATA.classes[i].id;
    opt.text = DATA.classes[i].name;
    if (DATA.classes[i].id === row.class_id) {
      opt.selected = true;
    }
    classSelect.appendChild(opt);
  }
  classTd.appendChild(classSelect);
  tr.appendChild(classTd);

  var usernameTd = makeInlineInputTd(row.username);
  tr.appendChild(usernameTd);

  var pinTd = makeInlineInputTd(row.pin);
  tr.appendChild(pinTd);

  tr.appendChild(makeTd(row.start_date));
  tr.appendChild(makeTd(row.expiry_date));

  var actionsTd = document.createElement("td");

  var saveBtn = document.createElement("button");
  saveBtn.className = "admin-btn-primary";
  saveBtn.type = "button";
  saveBtn.textContent = "Lưu";

  var cancelBtn = document.createElement("button");
  cancelBtn.className = "admin-btn-danger";
  cancelBtn.type = "button";
  cancelBtn.textContent = "Hủy";
  cancelBtn.addEventListener("click", function () {
    editingStudentId = null;
    renderStudentsTable(currentStudentRows);
  });

  saveBtn.addEventListener("click", async function () {
    var newName = nameTd.inputEl.value.trim();
    var newUsername = usernameTd.inputEl.value.trim();
    var newPin = pinTd.inputEl.value.trim();
    var newClassId = classSelect.value;

    if (!newName || !newUsername || !newPin) {
      window.alert("Họ tên, Tài khoản, Mã PIN không được để trống");
      return;
    }

    saveBtn.disabled = true;
    cancelBtn.disabled = true;
    saveBtn.textContent = "Đang lưu...";

    var result = await supabaseClient
      .from("game_students")
      .update({
        full_name: newName,
        class_id: newClassId,
        username: newUsername,
        pin: newPin
      })
      .eq("id", row.id);

    if (result.error) {
      window.alert("Lỗi lưu: " + result.error.message);
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
      saveBtn.textContent = "Lưu";
      return;
    }

    editingStudentId = null;
    loadStudents();
  });

  actionsTd.appendChild(saveBtn);
  actionsTd.appendChild(cancelBtn);
  tr.appendChild(actionsTd);

  return tr;
}

async function renewStudent(row) {
  var today = todayStr();
  var base = row.expiry_date > today ? row.expiry_date : today;
  var newExpiry = addYears(base, 1);

  var result = await supabaseClient
    .from("game_students")
    .update({ expiry_date: newExpiry })
    .eq("id", row.id);

  if (result.error) {
    window.alert("Lỗi gia hạn: " + result.error.message);
    return;
  }
  loadStudents();
}

async function deleteStudent(id) {
  if (!window.confirm("Xóa tài khoản học sinh này?")) {
    return;
  }
  var result = await supabaseClient.from("game_students").delete().eq("id", id);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  loadStudents();
}

async function handleAddStudent(e) {
  e.preventDefault();

  var fullName = document.getElementById("newStudentName").value.trim();
  var classId = document.getElementById("studentClassSelect").value;
  var username = document.getElementById("newStudentUsername").value.trim();
  var pin = document.getElementById("newStudentPin").value.trim();

  if (!fullName || !username || !pin) {
    window.alert("Cần nhập đủ Họ tên, Tài khoản, Mã PIN");
    return;
  }

  var start = todayStr();
  var expiry = addYears(start, 1);

  var result = await supabaseClient.from("game_students").insert({
    full_name: fullName,
    class_id: classId,
    username: username,
    pin: pin,
    start_date: start,
    expiry_date: expiry
  });

  if (result.error) {
    window.alert("Lỗi tạo tài khoản: " + result.error.message);
    return;
  }

  document.getElementById("addStudentForm").reset();
  loadStudents();
}
