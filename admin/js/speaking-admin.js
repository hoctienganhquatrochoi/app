function setBulkSpeakingStatus(text) {
  document.getElementById("bulkSpeakingStatus").textContent = text;
}

async function loadSpeakingTable() {
  var unitId = document.getElementById("unitSelect").value;
  var wrap = document.getElementById("speakingTableWrap");
  wrap.textContent = "Đang tải...";

  var result = await supabaseClient
    .from("game_speaking_questions")
    .select("*")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true });

  if (result.error) {
    wrap.textContent = "Lỗi tải dữ liệu: " + result.error.message;
    return;
  }

  renderSpeakingTable(result.data);
}

var currentSpeakingRows = [];
var editingSpeakingId = null;

async function uploadAndSetSpeakingImage(id, unitId, file) {
  var url = await uploadVocabImage(file, unitId, id);
  if (!url) {
    window.alert("Lỗi upload ảnh");
    return;
  }
  var result = await supabaseClient.from("game_speaking_questions").update({ image_url: url }).eq("id", id);
  if (result.error) {
    window.alert("Lỗi lưu ảnh: " + result.error.message);
    return;
  }
  loadSpeakingTable();
}

function makeSpeakingImageTd(row) {
  var td = document.createElement("td");
  td.className = "admin-image-cell";

  var picker = buildImagePicker(row.image_url, function (file) {
    showImagePreview(picker, file);
    uploadAndSetSpeakingImage(row.id, row.unit_id, file);
  });

  td.appendChild(picker.wrap);
  return td;
}

function renderSpeakingTable(rows) {
  currentSpeakingRows = rows;
  var wrap = document.getElementById("speakingTableWrap");
  wrap.innerHTML = "";

  if (!rows.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Unit này chưa có câu hỏi kiểm tra nói nào.";
    wrap.appendChild(empty);
    return;
  }

  var table = document.createElement("table");
  table.className = "admin-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  var headers = ["Ảnh", "Câu hỏi", "Câu trả lời", "Audio câu hỏi", ""];
  var i;
  for (i = 0; i < headers.length; i++) {
    var th = document.createElement("th");
    th.textContent = headers[i];
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  for (i = 0; i < rows.length; i++) {
    tbody.appendChild(editingSpeakingId === rows[i].id ? buildSpeakingEditRow(rows[i]) : buildSpeakingRow(rows[i]));
  }
  table.appendChild(tbody);

  wrap.appendChild(table);
}

function buildSpeakingRow(row) {
  var tr = document.createElement("tr");
  tr.appendChild(makeSpeakingImageTd(row));
  tr.appendChild(makeTd(row.question_en));
  tr.appendChild(makeTd(row.answer_en));
  tr.appendChild(makeAudioTd(row.audio_question_url));

  var actionsTd = document.createElement("td");

  var editBtn = document.createElement("button");
  editBtn.className = "admin-btn-secondary";
  editBtn.type = "button";
  editBtn.textContent = "Sửa";
  editBtn.addEventListener("click", function () {
    editingSpeakingId = row.id;
    renderSpeakingTable(currentSpeakingRows);
  });
  actionsTd.appendChild(editBtn);

  var delBtn = document.createElement("button");
  delBtn.className = "admin-btn-danger";
  delBtn.type = "button";
  delBtn.textContent = "Xóa";
  delBtn.addEventListener("click", function () {
    deleteSpeaking(row.id);
  });
  actionsTd.appendChild(delBtn);
  tr.appendChild(actionsTd);

  return tr;
}

function buildSpeakingEditRow(row) {
  var tr = document.createElement("tr");
  tr.className = "editing-row";

  var questionTd = makeInputTd(row.question_en);
  var answerTd = makeInputTd(row.answer_en);

  tr.appendChild(makeSpeakingImageTd(row));
  tr.appendChild(questionTd);
  tr.appendChild(answerTd);
  tr.appendChild(makeAudioTd(row.audio_question_url));

  var actionsTd = document.createElement("td");

  var saveBtn = document.createElement("button");
  saveBtn.className = "admin-btn-primary";
  saveBtn.type = "button";
  saveBtn.textContent = "Lưu";

  var cancelBtn = document.createElement("button");
  cancelBtn.className = "admin-btn-danger";
  cancelBtn.type = "button";
  cancelBtn.textContent = "Hủy";
  cancelBtn.addEventListener("click", function () {
    editingSpeakingId = null;
    renderSpeakingTable(currentSpeakingRows);
  });

  saveBtn.addEventListener("click", async function () {
    var newQuestion = questionTd.inputEl.value.trim();
    var newAnswer = answerTd.inputEl.value.trim();

    if (!newQuestion || !newAnswer) {
      window.alert("Câu hỏi và câu trả lời không được để trống");
      return;
    }

    saveBtn.disabled = true;
    cancelBtn.disabled = true;

    var questionChanged = newQuestion !== row.question_en;
    var updatePayload = {
      question_en: newQuestion,
      answer_en: newAnswer
    };

    if (questionChanged) {
      saveBtn.textContent = "Đang tạo âm thanh...";
      var noop = function () {};
      updatePayload.audio_question_url = await generateAudio(newQuestion, "en-US", row.unit_id + "/" + row.id + "_q.mp3", noop);
    } else {
      saveBtn.textContent = "Đang lưu...";
    }

    var result = await supabaseClient.from("game_speaking_questions").update(updatePayload).eq("id", row.id);

    if (result.error) {
      window.alert("Lỗi lưu: " + result.error.message);
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
      saveBtn.textContent = "Lưu";
      return;
    }

    editingSpeakingId = null;
    loadSpeakingTable();
  });

  actionsTd.appendChild(saveBtn);
  actionsTd.appendChild(cancelBtn);
  tr.appendChild(actionsTd);

  return tr;
}

async function deleteSpeaking(id) {
  if (!window.confirm("Xóa câu hỏi này?")) {
    return;
  }
  var result = await supabaseClient.from("game_speaking_questions").delete().eq("id", id);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  loadSpeakingTable();
}

function parseSpeakingBulkLine(line) {
  var parts = line.split("|");
  return {
    question_en: (parts[0] || "").trim(),
    answer_en: (parts[1] || "").trim()
  };
}

function parseSpeakingBulkText(text) {
  var lines = text.split("\n");
  var items = [];
  var i;
  for (i = 0; i < lines.length; i++) {
    var raw = lines[i].trim();
    if (raw) {
      items.push(parseSpeakingBulkLine(raw));
    }
  }
  return items;
}

async function handleBulkAddSpeaking(e) {
  e.preventDefault();

  var unitId = document.getElementById("unitSelect").value;
  var text = document.getElementById("bulkSpeakingTextarea").value;
  var items = parseSpeakingBulkText(text);

  if (!items.length) {
    window.alert("Chưa dán dữ liệu nào.");
    return;
  }

  var invalidLines = [];
  var validItems = [];
  var i;
  for (i = 0; i < items.length; i++) {
    if (!items[i].question_en || !items[i].answer_en) {
      invalidLines.push(i + 1);
    } else {
      validItems.push(items[i]);
    }
  }

  var successCount = 0;
  for (i = 0; i < validItems.length; i++) {
    var item = validItems[i];
    setBulkSpeakingStatus("Đang xử lý " + (i + 1) + "/" + validItems.length + ": " + item.question_en + "...");

    var insertResult = await supabaseClient
      .from("game_speaking_questions")
      .insert({
        unit_id: unitId,
        question_en: item.question_en,
        answer_en: item.answer_en
      })
      .select()
      .single();

    if (insertResult.error) {
      setBulkSpeakingStatus("Lỗi lưu \"" + item.question_en + "\": " + insertResult.error.message);
      continue;
    }

    var row = insertResult.data;
    var audioQuestionUrl = await generateAudio(item.question_en, "en-US", unitId + "/" + row.id + "_q.mp3", setBulkSpeakingStatus);

    await supabaseClient
      .from("game_speaking_questions")
      .update({ audio_question_url: audioQuestionUrl })
      .eq("id", row.id);

    successCount++;
    loadSpeakingTable();
    await sleep(800);
  }

  var summary = "Xong! Đã thêm " + successCount + "/" + validItems.length + " câu.";
  if (invalidLines.length) {
    summary += " Bỏ qua dòng thiếu dữ liệu: dòng " + invalidLines.join(", ") + ".";
  }
  setBulkSpeakingStatus(summary);

  document.getElementById("bulkSpeakingTextarea").value = "";
  loadSpeakingTable();
}
