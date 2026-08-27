var TEACHING_GROUPS = [];
var editingGroupId = null;

async function loadTeachingGroups() {
  var result = await supabaseClient.from("game_teaching_groups").select("*").order("created_at", { ascending: true });
  TEACHING_GROUPS = result.data || [];
}

function groupNameById(groupId) {
  if (!groupId) {
    return "Học tự do (không nhóm)";
  }
  var i;
  for (i = 0; i < TEACHING_GROUPS.length; i++) {
    if (TEACHING_GROUPS[i].id === groupId) {
      return TEACHING_GROUPS[i].name;
    }
  }
  return "(chưa có nhóm)";
}

async function applyGroupDefaultsToExistingStudents(groupId, defaultClassIds) {
  if (!defaultClassIds.length) {
    return;
  }
  var result = await supabaseClient.from("game_students").select("id, allowed_class_ids").eq("group_id", groupId);
  if (result.error) {
    window.alert("Lỗi cập nhật quyền học sinh: " + result.error.message);
    return;
  }
  var students = result.data || [];
  var i;
  for (i = 0; i < students.length; i++) {
    var existing = students[i].allowed_class_ids || [];
    var merged = existing.slice();
    defaultClassIds.forEach(function (classId) {
      if (merged.indexOf(classId) === -1) {
        merged.push(classId);
      }
    });
    if (merged.length !== existing.length) {
      await supabaseClient.from("game_students").update({ allowed_class_ids: merged }).eq("id", students[i].id);
    }
  }
}

function groupById(groupId) {
  var i;
  for (i = 0; i < TEACHING_GROUPS.length; i++) {
    if (TEACHING_GROUPS[i].id === groupId) {
      return TEACHING_GROUPS[i];
    }
  }
  return null;
}

function populateTeachingGroupSelect(selectId, includeAllOption, blankLabel) {
  var select = document.getElementById(selectId);
  var previous = select.value;
  select.innerHTML = "";

  if (includeAllOption) {
    var allOpt = document.createElement("option");
    allOpt.value = "";
    allOpt.text = blankLabel || "Tất cả";
    select.appendChild(allOpt);
  }

  var i;
  for (i = 0; i < TEACHING_GROUPS.length; i++) {
    var opt = document.createElement("option");
    opt.value = TEACHING_GROUPS[i].id;
    opt.text = TEACHING_GROUPS[i].name;
    select.appendChild(opt);
  }

  if (previous && Array.prototype.some.call(select.options, function (o) { return o.value === previous; })) {
    select.value = previous;
  }
}

function populateAllGroupSelects() {
  populateTeachingGroupSelect("newStudentGroupSelect", true, "-- Học tự do (không nhóm) --");
  populateTeachingGroupSelect("studentsGroupFilter", true, "Tất cả");
  populateTeachingGroupSelect("resultsGroupFilter", true, "Tất cả");
  applyGroupDefaultClassAccess();
}

function applyGroupDefaultClassAccess() {
  var group = groupById(document.getElementById("newStudentGroupSelect").value);
  buildClassAccessChecklist(document.getElementById("newStudentClassAccessWrap"), group ? (group.default_allowed_class_ids || []) : []);
}

function populateNewTeachingGroupClassAccess() {
  buildClassAccessChecklist(document.getElementById("newTeachingGroupClassAccessWrap"), []);
}

async function refreshTeachingGroups() {
  await loadTeachingGroups();
  populateAllGroupSelects();
  renderTeachingGroupList();
  loadStudents();
}

function renderTeachingGroupList() {
  var wrap = document.getElementById("teachingGroupListWrap");
  wrap.innerHTML = "";

  if (!TEACHING_GROUPS.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Chưa có nhóm học sinh nào.";
    wrap.appendChild(empty);
    return;
  }

  var table = document.createElement("table");
  table.className = "admin-table";
  var tbody = document.createElement("tbody");

  TEACHING_GROUPS.forEach(function (group) {
    tbody.appendChild(editingGroupId === group.id ? buildGroupEditRow(group) : buildGroupRow(group));
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
}

function buildGroupRow(group) {
  var tr = document.createElement("tr");

  var nameTd = document.createElement("td");
  nameTd.textContent = group.name;
  if (group.teacher_username) {
    var teacherInfo = document.createElement("div");
    teacherInfo.className = "admin-hint";
    teacherInfo.textContent = "👩‍🏫 GV: " + group.teacher_username + " / " + (group.teacher_password || "");
    nameTd.appendChild(teacherInfo);
  }
  tr.appendChild(nameTd);

  var actionsTd = document.createElement("td");

  var editBtn = document.createElement("button");
  editBtn.className = "admin-btn-secondary";
  editBtn.type = "button";
  editBtn.textContent = "Sửa";
  editBtn.addEventListener("click", function () {
    editingGroupId = group.id;
    renderTeachingGroupList();
  });
  actionsTd.appendChild(editBtn);

  var delBtn = document.createElement("button");
  delBtn.className = "admin-btn-danger";
  delBtn.type = "button";
  delBtn.textContent = "Xóa";
  delBtn.addEventListener("click", function () {
    deleteTeachingGroup(group.id);
  });
  actionsTd.appendChild(delBtn);

  tr.appendChild(actionsTd);
  return tr;
}

function buildGroupEditRow(group) {
  var tr = document.createElement("tr");
  tr.className = "editing-row";

  var nameTd = document.createElement("td");
  var nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "admin-inline-input";
  nameInput.value = group.name;
  nameTd.appendChild(nameInput);

  var accessLabel = document.createElement("label");
  accessLabel.className = "admin-label";
  accessLabel.textContent = "Lớp mặc định mở cho nhóm này";
  nameTd.appendChild(accessLabel);

  var accessWrap = document.createElement("div");
  buildClassAccessChecklist(accessWrap, group.default_allowed_class_ids || []);
  nameTd.appendChild(accessWrap);

  var teacherLabel = document.createElement("label");
  teacherLabel.className = "admin-label";
  teacherLabel.textContent = "Tài khoản giáo viên (để trống nếu nhóm này không cần)";
  nameTd.appendChild(teacherLabel);

  var teacherRow = document.createElement("div");
  teacherRow.className = "admin-form-row";

  var teacherUsernameInput = document.createElement("input");
  teacherUsernameInput.type = "text";
  teacherUsernameInput.className = "admin-inline-input";
  teacherUsernameInput.placeholder = "Tài khoản GV";
  teacherUsernameInput.autocomplete = "off";
  teacherUsernameInput.value = group.teacher_username || "";
  teacherRow.appendChild(teacherUsernameInput);

  var teacherPasswordInput = document.createElement("input");
  teacherPasswordInput.type = "text";
  teacherPasswordInput.className = "admin-inline-input";
  teacherPasswordInput.placeholder = "Mật khẩu GV";
  teacherPasswordInput.autocomplete = "off";
  teacherPasswordInput.value = group.teacher_password || "";
  teacherRow.appendChild(teacherPasswordInput);

  nameTd.appendChild(teacherRow);

  tr.appendChild(nameTd);

  var actionsTd = document.createElement("td");

  var saveBtn = document.createElement("button");
  saveBtn.className = "admin-btn-primary";
  saveBtn.type = "button";
  saveBtn.textContent = "Lưu";
  saveBtn.addEventListener("click", async function () {
    var newName = nameInput.value.trim();
    if (!newName) {
      window.alert("Cần nhập tên nhóm học sinh");
      return;
    }
    var newDefaults = collectClassAccessChecklist(accessWrap);
    var newTeacherUsername = teacherUsernameInput.value.trim() || null;
    var newTeacherPassword = teacherPasswordInput.value.trim() || null;

    saveBtn.disabled = true;
    saveBtn.textContent = "Đang lưu...";

    var result = await supabaseClient
      .from("game_teaching_groups")
      .update({ name: newName, default_allowed_class_ids: newDefaults, teacher_username: newTeacherUsername, teacher_password: newTeacherPassword })
      .eq("id", group.id);
    if (result.error) {
      window.alert(result.error.code === "23505" ? "Tài khoản giáo viên này đã dùng cho nhóm khác, đổi tên khác." : "Lỗi lưu: " + result.error.message);
      saveBtn.disabled = false;
      saveBtn.textContent = "Lưu";
      return;
    }

    saveBtn.textContent = "Đang cập nhật học sinh...";
    await applyGroupDefaultsToExistingStudents(group.id, newDefaults);

    editingGroupId = null;
    await refreshTeachingGroups();
  });
  actionsTd.appendChild(saveBtn);

  var cancelBtn = document.createElement("button");
  cancelBtn.className = "admin-btn-danger";
  cancelBtn.type = "button";
  cancelBtn.textContent = "Hủy";
  cancelBtn.addEventListener("click", function () {
    editingGroupId = null;
    renderTeachingGroupList();
  });
  actionsTd.appendChild(cancelBtn);

  tr.appendChild(actionsTd);
  return tr;
}

async function handleAddTeachingGroup() {
  var input = document.getElementById("newTeachingGroupName");
  var name = input.value.trim();
  var statusEl = document.getElementById("teachingGroupStatus");
  var defaultAllowedClassIds = collectClassAccessChecklist(document.getElementById("newTeachingGroupClassAccessWrap"));
  var teacherUsernameInput = document.getElementById("newTeachingGroupTeacherUsername");
  var teacherPasswordInput = document.getElementById("newTeachingGroupTeacherPassword");
  var teacherUsername = teacherUsernameInput.value.trim() || null;
  var teacherPassword = teacherPasswordInput.value.trim() || null;

  if (!name) {
    window.alert("Nhập tên nhóm học sinh");
    return;
  }

  statusEl.textContent = "Đang tạo...";
  var result = await supabaseClient.from("game_teaching_groups").insert({ name: name, default_allowed_class_ids: defaultAllowedClassIds, teacher_username: teacherUsername, teacher_password: teacherPassword });

  if (result.error) {
    statusEl.textContent = result.error.code === "23505" ? "Lỗi tạo: tài khoản giáo viên này đã dùng cho nhóm khác." : "Lỗi tạo: " + result.error.message;
    return;
  }

  input.value = "";
  teacherUsernameInput.value = "";
  teacherPasswordInput.value = "";
  statusEl.textContent = "Đã tạo nhóm \"" + name + "\".";
  await refreshTeachingGroups();
}

async function deleteTeachingGroup(id) {
  var studentsResult = await supabaseClient.from("game_students").select("id", { count: "exact", head: true }).eq("group_id", id);
  if ((studentsResult.count || 0) > 0) {
    window.alert("Nhóm này còn học sinh, hãy chuyển học sinh sang nhóm khác hoặc xóa học sinh trước.");
    return;
  }

  if (!window.confirm("Xóa nhóm học sinh này?")) {
    return;
  }

  var result = await supabaseClient.from("game_teaching_groups").delete().eq("id", id);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  await refreshTeachingGroups();
}
