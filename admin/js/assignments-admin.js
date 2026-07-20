var ASSIGNMENT_ACTIVITY_LABELS = {
  "quiz": "Quiz",
  "missing-letter": "Khuyết chữ cái",
  "typing-hint": "Đánh máy có gợi ý",
  "typing-blank": "Đánh máy không gợi ý",
  "flip-card": "Thẻ lật",
  "free-typing-hint": "Nghe - Đánh máy (key)",
  "free-typing-blank": "Nghe đánh máy không key",
  "free-typing-audio": "Nghe - Đánh máy",
  "grammar-mcq": "Trắc nghiệm ngữ pháp",
  "grammar-typing": "Viết câu trả lời",
  "grammar-matching": "Nối câu",
  "grammar-dragfill": "Điền từ vào chỗ trống",
  "photo-quiz": "Đọc/Nghe theo ảnh"
};

var ASSIGNMENT_BATCH_TABLES = {
  "grammar-mcq": "game_grammar_mcq",
  "grammar-typing": "game_grammar_typing",
  "grammar-matching": "game_grammar_matching",
  "grammar-dragfill": "game_grammar_dragfill",
  "photo-quiz": "game_photo_quiz_questions"
};

function mapActivityToAssignmentType(activity) {
  if (activity.type === "typing") {
    return activity.mode === "hint" ? "typing-hint" : "typing-blank";
  }
  if (activity.type === "free-typing") {
    return "free-typing-" + activity.mode;
  }
  if (ASSIGNMENT_ACTIVITY_LABELS[activity.type] !== undefined) {
    return activity.type;
  }
  return null;
}

function unitBreadcrumbLabel(unitId) {
  var unit = findUnitById(unitId);
  if (!unit) {
    return "";
  }
  var subject = findSubjectById(unit.subject_id);
  var cls = subject ? findClassById(subject.class_id) : null;
  var parts = [];
  if (cls) {
    parts.push(cls.name);
  }
  if (subject) {
    parts.push(subjectDisplayName(subject));
  }
  parts.push(unitDisplayName(unit));
  return parts.join(" › ");
}

var quickAssignActivity = null;

function populateQuickAssignGroupSelect() {
  var select = document.getElementById("quickAssignGroupSelect");
  select.innerHTML = "";
  TEACHING_GROUPS.forEach(function (g) {
    var opt = document.createElement("option");
    opt.value = g.id;
    opt.text = g.name;
    select.appendChild(opt);
  });
}

function openQuickAssignModal(activity) {
  var activityType = mapActivityToAssignmentType(activity);
  if (!activityType) {
    return;
  }
  quickAssignActivity = activity;
  document.getElementById("quickAssignActivityLabel").textContent = activity.name;
  populateQuickAssignGroupSelect();
  document.getElementById("quickAssignDueAt").value = "";
  document.getElementById("quickAssignStatus").textContent = "";
  document.getElementById("quickAssignModalOverlay").style.display = "flex";
}

function closeQuickAssignModal() {
  document.getElementById("quickAssignModalOverlay").style.display = "none";
  quickAssignActivity = null;
}

async function handleQuickAssignSubmit() {
  if (!quickAssignActivity) {
    return;
  }
  var groupId = document.getElementById("quickAssignGroupSelect").value;
  var dueAtLocal = document.getElementById("quickAssignDueAt").value;
  var statusEl = document.getElementById("quickAssignStatus");

  if (!groupId) {
    statusEl.textContent = "Chọn 1 Nhóm học sinh";
    return;
  }
  if (!dueAtLocal) {
    statusEl.textContent = "Chọn hạn nộp";
    return;
  }

  statusEl.textContent = "Đang giao bài...";

  var unitId = currentToggleUnitId;
  var activityType = mapActivityToAssignmentType(quickAssignActivity);
  var setName = quickAssignActivity.setName || null;
  var activityLabel = ASSIGNMENT_ACTIVITY_LABELS[activityType] + (setName ? " (" + setName + ")" : "");

  var result = await supabaseClient.from("game_assignments").insert({
    group_id: groupId,
    unit_id: unitId,
    activity_type: activityType,
    set_name: setName,
    activity_name: unitBreadcrumbLabel(unitId) + " – " + activityLabel,
    due_at: new Date(dueAtLocal).toISOString()
  }).select().single();

  if (result.error) {
    statusEl.textContent = "Lỗi giao bài: " + result.error.message;
    return;
  }

  var studentsResult = await supabaseClient.from("game_students").select("id").eq("group_id", groupId);
  var studentIds = (studentsResult.data || []).map(function (s) { return s.id; });
  if (studentIds.length) {
    var accessRows = studentIds.map(function (id) {
      return { assignment_id: result.data.id, student_id: id };
    });
    var accessResult = await supabaseClient.from("game_assignment_access").insert(accessRows);
    if (accessResult.error) {
      statusEl.textContent = "Đã giao bài nhưng lỗi mở khóa cho học sinh: " + accessResult.error.message;
      return;
    }
  }

  statusEl.textContent = "Đã giao bài cho " + studentIds.length + " học sinh trong nhóm ✓";
  setTimeout(closeQuickAssignModal, 1200);
}

async function updateAssignmentSetNameField() {
  var unitId = document.getElementById("assignmentUnitSelect").value;
  var activityType = document.getElementById("assignmentActivitySelect").value;
  var field = document.getElementById("assignmentSetNameField");
  var select = document.getElementById("assignmentSetNameSelect");
  var table = ASSIGNMENT_BATCH_TABLES[activityType];

  if (!table || !unitId) {
    field.style.display = "none";
    select.innerHTML = "";
    return;
  }

  field.style.display = "";
  select.innerHTML = "";
  var loadingOpt = document.createElement("option");
  loadingOpt.text = "Đang tải...";
  select.appendChild(loadingOpt);

  var result = await supabaseClient.from(table).select("set_name").eq("unit_id", unitId);
  var names = [];
  var seen = {};
  (result.data || []).forEach(function (row) {
    if (!seen[row.set_name]) {
      seen[row.set_name] = true;
      names.push(row.set_name);
    }
  });

  select.innerHTML = "";
  if (!names.length) {
    var emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.text = "Unit này chưa có bài nào cho dạng này";
    select.appendChild(emptyOpt);
    return;
  }

  names.forEach(function (name) {
    var opt = document.createElement("option");
    opt.value = name;
    opt.text = name;
    select.appendChild(opt);
  });
}

var ALL_UNITS_FLAT = [];

function buildAllUnitsFlat() {
  ALL_UNITS_FLAT = [];
  var c, s, u;
  for (c = 0; c < DATA.classes.length; c++) {
    var cls = DATA.classes[c];
    var subjects = DATA.subjectsByClass[cls.id] || [];
    for (s = 0; s < subjects.length; s++) {
      for (u = 0; u < subjects[s].units.length; u++) {
        var unit = subjects[s].units[u];
        ALL_UNITS_FLAT.push({
          id: unit.id,
          label: cls.name + " › " + subjects[s].name + " › " + unitDisplayName(unit)
        });
      }
    }
  }
}

function populateSearchableUnitSelect(searchInputId, selectId) {
  buildAllUnitsFlat();

  var search = (document.getElementById(searchInputId).value || "").trim().toLowerCase();
  var select = document.getElementById(selectId);
  var previous = select.value;
  select.innerHTML = "";

  var filtered = search
    ? ALL_UNITS_FLAT.filter(function (u) { return u.label.toLowerCase().indexOf(search) !== -1; })
    : ALL_UNITS_FLAT;

  if (!filtered.length) {
    var hint = document.createElement("option");
    hint.value = "";
    hint.text = "Không tìm thấy Unit nào";
    select.appendChild(hint);
    return;
  }

  var i;
  for (i = 0; i < filtered.length; i++) {
    var opt = document.createElement("option");
    opt.value = filtered[i].id;
    opt.text = filtered[i].label;
    select.appendChild(opt);
  }

  if (previous && Array.prototype.some.call(select.options, function (o) { return o.value === previous; })) {
    select.value = previous;
  }
}

function populateAssignmentUnitSelect() {
  populateSearchableUnitSelect("assignmentUnitSearch", "assignmentUnitSelect");
}

function setAssignmentStatus(text) {
  document.getElementById("assignmentStatus").textContent = text || "";
}

async function populateAssignmentStudentAccess() {
  var groupId = document.getElementById("studentsGroupFilter").value;
  var wrap = document.getElementById("assignmentStudentAccessWrap");
  wrap.innerHTML = "";

  if (!groupId) {
    return;
  }

  var result = await supabaseClient
    .from("game_students")
    .select("id, full_name")
    .eq("group_id", groupId)
    .order("full_name", { ascending: true });

  (result.data || []).forEach(function (student) {
    var row = document.createElement("div");
    row.className = "admin-toggle-item";

    var label = document.createElement("label");
    label.className = "admin-toggle-item-label";

    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = student.id;
    checkbox.checked = true;
    label.appendChild(checkbox);

    var text = document.createElement("span");
    text.textContent = student.full_name;
    label.appendChild(text);

    row.appendChild(label);
    wrap.appendChild(row);
  });
}

function formatDueAt(iso) {
  var d = new Date(iso);
  var dd = d.getDate() < 10 ? "0" + d.getDate() : "" + d.getDate();
  var mm = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : "" + (d.getMonth() + 1);
  var hh = d.getHours() < 10 ? "0" + d.getHours() : "" + d.getHours();
  var mi = d.getMinutes() < 10 ? "0" + d.getMinutes() : "" + d.getMinutes();
  return hh + ":" + mi + " " + dd + "/" + mm + "/" + d.getFullYear();
}

async function handleAddAssignment() {
  var groupId = document.getElementById("studentsGroupFilter").value;
  var unitId = document.getElementById("assignmentUnitSelect").value;
  var activityType = document.getElementById("assignmentActivitySelect").value;
  var dueAtLocal = document.getElementById("assignmentDueAt").value;
  var isBatchType = !!ASSIGNMENT_BATCH_TABLES[activityType];
  var setName = isBatchType ? document.getElementById("assignmentSetNameSelect").value : null;

  if (!groupId) {
    window.alert("Chọn 1 Nhóm học sinh cụ thể ở ô \"Lọc theo Nhóm học sinh\" bên trên trước");
    return;
  }
  if (!unitId) {
    window.alert("Chọn 1 Unit để giao bài");
    return;
  }
  if (isBatchType && !setName) {
    window.alert("Chọn 1 bài cụ thể ở ô \"Chọn bài\"");
    return;
  }
  if (!dueAtLocal) {
    window.alert("Chọn hạn nộp");
    return;
  }

  var unitSelect = document.getElementById("assignmentUnitSelect");
  var unitLabel = unitSelect.options[unitSelect.selectedIndex].text;
  var activityLabel = ASSIGNMENT_ACTIVITY_LABELS[activityType] + (setName ? " (" + setName + ")" : "");
  var presentStudentIds = Array.prototype.map.call(
    document.querySelectorAll("#assignmentStudentAccessWrap input[type=checkbox]:checked"),
    function (cb) { return cb.value; }
  );

  setAssignmentStatus("Đang giao bài...");

  var result = await supabaseClient.from("game_assignments").insert({
    group_id: groupId,
    unit_id: unitId,
    activity_type: activityType,
    set_name: setName,
    activity_name: unitLabel + " – " + activityLabel,
    due_at: new Date(dueAtLocal).toISOString()
  }).select().single();

  if (result.error) {
    setAssignmentStatus("Lỗi giao bài: " + result.error.message);
    return;
  }

  if (presentStudentIds.length) {
    var accessRows = presentStudentIds.map(function (studentId) {
      return { assignment_id: result.data.id, student_id: studentId };
    });
    var accessResult = await supabaseClient.from("game_assignment_access").insert(accessRows);
    if (accessResult.error) {
      setAssignmentStatus("Đã giao bài nhưng lỗi mở khóa cho học sinh: " + accessResult.error.message);
      loadAssignmentList();
      return;
    }
  }

  setAssignmentStatus("Đã giao bài và mở bài cho " + presentStudentIds.length + " học sinh có mặt.");
  document.getElementById("assignmentDueAt").value = "";
  loadAssignmentList();
}

async function loadAssignmentList() {
  var groupId = document.getElementById("studentsGroupFilter").value;
  var wrap = document.getElementById("assignmentListWrap");

  if (!groupId) {
    wrap.innerHTML = "";
    return;
  }

  wrap.textContent = "Đang tải...";

  var result = await supabaseClient
    .from("game_assignments")
    .select("*")
    .eq("group_id", groupId)
    .order("due_at", { ascending: true });

  if (result.error) {
    wrap.textContent = "Lỗi tải dữ liệu: " + result.error.message;
    return;
  }

  renderAssignmentList(result.data);
}

function renderAssignmentList(rows) {
  var wrap = document.getElementById("assignmentListWrap");
  wrap.innerHTML = "";

  if (!rows.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Nhóm này chưa được giao bài kiểm tra nào.";
    wrap.appendChild(empty);
    return;
  }

  var table = document.createElement("table");
  table.className = "admin-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  var headers = ["Bài kiểm tra", "Hạn nộp", ""];
  var i;
  for (i = 0; i < headers.length; i++) {
    var th = document.createElement("th");
    th.textContent = headers[i];
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  var now = new Date();
  for (i = 0; i < rows.length; i++) {
    var row = rows[i];
    var tr = document.createElement("tr");

    var nameTd = document.createElement("td");
    nameTd.textContent = row.activity_name;
    tr.appendChild(nameTd);

    var dueTd = document.createElement("td");
    var badge = document.createElement("span");
    var isPast = new Date(row.due_at) < now;
    badge.className = "status-badge " + (isPast ? "status-expired" : "status-active");
    badge.textContent = formatDueAt(row.due_at) + (isPast ? " (đã hết hạn)" : "");
    dueTd.appendChild(badge);
    tr.appendChild(dueTd);

    var actionsTd = document.createElement("td");

    var viewBtn = document.createElement("button");
    viewBtn.className = "admin-btn-secondary";
    viewBtn.type = "button";
    viewBtn.textContent = "Xem kết quả";
    viewBtn.addEventListener("click", function (assignmentRow) {
      return function () {
        goToAssignmentResults(assignmentRow);
      };
    }(row));
    actionsTd.appendChild(viewBtn);

    var delBtn = document.createElement("button");
    delBtn.className = "admin-btn-danger";
    delBtn.type = "button";
    delBtn.textContent = "Xóa";
    delBtn.addEventListener("click", function (assignmentId) {
      return function () {
        deleteAssignment(assignmentId);
      };
    }(row.id));
    actionsTd.appendChild(delBtn);

    tr.appendChild(actionsTd);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  wrap.appendChild(table);
}

function goToAssignmentResults(assignmentRow) {
  document.getElementById("resultsUnitSelect").value = assignmentRow.unit_id;
  document.getElementById("resultsActivitySelect").value = assignmentRow.activity_type;
  document.getElementById("resultsGroupFilter").value = assignmentRow.group_id;
  currentResultsAssignmentId = assignmentRow.id;
  switchTab("results");
}

async function deleteAssignment(id) {
  if (!window.confirm("Xóa bài giao này?")) {
    return;
  }
  var result = await supabaseClient.from("game_assignments").delete().eq("id", id);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  loadAssignmentList();
}
