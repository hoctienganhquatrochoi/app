/* ---------- Đọc/Nghe theo ảnh (photo quiz, ảnh đề bài + câu hỏi MC hoặc gõ, nhiều bài riêng theo tên) ---------- */

function setBulkPhotoQuizStatus(text) {
  document.getElementById("bulkPhotoQuizStatus").textContent = text;
}

function setPhotoQuizImageStatus(text) {
  document.getElementById("photoQuizImageStatus").textContent = text || "";
}

var photoQuizSetManager = createGrammarSetManager("game_photo_quiz_questions", {
  listWrap: "photoQuizSetListWrap",
  select: "photoQuizSetSelect",
  newNameInput: "newPhotoQuizSetName",
  status: "photoQuizSetStatus"
}, "câu");
photoQuizSetManager.setOnSelectChange(function () {
  loadPhotoQuizTable();
  loadPhotoQuizSetImage();
});

function loadPhotoQuizSetList() {
  return photoQuizSetManager.loadSetList();
}

function handleAddPhotoQuizSet() {
  photoQuizSetManager.handleAddSet();
}

async function loadPhotoQuizSetImage() {
  var unitId = document.getElementById("unitSelect").value;
  var setName = document.getElementById("photoQuizSetSelect").value;
  var wrap = document.getElementById("photoQuizImageWrap");
  wrap.innerHTML = "";
  setPhotoQuizImageStatus("");
  if (!setName) {
    return;
  }

  var result = await supabaseClient.from("game_photo_quiz_sets").select("image_url").eq("unit_id", unitId).eq("set_name", setName).maybeSingle();
  var imageUrl = result.data ? result.data.image_url : null;

  var picker = buildImagePicker(imageUrl, function (file) {
    showImagePreview(picker, file);
    uploadAndSetPhotoQuizImage(unitId, setName, file);
  });
  wrap.appendChild(picker.wrap);
}

async function uploadAndSetPhotoQuizImage(unitId, setName, file) {
  setPhotoQuizImageStatus("Đang tải ảnh lên...");
  var url = await uploadVocabImage(file, unitId, "pq_" + encodeURIComponent(setName));
  if (!url) {
    window.alert("Lỗi upload ảnh");
    return;
  }
  var result = await supabaseClient.from("game_photo_quiz_sets").upsert({ unit_id: unitId, set_name: setName, image_url: url });
  if (result.error) {
    window.alert("Lỗi lưu ảnh: " + result.error.message);
    return;
  }
  setPhotoQuizImageStatus("Đã lưu ảnh ✓");
  loadCurriculumData().then(loadActivityToggles);
}

var currentPhotoQuizRows = [];
var editingPhotoQuizId = null;

async function loadPhotoQuizTable() {
  var unitId = document.getElementById("unitSelect").value;
  var setName = document.getElementById("photoQuizSetSelect").value;
  var wrap = document.getElementById("photoQuizTableWrap");
  if (!setName) {
    wrap.innerHTML = "";
    return;
  }
  wrap.textContent = "Đang tải...";

  var result = await supabaseClient
    .from("game_photo_quiz_questions")
    .select("*")
    .eq("unit_id", unitId)
    .eq("set_name", setName)
    .order("sort_order", { ascending: true });

  if (result.error) {
    wrap.textContent = "Lỗi tải dữ liệu: " + result.error.message;
    return;
  }

  renderPhotoQuizTable(result.data);
}

function renderPhotoQuizTable(rows) {
  currentPhotoQuizRows = rows;
  var wrap = document.getElementById("photoQuizTableWrap");
  wrap.innerHTML = "";

  if (!rows.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Bài này chưa có câu hỏi nào.";
    wrap.appendChild(empty);
    return;
  }

  var toolbar = document.createElement("div");
  toolbar.className = "admin-table-toolbar";
  var deleteAllBtn = document.createElement("button");
  deleteAllBtn.className = "admin-btn-danger";
  deleteAllBtn.type = "button";
  deleteAllBtn.textContent = "Xóa tất cả trong bài này";
  deleteAllBtn.addEventListener("click", handleDeleteAllPhotoQuiz);
  toolbar.appendChild(deleteAllBtn);
  wrap.appendChild(toolbar);

  var table = document.createElement("table");
  table.className = "admin-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  ["Câu hỏi", "Đáp án đúng", "Đáp án sai (nếu có)", ""].forEach(function (h) {
    var th = document.createElement("th");
    th.textContent = h;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  rows.forEach(function (row) {
    tbody.appendChild(editingPhotoQuizId === row.id ? buildPhotoQuizEditRow(row) : buildPhotoQuizRow(row));
  });
  table.appendChild(tbody);

  wrap.appendChild(table);
}

function buildPhotoQuizRow(row) {
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
    editingPhotoQuizId = row.id;
    renderPhotoQuizTable(currentPhotoQuizRows);
  });
  actionsTd.appendChild(editBtn);

  var delBtn = document.createElement("button");
  delBtn.className = "admin-btn-danger";
  delBtn.type = "button";
  delBtn.textContent = "Xóa";
  delBtn.addEventListener("click", function () {
    deletePhotoQuizItem(row.id);
  });
  actionsTd.appendChild(delBtn);
  tr.appendChild(actionsTd);

  return tr;
}

function buildPhotoQuizEditRow(row) {
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
    var newQuestion = questionTd.inputEl.value.trim();
    var correctAnswer = correctTd.inputEl.value.trim();
    var wrongAnswers = wrongTd.inputEl.value.split(",").map(function (w) { return w.trim(); }).filter(function (w) { return w; });
    if (!newQuestion || !correctAnswer) {
      window.alert("Câu hỏi và đáp án đúng không được để trống");
      return;
    }
    var result = await supabaseClient.from("game_photo_quiz_questions").update({
      question: newQuestion,
      correct_answer: correctAnswer,
      wrong_answers: wrongAnswers
    }).eq("id", row.id);

    if (result.error) {
      window.alert("Lỗi lưu: " + result.error.message);
      return;
    }
    editingPhotoQuizId = null;
    loadPhotoQuizTable();
  });
  actionsTd.appendChild(saveBtn);

  var cancelBtn = document.createElement("button");
  cancelBtn.className = "admin-btn-danger";
  cancelBtn.type = "button";
  cancelBtn.textContent = "Hủy";
  cancelBtn.addEventListener("click", function () {
    editingPhotoQuizId = null;
    renderPhotoQuizTable(currentPhotoQuizRows);
  });
  actionsTd.appendChild(cancelBtn);
  tr.appendChild(actionsTd);

  return tr;
}

async function deletePhotoQuizItem(id) {
  if (!window.confirm("Xóa câu này?")) {
    return;
  }
  var result = await supabaseClient.from("game_photo_quiz_questions").delete().eq("id", id);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  await loadPhotoQuizSetList();
  loadPhotoQuizTable();
  loadCurriculumData().then(loadActivityToggles);
}

async function handleDeleteAllPhotoQuiz() {
  var unitId = document.getElementById("unitSelect").value;
  var setName = document.getElementById("photoQuizSetSelect").value;
  if (!window.confirm("Xóa toàn bộ " + currentPhotoQuizRows.length + " câu trong bài \"" + setName + "\"? Không thể khôi phục.")) {
    return;
  }
  var result = await supabaseClient.from("game_photo_quiz_questions").delete().eq("unit_id", unitId).eq("set_name", setName);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  await loadPhotoQuizSetList();
  loadPhotoQuizTable();
  loadCurriculumData().then(loadActivityToggles);
}

async function handleBulkAddPhotoQuiz(e) {
  e.preventDefault();

  var unitId = document.getElementById("unitSelect").value;
  var setName = document.getElementById("photoQuizSetSelect").value;
  var text = document.getElementById("bulkPhotoQuizTextarea").value;
  var items = parseGrammarMcqBulkText(text);

  if (!setName) {
    window.alert("Chưa có bài nào — tạo bài ở mục \"Quản lý bài\" bên trên trước");
    return;
  }

  if (!items.length) {
    window.alert("Chưa dán dữ liệu nào.");
    return;
  }

  var existingCountResult = await supabaseClient.from("game_photo_quiz_questions").select("id", { count: "exact", head: true }).eq("unit_id", unitId).eq("set_name", setName);
  var nextSortOrder = existingCountResult.count || 0;

  var successCount = 0;
  var invalidBlocks = [];
  var saveErrors = [];
  var i;
  for (i = 0; i < items.length; i++) {
    var item = items[i];
    if (!item.correct_answer) {
      invalidBlocks.push(i + 1);
      continue;
    }
    setBulkPhotoQuizStatus("Đang xử lý " + (i + 1) + "/" + items.length + "...");

    var insertResult = await supabaseClient.from("game_photo_quiz_questions").insert({
      unit_id: unitId,
      set_name: setName,
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
    summary += " Bỏ qua câu thiếu đáp án đúng: câu " + invalidBlocks.join(", ") + ".";
  }
  if (saveErrors.length) {
    summary += " Lỗi lưu — " + saveErrors.join("; ") + ".";
  }
  setBulkPhotoQuizStatus(summary);

  document.getElementById("bulkPhotoQuizTextarea").value = "";
  loadPhotoQuizTable();
  loadPhotoQuizSetList();
  loadCurriculumData().then(loadActivityToggles);
}
