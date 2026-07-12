var TEACHING_GROUPS = [];

async function loadTeachingGroups() {
  var result = await supabaseClient.from("game_teaching_groups").select("*").order("created_at", { ascending: true });
  TEACHING_GROUPS = result.data || [];
}

function groupNameById(groupId) {
  var i;
  for (i = 0; i < TEACHING_GROUPS.length; i++) {
    if (TEACHING_GROUPS[i].id === groupId) {
      return TEACHING_GROUPS[i].name;
    }
  }
  return "(chưa có nhóm)";
}

function populateTeachingGroupSelect(selectId, includeAllOption) {
  var select = document.getElementById(selectId);
  var previous = select.value;
  select.innerHTML = "";

  if (includeAllOption) {
    var allOpt = document.createElement("option");
    allOpt.value = "";
    allOpt.text = "Tất cả";
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
  populateTeachingGroupSelect("newStudentGroupSelect", false);
  populateTeachingGroupSelect("studentsGroupFilter", true);
  populateTeachingGroupSelect("resultsGroupFilter", true);
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
    var tr = document.createElement("tr");

    var nameTd = document.createElement("td");
    nameTd.textContent = group.name;
    tr.appendChild(nameTd);

    var actionsTd = document.createElement("td");
    var delBtn = document.createElement("button");
    delBtn.className = "admin-btn-danger";
    delBtn.type = "button";
    delBtn.textContent = "Xóa";
    delBtn.addEventListener("click", function () {
      deleteTeachingGroup(group.id);
    });
    actionsTd.appendChild(delBtn);
    tr.appendChild(actionsTd);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
}

async function handleAddTeachingGroup() {
  var input = document.getElementById("newTeachingGroupName");
  var name = input.value.trim();
  var statusEl = document.getElementById("teachingGroupStatus");

  if (!name) {
    window.alert("Nhập tên nhóm học sinh");
    return;
  }

  statusEl.textContent = "Đang tạo...";
  var result = await supabaseClient.from("game_teaching_groups").insert({ name: name });

  if (result.error) {
    statusEl.textContent = "Lỗi tạo: " + result.error.message;
    return;
  }

  input.value = "";
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
