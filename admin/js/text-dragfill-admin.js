/* ---------- Đoạn văn/hội thoại tiếng Anh - Điền từ vào chỗ trống (nhiều chỗ trống dùng chung 1 nhóm đáp án, nhiều bài riêng theo tên) ---------- */
/* Dùng chung splitDragfillAnswerList / findWholeWordFrom / countWholeWordOccurrences / findAmbiguousDragfillAnswers / parseMathDragfillBulkBlock / parseMathDragfillBulkText định nghĩa ở math-admin.js — cơ chế giống hệt, chỉ khác bảng dữ liệu. */

function setBulkTextDragfillStatus(text) {
  document.getElementById("bulkTextDragfillStatus").textContent = text;
}

var textDragfillSetManager = createGrammarSetManager("game_text_dragfill", {
  listWrap: "textDragfillSetListWrap",
  select: "textDragfillSetSelect",
  newNameInput: "newTextDragfillSetName",
  status: "textDragfillSetStatus"
}, "bài");
textDragfillSetManager.setOnSelectChange(function () {
  loadTextDragfillTable();
});

function loadTextDragfillSetList() {
  return textDragfillSetManager.loadSetList();
}

function handleAddTextDragfillSet() {
  textDragfillSetManager.handleAddSet();
}

var currentTextDragfillRows = [];
var editingTextDragfillId = null;

async function loadTextDragfillTable() {
  var unitId = document.getElementById("unitSelect").value;
  var setName = document.getElementById("textDragfillSetSelect").value;
  var wrap = document.getElementById("textDragfillTableWrap");
  if (!setName) {
    wrap.innerHTML = "";
    return;
  }
  wrap.textContent = "Đang tải...";

  var result = await supabaseClient
    .from("game_text_dragfill")
    .select("*")
    .eq("unit_id", unitId)
    .eq("set_name", setName)
    .order("sort_order", { ascending: true });

  if (result.error) {
    wrap.textContent = "Lỗi tải dữ liệu: " + result.error.message;
    return;
  }

  renderTextDragfillTable(result.data);
}

function renderTextDragfillTable(rows) {
  currentTextDragfillRows = rows;
  var wrap = document.getElementById("textDragfillTableWrap");
  wrap.innerHTML = "";

  if (!rows.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Unit này chưa có bài nào.";
    wrap.appendChild(empty);
    return;
  }

  var toolbar = document.createElement("div");
  toolbar.className = "admin-table-toolbar";
  var deleteAllBtn = document.createElement("button");
  deleteAllBtn.className = "admin-btn-danger";
  deleteAllBtn.type = "button";
  deleteAllBtn.textContent = "Xóa tất cả trong bài này";
  deleteAllBtn.addEventListener("click", handleDeleteAllTextDragfill);
  toolbar.appendChild(deleteAllBtn);
  wrap.appendChild(toolbar);

  var table = document.createElement("table");
  table.className = "admin-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  ["Đoạn văn/hội thoại", "Đáp án đúng", "Đáp án sai", ""].forEach(function (h) {
    var th = document.createElement("th");
    th.textContent = h;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  rows.forEach(function (row) {
    tbody.appendChild(editingTextDragfillId === row.id ? buildTextDragfillEditRow(row) : buildTextDragfillRow(row));
  });
  table.appendChild(tbody);

  wrap.appendChild(table);
}

function buildTextDragfillRow(row) {
  var tr = document.createElement("tr");
  tr.appendChild(makeTd(row.passage));
  tr.appendChild(makeTd((row.correct_answers || []).join(", ")));
  tr.appendChild(makeTd((row.wrong_answers || []).join(", ")));

  var actionsTd = document.createElement("td");

  var editBtn = document.createElement("button");
  editBtn.className = "admin-btn-secondary";
  editBtn.type = "button";
  editBtn.textContent = "Sửa";
  editBtn.addEventListener("click", function () {
    editingTextDragfillId = row.id;
    renderTextDragfillTable(currentTextDragfillRows);
  });
  actionsTd.appendChild(editBtn);

  var delBtn = document.createElement("button");
  delBtn.className = "admin-btn-danger";
  delBtn.type = "button";
  delBtn.textContent = "Xóa";
  delBtn.addEventListener("click", function () {
    deleteTextDragfillItem(row.id);
  });
  actionsTd.appendChild(delBtn);
  tr.appendChild(actionsTd);

  return tr;
}

function buildTextDragfillEditRow(row) {
  var tr = document.createElement("tr");
  tr.className = "editing-row";

  var passageTd = makeInputTd(row.passage);
  var correctTd = makeInputTd((row.correct_answers || []).join(", "));
  var wrongTd = makeInputTd((row.wrong_answers || []).join(", "));

  tr.appendChild(passageTd);
  tr.appendChild(correctTd);
  tr.appendChild(wrongTd);

  var actionsTd = document.createElement("td");

  var saveBtn = document.createElement("button");
  saveBtn.className = "admin-btn-primary";
  saveBtn.type = "button";
  saveBtn.textContent = "Lưu";
  saveBtn.addEventListener("click", async function () {
    var newPassage = passageTd.inputEl.value.trim();
    var correctAnswers = splitDragfillAnswerList(correctTd.inputEl.value);
    var wrongAnswers = splitDragfillAnswerList(wrongTd.inputEl.value);
    if (!newPassage || !correctAnswers.length) {
      window.alert("Đoạn văn và đáp án đúng không được để trống");
      return;
    }
    var result = await supabaseClient.from("game_text_dragfill").update({
      passage: newPassage,
      correct_answers: correctAnswers,
      wrong_answers: wrongAnswers
    }).eq("id", row.id);

    if (result.error) {
      window.alert("Lỗi lưu: " + result.error.message);
      return;
    }
    editingTextDragfillId = null;
    loadTextDragfillTable();
  });
  actionsTd.appendChild(saveBtn);

  var cancelBtn = document.createElement("button");
  cancelBtn.className = "admin-btn-danger";
  cancelBtn.type = "button";
  cancelBtn.textContent = "Hủy";
  cancelBtn.addEventListener("click", function () {
    editingTextDragfillId = null;
    renderTextDragfillTable(currentTextDragfillRows);
  });
  actionsTd.appendChild(cancelBtn);
  tr.appendChild(actionsTd);

  return tr;
}

async function deleteTextDragfillItem(id) {
  if (!window.confirm("Xóa bài này?")) {
    return;
  }
  var result = await supabaseClient.from("game_text_dragfill").delete().eq("id", id);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  await loadTextDragfillSetList();
  loadTextDragfillTable();
  loadCurriculumData().then(loadActivityToggles);
}

async function handleDeleteAllTextDragfill() {
  var unitId = document.getElementById("unitSelect").value;
  var setName = document.getElementById("textDragfillSetSelect").value;
  if (!window.confirm("Xóa toàn bộ " + currentTextDragfillRows.length + " bài trong bài \"" + setName + "\"? Không thể khôi phục.")) {
    return;
  }
  var result = await supabaseClient.from("game_text_dragfill").delete().eq("unit_id", unitId).eq("set_name", setName);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  await loadTextDragfillSetList();
  loadTextDragfillTable();
  loadCurriculumData().then(loadActivityToggles);
}

async function handleBulkAddTextDragfill(e) {
  e.preventDefault();

  var unitId = document.getElementById("unitSelect").value;
  var setName = document.getElementById("textDragfillSetSelect").value;
  var text = document.getElementById("bulkTextDragfillTextarea").value;
  var items = parseMathDragfillBulkText(text);

  if (!setName) {
    window.alert("Chưa có bài nào — tạo bài ở mục \"Quản lý bài\" bên trên trước");
    return;
  }

  if (!items.length) {
    window.alert("Chưa dán dữ liệu nào.");
    return;
  }

  var existingCountResult = await supabaseClient.from("game_text_dragfill").select("id", { count: "exact", head: true }).eq("unit_id", unitId).eq("set_name", setName);
  var nextSortOrder = existingCountResult.count || 0;

  var successCount = 0;
  var invalidBlocks = [];
  var notFoundBlocks = [];
  var ambiguousBlocks = [];
  var saveErrors = [];
  var i;
  for (i = 0; i < items.length; i++) {
    var item = items[i];
    if (!item.passage || !item.correct_answers.length) {
      invalidBlocks.push(i + 1);
      continue;
    }
    var missingAnswer = item.correct_answers.some(function (ans) {
      return findWholeWordFrom(item.passage, ans, 0) === -1;
    });
    if (missingAnswer) {
      notFoundBlocks.push(i + 1);
      continue;
    }
    var ambiguousAnswers = findAmbiguousDragfillAnswers(item.passage, item.correct_answers);
    if (ambiguousAnswers.length) {
      ambiguousBlocks.push(i + 1 + " (\"" + ambiguousAnswers.join("\", \"") + "\")");
      continue;
    }
    setBulkTextDragfillStatus("Đang xử lý " + (i + 1) + "/" + items.length + "...");

    var insertResult = await supabaseClient.from("game_text_dragfill").insert({
      unit_id: unitId,
      set_name: setName,
      sort_order: nextSortOrder + successCount,
      passage: item.passage,
      correct_answers: item.correct_answers,
      wrong_answers: item.wrong_answers
    });

    if (insertResult.error) {
      saveErrors.push("bài " + (i + 1) + ": " + insertResult.error.message);
      continue;
    }
    successCount++;
  }

  var summary = "Xong! Đã thêm " + successCount + "/" + items.length + " bài.";
  if (invalidBlocks.length) {
    summary += " Bỏ qua bài thiếu dữ liệu: bài " + invalidBlocks.join(", ") + ".";
  }
  if (notFoundBlocks.length) {
    summary += " Không tìm thấy đáp án đúng trong đoạn văn (kiểm tra lại từ có khớp không): bài " + notFoundBlocks.join(", ") + ".";
  }
  if (ambiguousBlocks.length) {
    summary += " Đáp án xuất hiện nhiều lần trong đoạn văn nên không rõ chỗ trống ở đâu, sửa lại câu cho từ đó chỉ xuất hiện đúng số lần cần điền: bài " + ambiguousBlocks.join("; ") + ".";
  }
  if (saveErrors.length) {
    summary += " Lỗi lưu — " + saveErrors.join("; ") + ".";
  }
  setBulkTextDragfillStatus(summary);

  document.getElementById("bulkTextDragfillTextarea").value = "";
  loadTextDragfillTable();
  loadTextDragfillSetList();
  loadCurriculumData().then(loadActivityToggles);
}
