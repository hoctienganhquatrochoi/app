function genId(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function setCurriculumStatus(text) {
  document.getElementById("curriculumStatus").textContent = text || "";
}

function populateSubjectPicker(selectId) {
  var select = document.getElementById(selectId);
  var previous = select.value;
  select.innerHTML = "";
  var c, s;
  for (c = 0; c < DATA.classes.length; c++) {
    var cls = DATA.classes[c];
    var subjects = DATA.subjectsByClass[cls.id] || [];
    for (s = 0; s < subjects.length; s++) {
      var opt = document.createElement("option");
      opt.value = subjects[s].id;
      opt.text = cls.name + " › " + subjects[s].name;
      select.appendChild(opt);
    }
  }
  if (previous && Array.prototype.some.call(select.options, function (o) { return o.value === previous; })) {
    select.value = previous;
  }
}

function findClassById(classId) {
  var i;
  for (i = 0; i < DATA.classes.length; i++) {
    if (DATA.classes[i].id === classId) {
      return DATA.classes[i];
    }
  }
  return null;
}

function findSubjectById(subjectId) {
  var c, s;
  for (c = 0; c < DATA.classes.length; c++) {
    var subjects = DATA.subjectsByClass[DATA.classes[c].id] || [];
    for (s = 0; s < subjects.length; s++) {
      if (subjects[s].id === subjectId) {
        return subjects[s];
      }
    }
  }
  return null;
}

function buildManageRow(labelText, badgeText, onDelete) {
  var tr = document.createElement("tr");

  var labelTd = document.createElement("td");
  labelTd.textContent = labelText;
  tr.appendChild(labelTd);

  var badgeTd = document.createElement("td");
  if (badgeText) {
    var badge = document.createElement("span");
    badge.className = "status-badge status-active";
    badge.textContent = badgeText;
    badgeTd.appendChild(badge);
  }
  tr.appendChild(badgeTd);

  var actionTd = document.createElement("td");
  var delBtn = document.createElement("button");
  delBtn.className = "admin-btn-danger";
  delBtn.type = "button";
  delBtn.textContent = "Xóa";
  delBtn.addEventListener("click", onDelete);
  actionTd.appendChild(delBtn);
  tr.appendChild(actionTd);

  return tr;
}

function buildManageTable(rows) {
  var wrap = document.createElement("div");
  if (!rows.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Chưa có mục nào.";
    wrap.appendChild(empty);
    return wrap;
  }
  var table = document.createElement("table");
  table.className = "admin-table";
  var tbody = document.createElement("tbody");
  var i;
  for (i = 0; i < rows.length; i++) {
    tbody.appendChild(rows[i]);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function renderClassList() {
  var wrap = document.getElementById("classListWrap");
  wrap.innerHTML = "";
  var rows = DATA.classes.map(function (cls) {
    var levelText = cls.level === "mamnon" ? "Mầm non" : "Tiểu học";
    return buildManageRow(cls.name, levelText, function () {
      handleDeleteClass(cls.id);
    });
  });
  wrap.appendChild(buildManageTable(rows));
}

function renderSubjectList() {
  var wrap = document.getElementById("subjectListWrap");
  wrap.innerHTML = "";
  var classId = document.getElementById("subjectClassPicker").value;
  var subjects = DATA.subjectsByClass[classId] || [];
  var rows = subjects.map(function (subj) {
    return buildManageRow(subj.name, subj.units.length + " unit", function () {
      handleDeleteSubject(subj.id);
    });
  });
  wrap.appendChild(buildManageTable(rows));
}

function renderUnitList() {
  var wrap = document.getElementById("unitListWrap");
  wrap.innerHTML = "";
  var subjectId = document.getElementById("unitSubjectPicker").value;
  var subject = findSubjectById(subjectId);
  var units = subject ? subject.units : [];
  var rows = units.map(function (unit) {
    var typeText = unit.content_type === "vocab" ? "Từ vựng" : "Ngữ pháp";
    return buildManageRow(unit.name, typeText, function () {
      handleDeleteUnit(unit.id);
    });
  });
  wrap.appendChild(buildManageTable(rows));
}

async function refreshCurriculumEverywhere(opts) {
  await loadCurriculumData();

  var selectedUnitId = opts && opts.selectUnitId;

  populateUnitSelect();
  populateResultsUnitSelect();
  populateClassSelect();
  populateClassSelect("subjectClassPicker");
  populateSubjectPicker("unitSubjectPicker");

  renderClassList();
  renderSubjectList();
  renderUnitList();

  if (selectedUnitId) {
    document.getElementById("unitSelect").value = selectedUnitId;
  }
  loadVocabTable();
  loadActivityToggles();
}

async function handleAddClass() {
  var name = document.getElementById("newClassName").value.trim();
  var level = document.getElementById("newClassLevel").value;

  if (!name) {
    window.alert("Cần nhập tên lớp");
    return;
  }

  setCurriculumStatus("Đang tạo lớp...");
  var result = await supabaseClient.from("game_classes").insert({ id: genId("c"), name: name, level: level });
  if (result.error) {
    setCurriculumStatus("Lỗi tạo lớp: " + result.error.message);
    return;
  }

  document.getElementById("newClassName").value = "";
  setCurriculumStatus("Đã tạo lớp \"" + name + "\".");
  await refreshCurriculumEverywhere();
}

async function handleAddSubject() {
  var classId = document.getElementById("subjectClassPicker").value;
  var name = document.getElementById("newSubjectName").value.trim();
  var color = document.getElementById("newSubjectColor").value;

  if (!classId) {
    window.alert("Chưa có Lớp nào, hãy tạo Lớp trước");
    return;
  }
  if (!name) {
    window.alert("Cần nhập tên môn học");
    return;
  }

  setCurriculumStatus("Đang tạo môn học...");
  var result = await supabaseClient.from("game_subjects").insert({ id: genId("s"), class_id: classId, name: name, color: color });
  if (result.error) {
    setCurriculumStatus("Lỗi tạo môn học: " + result.error.message);
    return;
  }

  document.getElementById("newSubjectName").value = "";
  setCurriculumStatus("Đã tạo môn học \"" + name + "\".");
  await refreshCurriculumEverywhere();
}

async function handleAddUnit() {
  var subjectId = document.getElementById("unitSubjectPicker").value;
  var name = document.getElementById("newUnitName").value.trim();
  var contentType = document.getElementById("newUnitContentType").value;

  if (!subjectId) {
    window.alert("Chưa có Môn học nào, hãy tạo Môn học trước");
    return;
  }
  if (!name) {
    window.alert("Cần nhập tên unit");
    return;
  }

  setCurriculumStatus("Đang tạo unit...");
  var newId = genId("u");
  var result = await supabaseClient.from("game_units").insert({ id: newId, subject_id: subjectId, name: name, content_type: contentType });
  if (result.error) {
    setCurriculumStatus("Lỗi tạo unit: " + result.error.message);
    return;
  }

  document.getElementById("newUnitName").value = "";
  setCurriculumStatus("Đã tạo unit \"" + name + "\".");
  await refreshCurriculumEverywhere({ selectUnitId: newId });
}

async function handleDeleteClass(classId) {
  var studentsResult = await supabaseClient.from("game_students").select("id", { count: "exact", head: true }).eq("class_id", classId);
  if ((studentsResult.count || 0) > 0) {
    window.alert("Lớp này còn học sinh, hãy chuyển học sinh sang lớp khác trước khi xóa.");
    return;
  }
  if ((DATA.subjectsByClass[classId] || []).length > 0) {
    window.alert("Lớp này còn Môn học, hãy xóa hết Môn học trong lớp trước.");
    return;
  }
  var cls = findClassById(classId);
  if (!window.confirm("Xóa lớp \"" + (cls ? cls.name : classId) + "\"?")) {
    return;
  }

  var result = await supabaseClient.from("game_classes").delete().eq("id", classId);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  setCurriculumStatus("Đã xóa lớp.");
  await refreshCurriculumEverywhere();
}

async function handleDeleteSubject(subjectId) {
  var subject = findSubjectById(subjectId);
  if (subject && subject.units.length > 0) {
    window.alert("Môn học này còn Unit, hãy xóa hết Unit trong môn trước.");
    return;
  }
  if (!window.confirm("Xóa môn học \"" + (subject ? subject.name : subjectId) + "\"?")) {
    return;
  }

  var result = await supabaseClient.from("game_subjects").delete().eq("id", subjectId);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  setCurriculumStatus("Đã xóa môn học.");
  await refreshCurriculumEverywhere();
}

async function handleDeleteUnit(unitId) {
  var vocabResult = await supabaseClient.from("game_vocab").select("id", { count: "exact", head: true }).eq("unit_id", unitId);
  if ((vocabResult.count || 0) > 0) {
    window.alert("Unit này còn từ vựng, hãy xóa hết từ vựng trong bảng bên dưới trước khi xóa Unit.");
    return;
  }
  if (!window.confirm("Xóa unit này?")) {
    return;
  }

  var result = await supabaseClient.from("game_units").delete().eq("id", unitId);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  setCurriculumStatus("Đã xóa unit.");
  await refreshCurriculumEverywhere();
}

function initCurriculumManage() {
  populateClassSelect("subjectClassPicker");
  populateSubjectPicker("unitSubjectPicker");
  renderClassList();
  renderSubjectList();
  renderUnitList();

  document.getElementById("addClassBtn").addEventListener("click", handleAddClass);
  document.getElementById("addSubjectBtn").addEventListener("click", handleAddSubject);
  document.getElementById("addUnitBtn").addEventListener("click", handleAddUnit);

  document.getElementById("subjectClassPicker").addEventListener("change", renderSubjectList);
  document.getElementById("unitSubjectPicker").addEventListener("change", renderUnitList);
}
