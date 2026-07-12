var ASSIGNMENT_ACTIVITY_LABELS = {
  "quiz": "Quiz",
  "missing-letter": "Khuyết chữ cái",
  "typing-hint": "Đánh máy có gợi ý",
  "typing-blank": "Đánh máy không gợi ý"
};

function populateAssignmentUnitSelect() {
  var classId = document.getElementById("studentsClassFilter").value;
  var select = document.getElementById("assignmentUnitSelect");
  var previous = select.value;
  select.innerHTML = "";

  if (!classId) {
    var hint = document.createElement("option");
    hint.value = "";
    hint.text = "Chọn 1 Lớp cụ thể ở trên trước";
    select.appendChild(hint);
    return;
  }

  var subjects = DATA.subjectsByClass[classId] || [];
  var s, u;
  for (s = 0; s < subjects.length; s++) {
    for (u = 0; u < subjects[s].units.length; u++) {
      var unit = subjects[s].units[u];
      var opt = document.createElement("option");
      opt.value = unit.id;
      opt.text = subjects[s].name + " › " + unit.name;
      select.appendChild(opt);
    }
  }

  if (previous && Array.prototype.some.call(select.options, function (o) { return o.value === previous; })) {
    select.value = previous;
  }
}

function setAssignmentStatus(text) {
  document.getElementById("assignmentStatus").textContent = text || "";
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
  var classId = document.getElementById("studentsClassFilter").value;
  var unitId = document.getElementById("assignmentUnitSelect").value;
  var activityType = document.getElementById("assignmentActivitySelect").value;
  var dueAtLocal = document.getElementById("assignmentDueAt").value;

  if (!classId) {
    window.alert("Chọn 1 Lớp cụ thể ở ô \"Lọc theo Lớp\" bên trên trước");
    return;
  }
  if (!unitId) {
    window.alert("Chưa có Unit nào để giao trong Lớp này");
    return;
  }
  if (!dueAtLocal) {
    window.alert("Chọn hạn nộp");
    return;
  }

  var unitSelect = document.getElementById("assignmentUnitSelect");
  var unitLabel = unitSelect.options[unitSelect.selectedIndex].text;

  setAssignmentStatus("Đang giao bài...");

  var result = await supabaseClient.from("game_assignments").insert({
    class_id: classId,
    unit_id: unitId,
    activity_type: activityType,
    activity_name: unitLabel + " – " + ASSIGNMENT_ACTIVITY_LABELS[activityType],
    due_at: new Date(dueAtLocal).toISOString()
  });

  if (result.error) {
    setAssignmentStatus("Lỗi giao bài: " + result.error.message);
    return;
  }

  setAssignmentStatus("Đã giao bài.");
  document.getElementById("assignmentDueAt").value = "";
  loadAssignmentList();
}

async function loadAssignmentList() {
  var classId = document.getElementById("studentsClassFilter").value;
  var wrap = document.getElementById("assignmentListWrap");

  if (!classId) {
    wrap.innerHTML = "";
    return;
  }

  wrap.textContent = "Đang tải...";

  var result = await supabaseClient
    .from("game_assignments")
    .select("*")
    .eq("class_id", classId)
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
    empty.textContent = "Lớp này chưa được giao bài kiểm tra nào.";
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
  switchTab("results");
  document.getElementById("resultsUnitSelect").value = assignmentRow.unit_id;
  document.getElementById("resultsActivitySelect").value = assignmentRow.activity_type;
  document.getElementById("resultsClassFilter").value = assignmentRow.class_id;
  loadResults();
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
