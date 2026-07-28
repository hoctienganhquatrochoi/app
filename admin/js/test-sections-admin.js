/* ---------- Đề kiểm tra: quản lý danh sách mục (section) trỏ tới bài đã soạn ở Unit khác ---------- */

var TEST_SECTION_TABLES = {
  "grammar-mcq": "game_grammar_mcq",
  "grammar-typing": "game_grammar_typing",
  "grammar-matching": "game_grammar_matching",
  "grammar-dragfill": "game_grammar_dragfill",
  "math-dragfill": "game_math_dragfill",
  "text-dragfill": "game_text_dragfill"
};

var TEST_SECTION_LABELS = {
  "grammar-mcq": "Trắc nghiệm ngữ pháp",
  "grammar-typing": "Viết câu trả lời",
  "grammar-matching": "Nối câu",
  "grammar-dragfill": "Điền từ vào chỗ trống",
  "math-dragfill": "Toán - Điền số",
  "text-dragfill": "Điền đoạn văn/hội thoại"
};

var currentTestSections = [];

async function loadTestSections() {
  var unitId = document.getElementById("unitSelect").value;
  var wrap = document.getElementById("testSectionsTableWrap");
  wrap.textContent = "Đang tải...";

  var result = await supabaseClient.from("game_test_sections").select("*").eq("unit_id", unitId).order("sort_order", { ascending: true });
  if (result.error) {
    wrap.textContent = "Lỗi tải dữ liệu: " + result.error.message;
    return;
  }

  currentTestSections = result.data;
  renderTestSectionsTable();
  populateTestSectionUnitSelect();
  populateTestSectionSetSelect();
}

function testSectionSourceLabel(row) {
  buildAllUnitsFlat();
  var unitEntry = ALL_UNITS_FLAT.filter(function (u) { return u.id === row.source_unit_id; })[0];
  return (unitEntry ? unitEntry.label : row.source_unit_id) + " — " + row.source_set_name;
}

function renderTestSectionsTable() {
  var wrap = document.getElementById("testSectionsTableWrap");
  wrap.innerHTML = "";

  if (!currentTestSections.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Đề này chưa có mục nào, thêm ở bên dưới.";
    wrap.appendChild(empty);
    return;
  }

  var table = document.createElement("table");
  table.className = "admin-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  ["#", "Nhãn", "Dạng bài", "Nguồn", ""].forEach(function (h) {
    var th = document.createElement("th");
    th.textContent = h;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  currentTestSections.forEach(function (row, idx) {
    var tr = document.createElement("tr");
    tr.appendChild(makeTd("" + (idx + 1)));
    tr.appendChild(makeTd(row.label || "(không đặt tên)"));
    tr.appendChild(makeTd(TEST_SECTION_LABELS[row.section_type] || row.section_type));
    tr.appendChild(makeTd(testSectionSourceLabel(row)));

    var actionsTd = document.createElement("td");

    var upBtn = document.createElement("button");
    upBtn.className = "admin-btn-secondary";
    upBtn.type = "button";
    upBtn.textContent = "↑";
    upBtn.disabled = idx === 0;
    upBtn.addEventListener("click", function () { moveTestSection(idx, -1); });
    actionsTd.appendChild(upBtn);

    var downBtn = document.createElement("button");
    downBtn.className = "admin-btn-secondary";
    downBtn.type = "button";
    downBtn.textContent = "↓";
    downBtn.disabled = idx === currentTestSections.length - 1;
    downBtn.addEventListener("click", function () { moveTestSection(idx, 1); });
    actionsTd.appendChild(downBtn);

    var delBtn = document.createElement("button");
    delBtn.className = "admin-btn-danger";
    delBtn.type = "button";
    delBtn.textContent = "Xóa";
    delBtn.addEventListener("click", function () { deleteTestSection(row.id); });
    actionsTd.appendChild(delBtn);

    tr.appendChild(actionsTd);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  wrap.appendChild(table);
}

async function moveTestSection(idx, delta) {
  var otherIdx = idx + delta;
  if (otherIdx < 0 || otherIdx >= currentTestSections.length) {
    return;
  }
  var a = currentTestSections[idx];
  var b = currentTestSections[otherIdx];
  await supabaseClient.from("game_test_sections").update({ sort_order: b.sort_order }).eq("id", a.id);
  await supabaseClient.from("game_test_sections").update({ sort_order: a.sort_order }).eq("id", b.id);
  loadTestSections();
}

async function deleteTestSection(id) {
  if (!window.confirm("Xóa mục này khỏi đề?")) {
    return;
  }
  var result = await supabaseClient.from("game_test_sections").delete().eq("id", id);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  loadTestSections();
  loadCurriculumData().then(loadActivityToggles);
}

function populateTestSectionUnitSelect() {
  populateSearchableUnitSelect("testSectionUnitSearch", "testSectionUnitSelect");
}

async function populateTestSectionSetSelect() {
  var sectionType = document.getElementById("newTestSectionType").value;
  var sourceUnitId = document.getElementById("testSectionUnitSelect").value;
  var select = document.getElementById("testSectionSetSelect");
  select.innerHTML = "";

  var table = TEST_SECTION_TABLES[sectionType];
  if (!table || !sourceUnitId) {
    return;
  }

  var result = await supabaseClient.from(table).select("set_name").eq("unit_id", sourceUnitId);
  if (result.error) {
    return;
  }

  var seen = {};
  var names = [];
  result.data.forEach(function (row) {
    if (!seen[row.set_name]) {
      seen[row.set_name] = true;
      names.push(row.set_name);
    }
  });

  if (!names.length) {
    var opt = document.createElement("option");
    opt.value = "";
    opt.text = "Unit này chưa có bài dạng này";
    select.appendChild(opt);
    return;
  }

  names.forEach(function (name) {
    var opt = document.createElement("option");
    opt.value = name;
    opt.text = name;
    select.appendChild(opt);
  });
}

async function handleAddTestSection() {
  var unitId = document.getElementById("unitSelect").value;
  var sectionType = document.getElementById("newTestSectionType").value;
  var sourceUnitId = document.getElementById("testSectionUnitSelect").value;
  var sourceSetName = document.getElementById("testSectionSetSelect").value;
  var label = document.getElementById("newTestSectionLabel").value.trim();

  if (!sourceUnitId || !sourceSetName) {
    window.alert("Chưa chọn được Unit/bài nguồn — Unit đó có thể chưa có bài dạng này.");
    return;
  }

  var nextSortOrder = currentTestSections.length;
  var result = await supabaseClient.from("game_test_sections").insert({
    unit_id: unitId,
    sort_order: nextSortOrder,
    section_type: sectionType,
    source_unit_id: sourceUnitId,
    source_set_name: sourceSetName,
    label: label || null
  });

  if (result.error) {
    window.alert("Lỗi lưu: " + result.error.message);
    return;
  }

  document.getElementById("newTestSectionLabel").value = "";
  document.getElementById("testSectionStatus").textContent = "Đã thêm mục vào đề.";
  loadTestSections();
  loadCurriculumData().then(loadActivityToggles);
}
