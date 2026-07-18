/* ---------- Trắc nghiệm ngữ pháp (grammar MCQ, gạch chân đáp án) ---------- */

function setBulkGrammarMcqStatus(text) {
  document.getElementById("bulkGrammarMcqStatus").textContent = text;
}

var currentGrammarMcqRows = [];
var editingGrammarMcqId = null;

async function loadGrammarMcqTable() {
  var unitId = document.getElementById("unitSelect").value;
  var wrap = document.getElementById("grammarMcqTableWrap");
  if (!unitId) {
    wrap.innerHTML = "";
    return;
  }
  wrap.textContent = "Đang tải...";

  var result = await supabaseClient
    .from("game_grammar_mcq")
    .select("*")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true });

  if (result.error) {
    wrap.textContent = "Lỗi tải dữ liệu: " + result.error.message;
    return;
  }

  renderGrammarMcqTable(result.data);
}

function renderGrammarMcqTable(rows) {
  currentGrammarMcqRows = rows;
  var wrap = document.getElementById("grammarMcqTableWrap");
  wrap.innerHTML = "";

  if (!rows.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Unit này chưa có câu trắc nghiệm nào.";
    wrap.appendChild(empty);
    return;
  }

  var toolbar = document.createElement("div");
  toolbar.className = "admin-table-toolbar";
  var deleteAllBtn = document.createElement("button");
  deleteAllBtn.className = "admin-btn-danger";
  deleteAllBtn.type = "button";
  deleteAllBtn.textContent = "Xóa tất cả trắc nghiệm";
  deleteAllBtn.addEventListener("click", handleDeleteAllGrammarMcq);
  toolbar.appendChild(deleteAllBtn);
  wrap.appendChild(toolbar);

  var table = document.createElement("table");
  table.className = "admin-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  ["Câu hỏi", "A", "B", "C", "D", "Đáp án đúng", ""].forEach(function (h) {
    var th = document.createElement("th");
    th.textContent = h;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  rows.forEach(function (row) {
    tbody.appendChild(editingGrammarMcqId === row.id ? buildGrammarMcqEditRow(row) : buildGrammarMcqRow(row));
  });
  table.appendChild(tbody);

  wrap.appendChild(table);
}

function buildGrammarMcqRow(row) {
  var tr = document.createElement("tr");
  tr.appendChild(makeTd(row.question));
  tr.appendChild(makeTd(row.option_a));
  tr.appendChild(makeTd(row.option_b));
  tr.appendChild(makeTd(row.option_c));
  tr.appendChild(makeTd(row.option_d));
  tr.appendChild(makeTd(row.correct_option));

  var actionsTd = document.createElement("td");

  var editBtn = document.createElement("button");
  editBtn.className = "admin-btn-secondary";
  editBtn.type = "button";
  editBtn.textContent = "Sửa";
  editBtn.addEventListener("click", function () {
    editingGrammarMcqId = row.id;
    renderGrammarMcqTable(currentGrammarMcqRows);
  });
  actionsTd.appendChild(editBtn);

  var delBtn = document.createElement("button");
  delBtn.className = "admin-btn-danger";
  delBtn.type = "button";
  delBtn.textContent = "Xóa";
  delBtn.addEventListener("click", function () {
    deleteGrammarMcqItem(row.id);
  });
  actionsTd.appendChild(delBtn);
  tr.appendChild(actionsTd);

  return tr;
}

function buildGrammarMcqEditRow(row) {
  var tr = document.createElement("tr");
  tr.className = "editing-row";

  var questionTd = makeInputTd(row.question);
  var aTd = makeInputTd(row.option_a);
  var bTd = makeInputTd(row.option_b);
  var cTd = makeInputTd(row.option_c);
  var dTd = makeInputTd(row.option_d);
  var correctTd = makeInputTd(row.correct_option);

  tr.appendChild(questionTd);
  tr.appendChild(aTd);
  tr.appendChild(bTd);
  tr.appendChild(cTd);
  tr.appendChild(dTd);
  tr.appendChild(correctTd);

  var actionsTd = document.createElement("td");

  var saveBtn = document.createElement("button");
  saveBtn.className = "admin-btn-primary";
  saveBtn.type = "button";
  saveBtn.textContent = "Lưu";
  saveBtn.addEventListener("click", async function () {
    var correctOption = correctTd.inputEl.value.trim().toUpperCase();
    if (["A", "B", "C", "D"].indexOf(correctOption) === -1) {
      window.alert("Đáp án đúng phải là A, B, C hoặc D");
      return;
    }
    var result = await supabaseClient.from("game_grammar_mcq").update({
      question: questionTd.inputEl.value.trim(),
      option_a: aTd.inputEl.value.trim(),
      option_b: bTd.inputEl.value.trim(),
      option_c: cTd.inputEl.value.trim(),
      option_d: dTd.inputEl.value.trim(),
      correct_option: correctOption
    }).eq("id", row.id);

    if (result.error) {
      window.alert("Lỗi lưu: " + result.error.message);
      return;
    }
    editingGrammarMcqId = null;
    loadGrammarMcqTable();
  });
  actionsTd.appendChild(saveBtn);

  var cancelBtn = document.createElement("button");
  cancelBtn.className = "admin-btn-danger";
  cancelBtn.type = "button";
  cancelBtn.textContent = "Hủy";
  cancelBtn.addEventListener("click", function () {
    editingGrammarMcqId = null;
    renderGrammarMcqTable(currentGrammarMcqRows);
  });
  actionsTd.appendChild(cancelBtn);
  tr.appendChild(actionsTd);

  return tr;
}

async function deleteGrammarMcqItem(id) {
  if (!window.confirm("Xóa câu này?")) {
    return;
  }
  var result = await supabaseClient.from("game_grammar_mcq").delete().eq("id", id);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  loadGrammarMcqTable();
  loadCurriculumData().then(loadActivityToggles);
}

async function handleDeleteAllGrammarMcq() {
  var unitId = document.getElementById("unitSelect").value;
  if (!window.confirm("Xóa toàn bộ " + currentGrammarMcqRows.length + " câu trắc nghiệm trong Unit này? Không thể khôi phục.")) {
    return;
  }
  var result = await supabaseClient.from("game_grammar_mcq").delete().eq("unit_id", unitId);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  loadGrammarMcqTable();
  loadCurriculumData().then(loadActivityToggles);
}

function parseGrammarMcqBulkLine(line) {
  var parts = line.split("|").map(function (p) { return p.trim(); });
  return {
    question: parts[0] || "",
    option_a: parts[1] || "",
    option_b: parts[2] || "",
    option_c: parts[3] || "",
    option_d: parts[4] || "",
    correct_option: (parts[5] || "").toUpperCase()
  };
}

async function handleBulkAddGrammarMcq(e) {
  e.preventDefault();

  var unitId = document.getElementById("unitSelect").value;
  var text = document.getElementById("bulkGrammarMcqTextarea").value;
  var lines = text.split("\n").map(function (l) { return l.trim(); }).filter(function (l) { return l; });

  if (!lines.length) {
    window.alert("Chưa dán dữ liệu nào.");
    return;
  }

  var existingCountResult = await supabaseClient.from("game_grammar_mcq").select("id", { count: "exact", head: true }).eq("unit_id", unitId);
  var nextSortOrder = existingCountResult.count || 0;

  var successCount = 0;
  var invalidLines = [];
  var i;
  for (i = 0; i < lines.length; i++) {
    var item = parseGrammarMcqBulkLine(lines[i]);
    if (!item.option_a || !item.option_b || !item.option_c || !item.option_d || ["A", "B", "C", "D"].indexOf(item.correct_option) === -1) {
      invalidLines.push(i + 1);
      continue;
    }
    setBulkGrammarMcqStatus("Đang xử lý " + (i + 1) + "/" + lines.length + "...");

    var insertResult = await supabaseClient.from("game_grammar_mcq").insert({
      unit_id: unitId,
      sort_order: nextSortOrder + successCount,
      question: item.question,
      option_a: item.option_a,
      option_b: item.option_b,
      option_c: item.option_c,
      option_d: item.option_d,
      correct_option: item.correct_option
    });

    if (insertResult.error) {
      setBulkGrammarMcqStatus("Lỗi lưu dòng " + (i + 1) + ": " + insertResult.error.message);
      continue;
    }
    successCount++;
  }

  var summary = "Xong! Đã thêm " + successCount + "/" + lines.length + " câu.";
  if (invalidLines.length) {
    summary += " Bỏ qua dòng thiếu dữ liệu hoặc sai đáp án: dòng " + invalidLines.join(", ") + ".";
  }
  setBulkGrammarMcqStatus(summary);

  document.getElementById("bulkGrammarMcqTextarea").value = "";
  loadGrammarMcqTable();
  loadCurriculumData().then(loadActivityToggles);
}

/* ---------- Viết câu trả lời (grammar typing, câu hỏi / đáp án) ---------- */

function setBulkGrammarTypingStatus(text) {
  document.getElementById("bulkGrammarTypingStatus").textContent = text;
}

var currentGrammarTypingRows = [];
var editingGrammarTypingId = null;

async function loadGrammarTypingTable() {
  var unitId = document.getElementById("unitSelect").value;
  var wrap = document.getElementById("grammarTypingTableWrap");
  if (!unitId) {
    wrap.innerHTML = "";
    return;
  }
  wrap.textContent = "Đang tải...";

  var result = await supabaseClient
    .from("game_grammar_typing")
    .select("*")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true });

  if (result.error) {
    wrap.textContent = "Lỗi tải dữ liệu: " + result.error.message;
    return;
  }

  renderGrammarTypingTable(result.data);
}

function renderGrammarTypingTable(rows) {
  currentGrammarTypingRows = rows;
  var wrap = document.getElementById("grammarTypingTableWrap");
  wrap.innerHTML = "";

  if (!rows.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Unit này chưa có câu nào.";
    wrap.appendChild(empty);
    return;
  }

  var toolbar = document.createElement("div");
  toolbar.className = "admin-table-toolbar";
  var deleteAllBtn = document.createElement("button");
  deleteAllBtn.className = "admin-btn-danger";
  deleteAllBtn.type = "button";
  deleteAllBtn.textContent = "Xóa tất cả";
  deleteAllBtn.addEventListener("click", handleDeleteAllGrammarTyping);
  toolbar.appendChild(deleteAllBtn);
  wrap.appendChild(toolbar);

  var table = document.createElement("table");
  table.className = "admin-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  ["Câu hỏi", "Đáp án", ""].forEach(function (h) {
    var th = document.createElement("th");
    th.textContent = h;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  rows.forEach(function (row) {
    tbody.appendChild(editingGrammarTypingId === row.id ? buildGrammarTypingEditRow(row) : buildGrammarTypingRow(row));
  });
  table.appendChild(tbody);

  wrap.appendChild(table);
}

function buildGrammarTypingRow(row) {
  var tr = document.createElement("tr");
  tr.appendChild(makeTd(row.prompt));
  tr.appendChild(makeTd(row.answer));

  var actionsTd = document.createElement("td");

  var editBtn = document.createElement("button");
  editBtn.className = "admin-btn-secondary";
  editBtn.type = "button";
  editBtn.textContent = "Sửa";
  editBtn.addEventListener("click", function () {
    editingGrammarTypingId = row.id;
    renderGrammarTypingTable(currentGrammarTypingRows);
  });
  actionsTd.appendChild(editBtn);

  var delBtn = document.createElement("button");
  delBtn.className = "admin-btn-danger";
  delBtn.type = "button";
  delBtn.textContent = "Xóa";
  delBtn.addEventListener("click", function () {
    deleteGrammarTypingItem(row.id);
  });
  actionsTd.appendChild(delBtn);
  tr.appendChild(actionsTd);

  return tr;
}

function buildGrammarTypingEditRow(row) {
  var tr = document.createElement("tr");
  tr.className = "editing-row";

  var promptTd = makeInputTd(row.prompt);
  var answerTd = makeInputTd(row.answer);

  tr.appendChild(promptTd);
  tr.appendChild(answerTd);

  var actionsTd = document.createElement("td");

  var saveBtn = document.createElement("button");
  saveBtn.className = "admin-btn-primary";
  saveBtn.type = "button";
  saveBtn.textContent = "Lưu";
  saveBtn.addEventListener("click", async function () {
    var newPrompt = promptTd.inputEl.value.trim();
    var newAnswer = answerTd.inputEl.value.trim();
    if (!newPrompt || !newAnswer) {
      window.alert("Câu hỏi và đáp án không được để trống");
      return;
    }
    var result = await supabaseClient.from("game_grammar_typing").update({
      prompt: newPrompt,
      answer: newAnswer
    }).eq("id", row.id);

    if (result.error) {
      window.alert("Lỗi lưu: " + result.error.message);
      return;
    }
    editingGrammarTypingId = null;
    loadGrammarTypingTable();
  });
  actionsTd.appendChild(saveBtn);

  var cancelBtn = document.createElement("button");
  cancelBtn.className = "admin-btn-danger";
  cancelBtn.type = "button";
  cancelBtn.textContent = "Hủy";
  cancelBtn.addEventListener("click", function () {
    editingGrammarTypingId = null;
    renderGrammarTypingTable(currentGrammarTypingRows);
  });
  actionsTd.appendChild(cancelBtn);
  tr.appendChild(actionsTd);

  return tr;
}

async function deleteGrammarTypingItem(id) {
  if (!window.confirm("Xóa câu này?")) {
    return;
  }
  var result = await supabaseClient.from("game_grammar_typing").delete().eq("id", id);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  loadGrammarTypingTable();
  loadCurriculumData().then(loadActivityToggles);
}

async function handleDeleteAllGrammarTyping() {
  var unitId = document.getElementById("unitSelect").value;
  if (!window.confirm("Xóa toàn bộ " + currentGrammarTypingRows.length + " câu trong Unit này? Không thể khôi phục.")) {
    return;
  }
  var result = await supabaseClient.from("game_grammar_typing").delete().eq("unit_id", unitId);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  loadGrammarTypingTable();
  loadCurriculumData().then(loadActivityToggles);
}

function parseGrammarTypingBulkLine(line) {
  var parts = line.split("|").map(function (p) { return p.trim(); });
  return {
    prompt: parts[0] || "",
    answer: parts[1] || ""
  };
}

async function handleBulkAddGrammarTyping(e) {
  e.preventDefault();

  var unitId = document.getElementById("unitSelect").value;
  var text = document.getElementById("bulkGrammarTypingTextarea").value;
  var lines = text.split("\n").map(function (l) { return l.trim(); }).filter(function (l) { return l; });

  if (!lines.length) {
    window.alert("Chưa dán dữ liệu nào.");
    return;
  }

  var existingCountResult = await supabaseClient.from("game_grammar_typing").select("id", { count: "exact", head: true }).eq("unit_id", unitId);
  var nextSortOrder = existingCountResult.count || 0;

  var successCount = 0;
  var invalidLines = [];
  var i;
  for (i = 0; i < lines.length; i++) {
    var item = parseGrammarTypingBulkLine(lines[i]);
    if (!item.prompt || !item.answer) {
      invalidLines.push(i + 1);
      continue;
    }
    setBulkGrammarTypingStatus("Đang xử lý " + (i + 1) + "/" + lines.length + "...");

    var insertResult = await supabaseClient.from("game_grammar_typing").insert({
      unit_id: unitId,
      sort_order: nextSortOrder + successCount,
      prompt: item.prompt,
      answer: item.answer
    });

    if (insertResult.error) {
      setBulkGrammarTypingStatus("Lỗi lưu dòng " + (i + 1) + ": " + insertResult.error.message);
      continue;
    }
    successCount++;
  }

  var summary = "Xong! Đã thêm " + successCount + "/" + lines.length + " câu.";
  if (invalidLines.length) {
    summary += " Bỏ qua dòng thiếu dữ liệu: dòng " + invalidLines.join(", ") + ".";
  }
  setBulkGrammarTypingStatus(summary);

  document.getElementById("bulkGrammarTypingTextarea").value = "";
  loadGrammarTypingTable();
  loadCurriculumData().then(loadActivityToggles);
}
