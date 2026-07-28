/* ---------- Toán - Điền số vào chỗ trống (nhiều chỗ trống dùng chung 1 nhóm đáp án, nhiều bài riêng theo tên) ---------- */

function setBulkMathDragfillStatus(text) {
  document.getElementById("bulkMathDragfillStatus").textContent = text;
}

var mathDragfillSetManager = createGrammarSetManager("game_math_dragfill", {
  listWrap: "mathDragfillSetListWrap",
  select: "mathDragfillSetSelect",
  newNameInput: "newMathDragfillSetName",
  status: "mathDragfillSetStatus"
}, "bài");
mathDragfillSetManager.setOnSelectChange(function () {
  loadMathDragfillTable();
});

function loadMathDragfillSetList() {
  return mathDragfillSetManager.loadSetList();
}

function handleAddMathDragfillSet() {
  mathDragfillSetManager.handleAddSet();
}

var currentMathDragfillRows = [];
var editingMathDragfillId = null;

async function loadMathDragfillTable() {
  var unitId = document.getElementById("unitSelect").value;
  var setName = document.getElementById("mathDragfillSetSelect").value;
  var wrap = document.getElementById("mathDragfillTableWrap");
  if (!setName) {
    wrap.innerHTML = "";
    return;
  }
  wrap.textContent = "Đang tải...";

  var result = await supabaseClient
    .from("game_math_dragfill")
    .select("*")
    .eq("unit_id", unitId)
    .eq("set_name", setName)
    .order("sort_order", { ascending: true });

  if (result.error) {
    wrap.textContent = "Lỗi tải dữ liệu: " + result.error.message;
    return;
  }

  renderMathDragfillTable(result.data);
}

function renderMathDragfillTable(rows) {
  currentMathDragfillRows = rows;
  var wrap = document.getElementById("mathDragfillTableWrap");
  wrap.innerHTML = "";

  if (!rows.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Unit này chưa có bài toán nào.";
    wrap.appendChild(empty);
    return;
  }

  var toolbar = document.createElement("div");
  toolbar.className = "admin-table-toolbar";
  var deleteAllBtn = document.createElement("button");
  deleteAllBtn.className = "admin-btn-danger";
  deleteAllBtn.type = "button";
  deleteAllBtn.textContent = "Xóa tất cả trong bài này";
  deleteAllBtn.addEventListener("click", handleDeleteAllMathDragfill);
  toolbar.appendChild(deleteAllBtn);
  wrap.appendChild(toolbar);

  var table = document.createElement("table");
  table.className = "admin-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  ["Đề bài", "Đáp án đúng", "Đáp án sai", ""].forEach(function (h) {
    var th = document.createElement("th");
    th.textContent = h;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  rows.forEach(function (row) {
    tbody.appendChild(editingMathDragfillId === row.id ? buildMathDragfillEditRow(row) : buildMathDragfillRow(row));
  });
  table.appendChild(tbody);

  wrap.appendChild(table);
}

function buildMathDragfillRow(row) {
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
    editingMathDragfillId = row.id;
    renderMathDragfillTable(currentMathDragfillRows);
  });
  actionsTd.appendChild(editBtn);

  var delBtn = document.createElement("button");
  delBtn.className = "admin-btn-danger";
  delBtn.type = "button";
  delBtn.textContent = "Xóa";
  delBtn.addEventListener("click", function () {
    deleteMathDragfillItem(row.id);
  });
  actionsTd.appendChild(delBtn);
  tr.appendChild(actionsTd);

  return tr;
}

function buildMathDragfillEditRow(row) {
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
      window.alert("Đề bài và đáp án đúng không được để trống");
      return;
    }
    var result = await supabaseClient.from("game_math_dragfill").update({
      passage: newPassage,
      correct_answers: correctAnswers,
      wrong_answers: wrongAnswers
    }).eq("id", row.id);

    if (result.error) {
      window.alert("Lỗi lưu: " + result.error.message);
      return;
    }
    editingMathDragfillId = null;
    loadMathDragfillTable();
  });
  actionsTd.appendChild(saveBtn);

  var cancelBtn = document.createElement("button");
  cancelBtn.className = "admin-btn-danger";
  cancelBtn.type = "button";
  cancelBtn.textContent = "Hủy";
  cancelBtn.addEventListener("click", function () {
    editingMathDragfillId = null;
    renderMathDragfillTable(currentMathDragfillRows);
  });
  actionsTd.appendChild(cancelBtn);
  tr.appendChild(actionsTd);

  return tr;
}

async function deleteMathDragfillItem(id) {
  if (!window.confirm("Xóa bài toán này?")) {
    return;
  }
  var result = await supabaseClient.from("game_math_dragfill").delete().eq("id", id);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  await loadMathDragfillSetList();
  loadMathDragfillTable();
  loadCurriculumData().then(loadActivityToggles);
}

async function handleDeleteAllMathDragfill() {
  var unitId = document.getElementById("unitSelect").value;
  var setName = document.getElementById("mathDragfillSetSelect").value;
  if (!window.confirm("Xóa toàn bộ " + currentMathDragfillRows.length + " bài toán trong bài \"" + setName + "\"? Không thể khôi phục.")) {
    return;
  }
  var result = await supabaseClient.from("game_math_dragfill").delete().eq("unit_id", unitId).eq("set_name", setName);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  await loadMathDragfillSetList();
  loadMathDragfillTable();
  loadCurriculumData().then(loadActivityToggles);
}

function splitDragfillAnswerList(text) {
  return text.split(/[;,]/).map(function (w) {
    return w.trim().replace(/[.。]+$/, "").trim();
  }).filter(function (w) { return w; });
}

function findWholeWordFrom(text, word, fromIndex) {
  var escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  var re = new RegExp("\\b" + escaped + "\\b", "i");
  var remaining = text.slice(fromIndex);
  var match = remaining.match(re);
  if (!match) {
    return -1;
  }
  return fromIndex + match.index;
}

function countWholeWordOccurrences(text, word) {
  var escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  var re = new RegExp("\\b" + escaped + "\\b", "gi");
  var matches = text.match(re);
  return matches ? matches.length : 0;
}

function findAmbiguousDragfillAnswers(passage, correctAnswers) {
  var uniqueAnswers = [];
  correctAnswers.forEach(function (ans) {
    if (uniqueAnswers.indexOf(ans) === -1) {
      uniqueAnswers.push(ans);
    }
  });
  return uniqueAnswers.filter(function (ans) {
    var expectedCount = correctAnswers.filter(function (a) { return a === ans; }).length;
    var actualCount = countWholeWordOccurrences(passage, ans);
    return actualCount > expectedCount;
  });
}

function parseMathDragfillBulkBlock(block) {
  var lines = block.split("\n").map(function (l) { return l.trim(); }).filter(function (l) { return l; });
  var passageLines = [];
  var correctAnswers = [];
  var wrongAnswers = [];

  lines.forEach(function (line) {
    var correctMatch = line.match(/^đáp\s*án\s*đúng\s*:\s*(.*)$/i);
    var wrongMatch = line.match(/^đáp\s*án\s*sai\s*:\s*(.*)$/i);
    if (correctMatch) {
      correctAnswers = splitDragfillAnswerList(correctMatch[1]);
    } else if (wrongMatch) {
      wrongAnswers = splitDragfillAnswerList(wrongMatch[1]);
    } else {
      passageLines.push(stripLeadingNumbering(line));
    }
  });

  return { passage: passageLines.join("\n"), correct_answers: correctAnswers, wrong_answers: wrongAnswers };
}

function parseMathDragfillBulkText(text) {
  var blocks = text.split(/\n\s*\n/);
  return blocks.map(parseMathDragfillBulkBlock).filter(function (item) {
    return item.passage || item.correct_answers.length || item.wrong_answers.length;
  });
}

async function handleBulkAddMathDragfill(e) {
  e.preventDefault();

  var unitId = document.getElementById("unitSelect").value;
  var setName = document.getElementById("mathDragfillSetSelect").value;
  var text = document.getElementById("bulkMathDragfillTextarea").value;
  var items = parseMathDragfillBulkText(text);

  if (!setName) {
    window.alert("Chưa có bài nào — tạo bài ở mục \"Quản lý bài\" bên trên trước");
    return;
  }

  if (!items.length) {
    window.alert("Chưa dán dữ liệu nào.");
    return;
  }

  var existingCountResult = await supabaseClient.from("game_math_dragfill").select("id", { count: "exact", head: true }).eq("unit_id", unitId).eq("set_name", setName);
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
    setBulkMathDragfillStatus("Đang xử lý " + (i + 1) + "/" + items.length + "...");

    var insertResult = await supabaseClient.from("game_math_dragfill").insert({
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
    summary += " Không tìm thấy đáp án đúng trong đề bài (kiểm tra lại số có khớp không): bài " + notFoundBlocks.join(", ") + ".";
  }
  if (ambiguousBlocks.length) {
    summary += " Đáp án xuất hiện nhiều lần trong đề bài nên không rõ chỗ trống ở đâu, sửa lại câu cho từ đó chỉ xuất hiện đúng số lần cần điền: bài " + ambiguousBlocks.join("; ") + ".";
  }
  if (saveErrors.length) {
    summary += " Lỗi lưu — " + saveErrors.join("; ") + ".";
  }
  setBulkMathDragfillStatus(summary);

  document.getElementById("bulkMathDragfillTextarea").value = "";
  loadMathDragfillTable();
  loadMathDragfillSetList();
  loadCurriculumData().then(loadActivityToggles);
}
