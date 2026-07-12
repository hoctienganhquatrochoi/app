function genId(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function setCurriculumStatus(text) {
  document.getElementById("curriculumStatus").textContent = text || "";
}

function populateClassSelect(selectId) {
  var select = document.getElementById(selectId);
  var previous = select.value;
  select.innerHTML = "";
  var i;
  for (i = 0; i < DATA.classes.length; i++) {
    var opt = document.createElement("option");
    opt.value = DATA.classes[i].id;
    opt.text = DATA.classes[i].name;
    select.appendChild(opt);
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

function findAllUnitsWithPath() {
  var results = [];
  var c, s, u;
  for (c = 0; c < DATA.classes.length; c++) {
    var cls = DATA.classes[c];
    var subjects = DATA.subjectsByClass[cls.id] || [];
    for (s = 0; s < subjects.length; s++) {
      var subj = subjects[s];
      for (u = 0; u < subj.units.length; u++) {
        results.push({ unit: subj.units[u], cls: cls, subj: subj });
      }
    }
  }
  return results;
}

function populateUnitClassPicker(prefix) {
  var select = document.getElementById(prefix + "UnitClassPicker");
  var previous = select.value;
  select.innerHTML = "";
  var i;
  for (i = 0; i < DATA.classes.length; i++) {
    var opt = document.createElement("option");
    opt.value = DATA.classes[i].id;
    opt.text = DATA.classes[i].name;
    select.appendChild(opt);
  }
  if (previous && Array.prototype.some.call(select.options, function (o) { return o.value === previous; })) {
    select.value = previous;
  }
  populateUnitSubjectPicker(prefix);
}

function populateUnitSubjectPicker(prefix) {
  var classId = document.getElementById(prefix + "UnitClassPicker").value;
  var select = document.getElementById(prefix + "UnitSubjectPicker");
  var previous = select.value;
  select.innerHTML = "";
  var subjects = DATA.subjectsByClass[classId] || [];
  var i;
  for (i = 0; i < subjects.length; i++) {
    var opt = document.createElement("option");
    opt.value = subjects[i].id;
    opt.text = subjects[i].name;
    select.appendChild(opt);
  }
  if (previous && Array.prototype.some.call(select.options, function (o) { return o.value === previous; })) {
    select.value = previous;
  }
}

/* ---------- small row-builder helpers ---------- */

function buildActionBtn(label, className, onClick) {
  var btn = document.createElement("button");
  btn.className = className;
  btn.type = "button";
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}

function buildTableWrap(hasRows, tbodyBuilder) {
  var wrap = document.createElement("div");
  if (!hasRows) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Chưa có mục nào.";
    wrap.appendChild(empty);
    return wrap;
  }
  var table = document.createElement("table");
  table.className = "admin-table";
  var tbody = document.createElement("tbody");
  tbodyBuilder(tbody);
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

/* ---------- sub-tab switching ---------- */

function switchCurriculumSubTab(target) {
  var tabs = document.querySelectorAll("#curriculumSubTabs .admin-subtab");
  var i;
  for (i = 0; i < tabs.length; i++) {
    tabs[i].className = tabs[i].getAttribute("data-subtab") === target ? "admin-subtab active" : "admin-subtab";
  }
  document.getElementById("classesSubPanel").style.display = target === "classes" ? "block" : "none";
  document.getElementById("subjectsSubPanel").style.display = target === "subjects" ? "block" : "none";
  document.getElementById("addContentSubPanel").style.display = target === "addContent" ? "block" : "none";
  document.getElementById("manageContentSubPanel").style.display = target === "manageContent" ? "block" : "none";

  if (target === "manageContent") {
    showUnitsManageView();
  }
}

/* ---------- Lớp ---------- */

var editingClassId = null;

function renderClassList() {
  var wrap = document.getElementById("classListWrap");
  wrap.innerHTML = "";
  wrap.appendChild(buildTableWrap(DATA.classes.length > 0, function (tbody) {
    DATA.classes.forEach(function (cls, idx) {
      tbody.appendChild(editingClassId === cls.id ? buildClassEditRow(cls) : buildClassRow(cls, idx));
    });
  }));
}

function buildClassRow(cls, idx) {
  var tr = document.createElement("tr");

  var nameTd = document.createElement("td");
  nameTd.textContent = cls.name;
  tr.appendChild(nameTd);

  var badgeTd = document.createElement("td");
  var badge = document.createElement("span");
  badge.className = "status-badge status-active";
  badge.textContent = cls.level === "mamnon" ? "Mầm non" : "Tiểu học";
  badgeTd.appendChild(badge);
  tr.appendChild(badgeTd);

  var moveTd = document.createElement("td");
  var upBtn = buildActionBtn("↑", "admin-btn-secondary", function () { moveClass(cls.id, -1); });
  upBtn.disabled = idx === 0;
  var downBtn = buildActionBtn("↓", "admin-btn-secondary", function () { moveClass(cls.id, 1); });
  downBtn.disabled = idx === DATA.classes.length - 1;
  moveTd.appendChild(upBtn);
  moveTd.appendChild(downBtn);
  tr.appendChild(moveTd);

  var actionTd = document.createElement("td");
  actionTd.appendChild(buildActionBtn("Sửa", "admin-btn-secondary", function () {
    editingClassId = cls.id;
    renderClassList();
  }));
  actionTd.appendChild(buildActionBtn("Xóa", "admin-btn-danger", function () {
    handleDeleteClass(cls.id);
  }));
  tr.appendChild(actionTd);

  return tr;
}

function buildClassEditRow(cls) {
  var tr = document.createElement("tr");
  tr.className = "editing-row";

  var nameTd = document.createElement("td");
  var nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "admin-inline-input";
  nameInput.value = cls.name;
  nameTd.appendChild(nameInput);
  tr.appendChild(nameTd);

  var levelTd = document.createElement("td");
  var levelSelect = document.createElement("select");
  levelSelect.className = "admin-inline-input";
  [["tieuhoc", "Tiểu học"], ["mamnon", "Mầm non"]].forEach(function (pair) {
    var opt = document.createElement("option");
    opt.value = pair[0];
    opt.text = pair[1];
    if (cls.level === pair[0]) {
      opt.selected = true;
    }
    levelSelect.appendChild(opt);
  });
  levelTd.appendChild(levelSelect);
  tr.appendChild(levelTd);

  tr.appendChild(document.createElement("td"));

  var actionTd = document.createElement("td");
  actionTd.appendChild(buildActionBtn("Lưu", "admin-btn-primary", async function () {
    var newName = nameInput.value.trim();
    if (!newName) {
      window.alert("Cần nhập tên lớp");
      return;
    }
    var result = await supabaseClient.from("game_classes").update({ name: newName, level: levelSelect.value }).eq("id", cls.id);
    if (result.error) {
      window.alert("Lỗi lưu: " + result.error.message);
      return;
    }
    editingClassId = null;
    await refreshCurriculumEverywhere();
  }));
  actionTd.appendChild(buildActionBtn("Hủy", "admin-btn-danger", function () {
    editingClassId = null;
    renderClassList();
  }));
  tr.appendChild(actionTd);

  return tr;
}

async function moveClass(classId, direction) {
  var idx = DATA.classes.findIndex(function (c) { return c.id === classId; });
  var swapIdx = idx + direction;
  if (idx === -1 || swapIdx < 0 || swapIdx >= DATA.classes.length) {
    return;
  }

  var a = DATA.classes[idx];
  var b = DATA.classes[swapIdx];

  await supabaseClient.from("game_classes").update({ sort_order: swapIdx }).eq("id", a.id);
  await supabaseClient.from("game_classes").update({ sort_order: idx }).eq("id", b.id);

  await refreshCurriculumEverywhere();
}

async function handleAddClass() {
  var name = document.getElementById("newClassName").value.trim();
  var level = document.getElementById("newClassLevel").value;

  if (!name) {
    window.alert("Cần nhập tên lớp");
    return;
  }

  setCurriculumStatus("Đang tạo lớp...");
  var result = await supabaseClient.from("game_classes").insert({ id: genId("c"), name: name, level: level, sort_order: DATA.classes.length });
  if (result.error) {
    setCurriculumStatus("Lỗi tạo lớp: " + result.error.message);
    return;
  }

  document.getElementById("newClassName").value = "";
  setCurriculumStatus("Đã tạo lớp \"" + name + "\".");
  await refreshCurriculumEverywhere();
}

async function handleDeleteClass(classId) {
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

/* ---------- Môn học ---------- */

var editingSubjectId = null;

function renderSubjectList() {
  var wrap = document.getElementById("subjectListWrap");
  wrap.innerHTML = "";
  var classId = document.getElementById("subjectClassPicker").value;
  var subjects = DATA.subjectsByClass[classId] || [];
  wrap.appendChild(buildTableWrap(subjects.length > 0, function (tbody) {
    subjects.forEach(function (subj, idx) {
      tbody.appendChild(editingSubjectId === subj.id ? buildSubjectEditRow(subj) : buildSubjectRow(subj, idx, subjects.length));
    });
  }));
}

async function moveSubject(subjectId, direction) {
  var classId = document.getElementById("subjectClassPicker").value;
  var subjects = DATA.subjectsByClass[classId] || [];
  var idx = subjects.findIndex(function (s) { return s.id === subjectId; });
  var swapIdx = idx + direction;
  if (idx === -1 || swapIdx < 0 || swapIdx >= subjects.length) {
    return;
  }

  var a = subjects[idx];
  var b = subjects[swapIdx];

  await supabaseClient.from("game_subjects").update({ sort_order: swapIdx }).eq("id", a.id);
  await supabaseClient.from("game_subjects").update({ sort_order: idx }).eq("id", b.id);

  await refreshCurriculumEverywhere();
}

function buildSubjectRow(subj, idx, total) {
  var tr = document.createElement("tr");

  var nameTd = document.createElement("td");
  nameTd.textContent = subj.name;
  tr.appendChild(nameTd);

  var badgeTd = document.createElement("td");
  var badge = document.createElement("span");
  badge.className = "status-badge status-active";
  badge.textContent = subj.units.length + " unit";
  badgeTd.appendChild(badge);
  tr.appendChild(badgeTd);

  var moveTd = document.createElement("td");
  var upBtn = buildActionBtn("↑", "admin-btn-secondary", function () { moveSubject(subj.id, -1); });
  upBtn.disabled = idx === 0;
  var downBtn = buildActionBtn("↓", "admin-btn-secondary", function () { moveSubject(subj.id, 1); });
  downBtn.disabled = idx === total - 1;
  moveTd.appendChild(upBtn);
  moveTd.appendChild(downBtn);
  tr.appendChild(moveTd);

  var actionTd = document.createElement("td");
  actionTd.appendChild(buildActionBtn("Sửa", "admin-btn-secondary", function () {
    editingSubjectId = subj.id;
    renderSubjectList();
  }));
  actionTd.appendChild(buildActionBtn("Xóa", "admin-btn-danger", function () {
    handleDeleteSubject(subj.id);
  }));
  tr.appendChild(actionTd);

  return tr;
}

function buildSubjectEditRow(subj) {
  var tr = document.createElement("tr");
  tr.className = "editing-row";

  var nameTd = document.createElement("td");
  var nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "admin-inline-input";
  nameInput.value = subj.name;
  nameTd.appendChild(nameInput);
  tr.appendChild(nameTd);

  var colorTd = document.createElement("td");
  var colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = subj.color;
  colorTd.appendChild(colorInput);
  tr.appendChild(colorTd);

  tr.appendChild(document.createElement("td"));

  var actionTd = document.createElement("td");
  actionTd.appendChild(buildActionBtn("Lưu", "admin-btn-primary", async function () {
    var newName = nameInput.value.trim();
    if (!newName) {
      window.alert("Cần nhập tên môn học");
      return;
    }
    var result = await supabaseClient.from("game_subjects").update({ name: newName, color: colorInput.value }).eq("id", subj.id);
    if (result.error) {
      window.alert("Lỗi lưu: " + result.error.message);
      return;
    }
    editingSubjectId = null;
    await refreshCurriculumEverywhere();
  }));
  actionTd.appendChild(buildActionBtn("Hủy", "admin-btn-danger", function () {
    editingSubjectId = null;
    renderSubjectList();
  }));
  tr.appendChild(actionTd);

  return tr;
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
  var newSortOrder = (DATA.subjectsByClass[classId] || []).length;
  var result = await supabaseClient.from("game_subjects").insert({ id: genId("s"), class_id: classId, name: name, color: color, sort_order: newSortOrder });
  if (result.error) {
    setCurriculumStatus("Lỗi tạo môn học: " + result.error.message);
    return;
  }

  document.getElementById("newSubjectName").value = "";
  setCurriculumStatus("Đã tạo môn học \"" + name + "\".");
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

/* ---------- Bài học (Unit) ---------- */

var editingUnitId = null;

function renderUnitList() {
  var wrap = document.getElementById("unitListWrap");
  wrap.innerHTML = "";

  var query = document.getElementById("unitSearchInput").value.trim().toLowerCase();

  if (query) {
    var matches = findAllUnitsWithPath().filter(function (entry) {
      return entry.unit.name.toLowerCase().indexOf(query) !== -1;
    });
    wrap.appendChild(buildTableWrap(matches.length > 0, function (tbody) {
      matches.forEach(function (entry) {
        var pathLabel = entry.cls.name + " › " + entry.subj.name;
        tbody.appendChild(editingUnitId === entry.unit.id ? buildUnitEditRow(entry.unit) : buildUnitRow(entry.unit, pathLabel));
      });
    }));
    return;
  }

  var subjectId = document.getElementById("manageUnitSubjectPicker").value;
  var subject = findSubjectById(subjectId);
  var units = subject ? subject.units : [];
  wrap.appendChild(buildTableWrap(units.length > 0, function (tbody) {
    units.forEach(function (unit, idx) {
      tbody.appendChild(editingUnitId === unit.id ? buildUnitEditRow(unit) : buildUnitRow(unit, null, idx, units.length));
    });
  }));
}

async function moveUnit(unitId, direction) {
  var subject = findSubjectById(document.getElementById("manageUnitSubjectPicker").value);
  if (!subject) {
    return;
  }
  var idx = subject.units.findIndex(function (u) { return u.id === unitId; });
  var swapIdx = idx + direction;
  if (idx === -1 || swapIdx < 0 || swapIdx >= subject.units.length) {
    return;
  }

  var a = subject.units[idx];
  var b = subject.units[swapIdx];

  await supabaseClient.from("game_units").update({ sort_order: swapIdx }).eq("id", a.id);
  await supabaseClient.from("game_units").update({ sort_order: idx }).eq("id", b.id);

  await refreshCurriculumEverywhere();
}

function buildUnitRow(unit, pathLabel, idx, total) {
  var tr = document.createElement("tr");

  var nameTd = document.createElement("td");
  nameTd.textContent = pathLabel ? pathLabel + " › " + unit.name : unit.name;
  tr.appendChild(nameTd);

  var badgeTd = document.createElement("td");
  var badge = document.createElement("span");
  badge.className = "status-badge status-active";
  badge.textContent = unit.content_type === "vocab" ? "Từ vựng" : "Ngữ pháp";
  badgeTd.appendChild(badge);
  tr.appendChild(badgeTd);

  var moveTd = document.createElement("td");
  if (typeof idx === "number") {
    var upBtn = buildActionBtn("↑", "admin-btn-secondary", function () { moveUnit(unit.id, -1); });
    upBtn.disabled = idx === 0;
    var downBtn = buildActionBtn("↓", "admin-btn-secondary", function () { moveUnit(unit.id, 1); });
    downBtn.disabled = idx === total - 1;
    moveTd.appendChild(upBtn);
    moveTd.appendChild(downBtn);
  }
  tr.appendChild(moveTd);

  var actionTd = document.createElement("td");
  actionTd.appendChild(buildActionBtn("Soạn", "admin-btn-primary", function () {
    selectUnitForComposing(unit.id);
  }));
  actionTd.appendChild(buildActionBtn("Sửa", "admin-btn-secondary", function () {
    editingUnitId = unit.id;
    renderUnitList();
  }));
  actionTd.appendChild(buildActionBtn("Xóa", "admin-btn-danger", function () {
    handleDeleteUnit(unit.id);
  }));
  tr.appendChild(actionTd);

  return tr;
}

function buildUnitEditRow(unit) {
  var tr = document.createElement("tr");
  tr.className = "editing-row";

  var currentSubject = findSubjectById(unit.subject_id);
  var currentClassId = currentSubject ? currentSubject.class_id : null;

  var nameTd = document.createElement("td");
  var nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "admin-inline-input";
  nameInput.value = unit.name;
  nameTd.appendChild(nameInput);
  tr.appendChild(nameTd);

  var typeTd = document.createElement("td");
  var typeSelect = document.createElement("select");
  typeSelect.className = "admin-inline-input";
  [["vocab", "Từ vựng"], ["grammar", "Ngữ pháp (sắp ra mắt)"]].forEach(function (pair) {
    var opt = document.createElement("option");
    opt.value = pair[0];
    opt.text = pair[1];
    if (unit.content_type === pair[0]) {
      opt.selected = true;
    }
    typeSelect.appendChild(opt);
  });
  typeTd.appendChild(typeSelect);
  tr.appendChild(typeTd);

  var classTd = document.createElement("td");
  var classSelect = document.createElement("select");
  classSelect.className = "admin-inline-input";
  DATA.classes.forEach(function (cls) {
    var opt = document.createElement("option");
    opt.value = cls.id;
    opt.text = cls.name;
    if (cls.id === currentClassId) {
      opt.selected = true;
    }
    classSelect.appendChild(opt);
  });
  classTd.appendChild(classSelect);
  tr.appendChild(classTd);

  var subjectTd = document.createElement("td");
  var subjectSelect = document.createElement("select");
  subjectSelect.className = "admin-inline-input";
  function populateEditSubjectOptions() {
    subjectSelect.innerHTML = "";
    var subjects = DATA.subjectsByClass[classSelect.value] || [];
    subjects.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s.id;
      opt.text = s.name;
      if (s.id === unit.subject_id) {
        opt.selected = true;
      }
      subjectSelect.appendChild(opt);
    });
  }
  populateEditSubjectOptions();
  classSelect.addEventListener("change", populateEditSubjectOptions);
  subjectTd.appendChild(subjectSelect);
  tr.appendChild(subjectTd);

  var actionTd = document.createElement("td");
  actionTd.appendChild(buildActionBtn("Lưu", "admin-btn-primary", async function () {
    var newName = nameInput.value.trim();
    if (!newName) {
      window.alert("Cần nhập tên bài");
      return;
    }
    if (!subjectSelect.value) {
      window.alert("Lớp này chưa có Môn học nào");
      return;
    }
    var result = await supabaseClient.from("game_units").update({
      name: newName,
      content_type: typeSelect.value,
      subject_id: subjectSelect.value
    }).eq("id", unit.id);
    if (result.error) {
      window.alert("Lỗi lưu: " + result.error.message);
      return;
    }
    editingUnitId = null;
    await refreshCurriculumEverywhere({ selectUnitId: unit.id });
  }));
  actionTd.appendChild(buildActionBtn("Hủy", "admin-btn-danger", function () {
    editingUnitId = null;
    renderUnitList();
  }));
  tr.appendChild(actionTd);

  return tr;
}

function showUnitsManageView() {
  document.getElementById("unitsManageView").style.display = "block";
  document.getElementById("unitsComposeView").style.display = "none";
}

function showUnitsComposeView() {
  document.getElementById("unitsManageView").style.display = "none";
  document.getElementById("unitsComposeView").style.display = "block";
}

function updateComposeBreadcrumb() {
  var unitId = document.getElementById("unitSelect").value;
  var unit = findUnitById(unitId);
  var subject = unit ? findSubjectById(unit.subject_id) : null;
  var cls = subject ? findClassById(subject.class_id) : null;

  var parts = [];
  if (cls) {
    parts.push(cls.name);
  }
  if (subject) {
    parts.push(subject.name);
  }
  if (unit) {
    parts.push(unit.name);
  }
  document.getElementById("composeBreadcrumb").textContent = "Đang soạn: " + parts.join(" › ");
}

function selectUnitForComposing(unitId) {
  var select = document.getElementById("unitSelect");
  select.value = unitId;
  updateComposeBreadcrumb();
  updateComposeAreaVisibility();
  loadVocabTable();
  loadSpeakingTable();
  loadActivityToggles();
  showUnitsComposeView();
}

function updateComposeAreaVisibility() {
  var unitId = document.getElementById("unitSelect").value;
  var unit = findUnitById(unitId);
  var isVocab = !!unit && unit.content_type === "vocab";

  document.getElementById("bulkAddForm").style.display = isVocab ? "" : "none";
  document.getElementById("vocabTableWrap").style.display = isVocab ? "" : "none";
  document.getElementById("speakingSection").style.display = isVocab ? "" : "none";
  document.getElementById("grammarComposeMsg").style.display = isVocab ? "none" : "block";
}

async function handleAddUnit() {
  var subjectId = document.getElementById("addUnitSubjectPicker").value;
  var name = document.getElementById("newUnitName").value.trim();
  var contentType = document.getElementById("newUnitContentType").value;

  if (!subjectId) {
    window.alert("Chưa có Môn học nào, hãy tạo Môn học trước");
    return;
  }
  if (!name) {
    window.alert("Cần nhập tên bài");
    return;
  }

  setCurriculumStatus("Đang tạo bài học...");
  var newId = genId("u");
  var subjectForOrder = findSubjectById(subjectId);
  var newSortOrder = subjectForOrder ? subjectForOrder.units.length : 0;
  var result = await supabaseClient.from("game_units").insert({ id: newId, subject_id: subjectId, name: name, content_type: contentType, sort_order: newSortOrder });
  if (result.error) {
    setCurriculumStatus("Lỗi tạo bài học: " + result.error.message);
    return;
  }

  document.getElementById("newUnitName").value = "";
  setCurriculumStatus("Đã tạo bài học \"" + name + "\".");
  await refreshCurriculumEverywhere({ selectUnitId: newId });
  switchCurriculumSubTab("manageContent");
  selectUnitForComposing(newId);
}

async function handleDeleteUnit(unitId) {
  var vocabResult = await supabaseClient.from("game_vocab").select("id", { count: "exact", head: true }).eq("unit_id", unitId);
  var speakingResult = await supabaseClient.from("game_speaking_questions").select("id", { count: "exact", head: true }).eq("unit_id", unitId);
  var vocabCount = vocabResult.count || 0;
  var speakingCount = speakingResult.count || 0;

  var warnParts = [];
  if (vocabCount > 0) {
    warnParts.push(vocabCount + " từ vựng");
  }
  if (speakingCount > 0) {
    warnParts.push(speakingCount + " câu Kiểm tra nói");
  }
  var warnMsg = warnParts.length > 0 ? ("Xóa Unit này sẽ xóa luôn " + warnParts.join(" và ") + " bên trong, không thể khôi phục. ") : "";

  if (!window.confirm(warnMsg + "Bạn có chắc chắn muốn xóa Unit này?")) {
    return;
  }

  if (vocabCount > 0) {
    await supabaseClient.from("game_vocab").delete().eq("unit_id", unitId);
  }
  if (speakingCount > 0) {
    await supabaseClient.from("game_speaking_questions").delete().eq("unit_id", unitId);
  }
  await supabaseClient.from("game_unit_settings").delete().eq("unit_id", unitId);

  var result = await supabaseClient.from("game_units").delete().eq("id", unitId);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  setCurriculumStatus("Đã xóa bài học.");
  await refreshCurriculumEverywhere();
}

/* ---------- shared refresh ---------- */

async function refreshCurriculumEverywhere(opts) {
  await loadCurriculumData();

  var selectedUnitId = opts && opts.selectUnitId;

  populateUnitSelect();
  populateResultsUnitSelect();
  populateClassSelect("subjectClassPicker");
  populateUnitClassPicker("add");
  populateUnitClassPicker("manage");

  renderClassList();
  renderSubjectList();
  renderUnitList();

  if (selectedUnitId) {
    document.getElementById("unitSelect").value = selectedUnitId;
  }
  updateComposeAreaVisibility();
  loadVocabTable();
  loadSpeakingTable();
  loadActivityToggles();
}

function initCurriculumManage() {
  populateClassSelect("subjectClassPicker");
  populateUnitClassPicker("add");
  populateUnitClassPicker("manage");
  renderClassList();
  renderSubjectList();
  renderUnitList();
  updateComposeAreaVisibility();
  showUnitsManageView();
  switchCurriculumSubTab("classes");

  document.getElementById("addClassBtn").addEventListener("click", handleAddClass);
  document.getElementById("addSubjectBtn").addEventListener("click", handleAddSubject);
  document.getElementById("addUnitBtn").addEventListener("click", handleAddUnit);

  document.getElementById("subjectClassPicker").addEventListener("change", renderSubjectList);
  document.getElementById("addUnitClassPicker").addEventListener("change", function () {
    populateUnitSubjectPicker("add");
  });
  document.getElementById("manageUnitClassPicker").addEventListener("change", function () {
    populateUnitSubjectPicker("manage");
    renderUnitList();
  });
  document.getElementById("manageUnitSubjectPicker").addEventListener("change", renderUnitList);
  document.getElementById("unitSearchInput").addEventListener("input", renderUnitList);
  document.getElementById("unitSelect").addEventListener("change", updateComposeAreaVisibility);
  document.getElementById("backToUnitListBtn").addEventListener("click", showUnitsManageView);

  var subTabs = document.querySelectorAll("#curriculumSubTabs .admin-subtab");
  var i;
  for (i = 0; i < subTabs.length; i++) {
    subTabs[i].addEventListener("click", function () {
      switchCurriculumSubTab(this.getAttribute("data-subtab"));
    });
  }
}
