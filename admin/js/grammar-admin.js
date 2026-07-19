function stripLeadingNumbering(text) {
  return (text || "").replace(/^\s*(câu|question)?\s*\d+\s*[\.\):]\s*/i, "").trim();
}

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
  ["Câu hỏi", "Đáp án đúng", "Đáp án sai", ""].forEach(function (h) {
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
  tr.appendChild(makeTd(row.correct_answer));
  tr.appendChild(makeTd((row.wrong_answers || []).join(", ")));

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
  var correctTd = makeInputTd(row.correct_answer);
  var wrongTd = makeInputTd((row.wrong_answers || []).join(", "));

  tr.appendChild(questionTd);
  tr.appendChild(correctTd);
  tr.appendChild(wrongTd);

  var actionsTd = document.createElement("td");

  var saveBtn = document.createElement("button");
  saveBtn.className = "admin-btn-primary";
  saveBtn.type = "button";
  saveBtn.textContent = "Lưu";
  saveBtn.addEventListener("click", async function () {
    var correctAnswer = correctTd.inputEl.value.trim();
    var wrongAnswers = wrongTd.inputEl.value.split(",").map(function (w) { return w.trim(); }).filter(function (w) { return w; });
    if (!correctAnswer || !wrongAnswers.length) {
      window.alert("Đáp án đúng và đáp án sai không được để trống");
      return;
    }
    var result = await supabaseClient.from("game_grammar_mcq").update({
      question: questionTd.inputEl.value.trim(),
      correct_answer: correctAnswer,
      wrong_answers: wrongAnswers
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

function parseGrammarMcqBulkBlock(block) {
  var lines = block.split("\n").map(function (l) { return l.trim(); }).filter(function (l) { return l; });
  var question = "";
  var correctAnswer = "";
  var wrongAnswers = [];

  lines.forEach(function (line) {
    var correctMatch = line.match(/^đáp\s*án\s*đúng\s*:\s*(.*)$/i);
    var wrongMatch = line.match(/^đáp\s*án\s*sai\s*:\s*(.*)$/i);
    if (correctMatch) {
      correctAnswer = correctMatch[1].trim();
    } else if (wrongMatch) {
      wrongAnswers = wrongMatch[1].split(",").map(function (w) { return w.trim(); }).filter(function (w) { return w; });
    } else if (!question) {
      question = stripLeadingNumbering(line);
    }
  });

  return { question: question, correct_answer: correctAnswer, wrong_answers: wrongAnswers };
}

function parseGrammarMcqBulkText(text) {
  var blocks = text.split(/\n\s*\n/);
  return blocks.map(parseGrammarMcqBulkBlock).filter(function (item) {
    return item.correct_answer || item.wrong_answers.length;
  });
}

async function handleBulkAddGrammarMcq(e) {
  e.preventDefault();

  var unitId = document.getElementById("unitSelect").value;
  var text = document.getElementById("bulkGrammarMcqTextarea").value;
  var items = parseGrammarMcqBulkText(text);

  if (!items.length) {
    window.alert("Chưa dán dữ liệu nào.");
    return;
  }

  var existingCountResult = await supabaseClient.from("game_grammar_mcq").select("id", { count: "exact", head: true }).eq("unit_id", unitId);
  var nextSortOrder = existingCountResult.count || 0;

  var successCount = 0;
  var invalidBlocks = [];
  var saveErrors = [];
  var i;
  for (i = 0; i < items.length; i++) {
    var item = items[i];
    if (!item.correct_answer || !item.wrong_answers.length) {
      invalidBlocks.push(i + 1);
      continue;
    }
    setBulkGrammarMcqStatus("Đang xử lý " + (i + 1) + "/" + items.length + "...");

    var insertResult = await supabaseClient.from("game_grammar_mcq").insert({
      unit_id: unitId,
      sort_order: nextSortOrder + successCount,
      question: item.question,
      correct_answer: item.correct_answer,
      wrong_answers: item.wrong_answers
    });

    if (insertResult.error) {
      saveErrors.push("câu " + (i + 1) + ": " + insertResult.error.message);
      continue;
    }
    successCount++;
  }

  var summary = "Xong! Đã thêm " + successCount + "/" + items.length + " câu.";
  if (invalidBlocks.length) {
    summary += " Bỏ qua câu thiếu đáp án đúng/sai: câu " + invalidBlocks.join(", ") + ".";
  }
  if (saveErrors.length) {
    summary += " Lỗi lưu — " + saveErrors.join("; ") + ".";
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
    prompt: stripLeadingNumbering(parts[0] || ""),
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
  var saveErrors = [];
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
      saveErrors.push("dòng " + (i + 1) + ": " + insertResult.error.message);
      continue;
    }
    successCount++;
  }

  var summary = "Xong! Đã thêm " + successCount + "/" + lines.length + " câu.";
  if (invalidLines.length) {
    summary += " Bỏ qua dòng thiếu dữ liệu: dòng " + invalidLines.join(", ") + ".";
  }
  if (saveErrors.length) {
    summary += " Lỗi lưu — " + saveErrors.join("; ") + ".";
  }
  setBulkGrammarTypingStatus(summary);

  document.getElementById("bulkGrammarTypingTextarea").value = "";
  loadGrammarTypingTable();
  loadCurriculumData().then(loadActivityToggles);
}

/* ---------- Nối câu (matching pairs, vế trái / vế phải) ---------- */

function setBulkGrammarMatchingStatus(text) {
  document.getElementById("bulkGrammarMatchingStatus").textContent = text;
}

var currentGrammarMatchingRows = [];
var editingGrammarMatchingId = null;

async function loadGrammarMatchingTable() {
  var unitId = document.getElementById("unitSelect").value;
  var wrap = document.getElementById("grammarMatchingTableWrap");
  if (!unitId) {
    wrap.innerHTML = "";
    return;
  }
  wrap.textContent = "Đang tải...";

  var result = await supabaseClient
    .from("game_grammar_matching")
    .select("*")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true });

  if (result.error) {
    wrap.textContent = "Lỗi tải dữ liệu: " + result.error.message;
    return;
  }

  renderGrammarMatchingTable(result.data);
}

function renderGrammarMatchingTable(rows) {
  currentGrammarMatchingRows = rows;
  var wrap = document.getElementById("grammarMatchingTableWrap");
  wrap.innerHTML = "";

  if (!rows.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Unit này chưa có cặp nối nào.";
    wrap.appendChild(empty);
    return;
  }

  var toolbar = document.createElement("div");
  toolbar.className = "admin-table-toolbar";
  var deleteAllBtn = document.createElement("button");
  deleteAllBtn.className = "admin-btn-danger";
  deleteAllBtn.type = "button";
  deleteAllBtn.textContent = "Xóa tất cả";
  deleteAllBtn.addEventListener("click", handleDeleteAllGrammarMatching);
  toolbar.appendChild(deleteAllBtn);
  wrap.appendChild(toolbar);

  var table = document.createElement("table");
  table.className = "admin-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  ["Vế trái", "Vế phải", ""].forEach(function (h) {
    var th = document.createElement("th");
    th.textContent = h;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  rows.forEach(function (row) {
    tbody.appendChild(editingGrammarMatchingId === row.id ? buildGrammarMatchingEditRow(row) : buildGrammarMatchingRow(row));
  });
  table.appendChild(tbody);

  wrap.appendChild(table);
}

function buildGrammarMatchingRow(row) {
  var tr = document.createElement("tr");
  tr.appendChild(makeTd(row.left_text));
  tr.appendChild(makeTd(row.right_text));

  var actionsTd = document.createElement("td");

  var editBtn = document.createElement("button");
  editBtn.className = "admin-btn-secondary";
  editBtn.type = "button";
  editBtn.textContent = "Sửa";
  editBtn.addEventListener("click", function () {
    editingGrammarMatchingId = row.id;
    renderGrammarMatchingTable(currentGrammarMatchingRows);
  });
  actionsTd.appendChild(editBtn);

  var delBtn = document.createElement("button");
  delBtn.className = "admin-btn-danger";
  delBtn.type = "button";
  delBtn.textContent = "Xóa";
  delBtn.addEventListener("click", function () {
    deleteGrammarMatchingItem(row.id);
  });
  actionsTd.appendChild(delBtn);
  tr.appendChild(actionsTd);

  return tr;
}

function buildGrammarMatchingEditRow(row) {
  var tr = document.createElement("tr");
  tr.className = "editing-row";

  var leftTd = makeInputTd(row.left_text);
  var rightTd = makeInputTd(row.right_text);

  tr.appendChild(leftTd);
  tr.appendChild(rightTd);

  var actionsTd = document.createElement("td");

  var saveBtn = document.createElement("button");
  saveBtn.className = "admin-btn-primary";
  saveBtn.type = "button";
  saveBtn.textContent = "Lưu";
  saveBtn.addEventListener("click", async function () {
    var newLeft = leftTd.inputEl.value.trim();
    var newRight = rightTd.inputEl.value.trim();
    if (!newLeft || !newRight) {
      window.alert("Vế trái và vế phải không được để trống");
      return;
    }
    var result = await supabaseClient.from("game_grammar_matching").update({
      left_text: newLeft,
      right_text: newRight
    }).eq("id", row.id);

    if (result.error) {
      window.alert("Lỗi lưu: " + result.error.message);
      return;
    }
    editingGrammarMatchingId = null;
    loadGrammarMatchingTable();
  });
  actionsTd.appendChild(saveBtn);

  var cancelBtn = document.createElement("button");
  cancelBtn.className = "admin-btn-danger";
  cancelBtn.type = "button";
  cancelBtn.textContent = "Hủy";
  cancelBtn.addEventListener("click", function () {
    editingGrammarMatchingId = null;
    renderGrammarMatchingTable(currentGrammarMatchingRows);
  });
  actionsTd.appendChild(cancelBtn);
  tr.appendChild(actionsTd);

  return tr;
}

async function deleteGrammarMatchingItem(id) {
  if (!window.confirm("Xóa cặp này?")) {
    return;
  }
  var result = await supabaseClient.from("game_grammar_matching").delete().eq("id", id);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  loadGrammarMatchingTable();
  loadCurriculumData().then(loadActivityToggles);
}

async function handleDeleteAllGrammarMatching() {
  var unitId = document.getElementById("unitSelect").value;
  if (!window.confirm("Xóa toàn bộ " + currentGrammarMatchingRows.length + " cặp nối trong Unit này? Không thể khôi phục.")) {
    return;
  }
  var result = await supabaseClient.from("game_grammar_matching").delete().eq("unit_id", unitId);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  loadGrammarMatchingTable();
  loadCurriculumData().then(loadActivityToggles);
}

function parseGrammarMatchingBulkLine(line) {
  var parts = line.split("|").map(function (p) { return p.trim(); });
  return {
    left_text: stripLeadingNumbering(parts[0] || ""),
    right_text: parts[1] || ""
  };
}

async function handleBulkAddGrammarMatching(e) {
  e.preventDefault();

  var unitId = document.getElementById("unitSelect").value;
  var text = document.getElementById("bulkGrammarMatchingTextarea").value;
  var lines = text.split("\n").map(function (l) { return l.trim(); }).filter(function (l) { return l; });

  if (!lines.length) {
    window.alert("Chưa dán dữ liệu nào.");
    return;
  }

  var existingCountResult = await supabaseClient.from("game_grammar_matching").select("id", { count: "exact", head: true }).eq("unit_id", unitId);
  var nextSortOrder = existingCountResult.count || 0;

  var successCount = 0;
  var invalidLines = [];
  var saveErrors = [];
  var i;
  for (i = 0; i < lines.length; i++) {
    var item = parseGrammarMatchingBulkLine(lines[i]);
    if (!item.left_text || !item.right_text) {
      invalidLines.push(i + 1);
      continue;
    }
    setBulkGrammarMatchingStatus("Đang xử lý " + (i + 1) + "/" + lines.length + "...");

    var insertResult = await supabaseClient.from("game_grammar_matching").insert({
      unit_id: unitId,
      sort_order: nextSortOrder + successCount,
      left_text: item.left_text,
      right_text: item.right_text
    });

    if (insertResult.error) {
      saveErrors.push("dòng " + (i + 1) + ": " + insertResult.error.message);
      continue;
    }
    successCount++;
  }

  var summary = "Xong! Đã thêm " + successCount + "/" + lines.length + " cặp.";
  if (invalidLines.length) {
    summary += " Bỏ qua dòng thiếu dữ liệu: dòng " + invalidLines.join(", ") + ".";
  }
  if (saveErrors.length) {
    summary += " Lỗi lưu — " + saveErrors.join("; ") + ".";
  }
  setBulkGrammarMatchingStatus(summary);

  document.getElementById("bulkGrammarMatchingTextarea").value = "";
  loadGrammarMatchingTable();
  loadCurriculumData().then(loadActivityToggles);
}
