function setBulkSpeakingStatus(text) {
  document.getElementById("bulkSpeakingStatus").textContent = text;
}

function setSpeakingTestStatus(text) {
  document.getElementById("speakingTestStatus").textContent = text || "";
}

var currentSpeakingTestNames = [];

async function loadSpeakingTestList() {
  var unitId = document.getElementById("unitSelect").value;
  var wrap = document.getElementById("speakingTestListWrap");
  wrap.textContent = "Đang tải...";

  var result = await supabaseClient
    .from("game_speaking_questions")
    .select("test_name")
    .eq("unit_id", unitId);

  if (result.error) {
    wrap.textContent = "Lỗi tải dữ liệu: " + result.error.message;
    return;
  }

  var counts = {};
  var order = [];
  result.data.forEach(function (row) {
    if (!counts[row.test_name]) {
      counts[row.test_name] = 0;
      order.push(row.test_name);
    }
    counts[row.test_name]++;
  });

  currentSpeakingTestNames = order;
  renderSpeakingTestList(order, counts);
  populateSpeakingTestSelect();
}

function renderSpeakingTestList(names, counts) {
  var wrap = document.getElementById("speakingTestListWrap");
  wrap.innerHTML = "";

  if (!names.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Unit này chưa có đề nào, tạo đề mới bên dưới.";
    wrap.appendChild(empty);
    return;
  }

  var table = document.createElement("table");
  table.className = "admin-table";
  var tbody = document.createElement("tbody");

  names.forEach(function (name) {
    var tr = document.createElement("tr");

    var nameTd = document.createElement("td");
    nameTd.textContent = name;
    tr.appendChild(nameTd);

    var countTd = document.createElement("td");
    countTd.textContent = counts[name] + " câu";
    tr.appendChild(countTd);

    var actionsTd = document.createElement("td");
    var delBtn = document.createElement("button");
    delBtn.className = "admin-btn-danger";
    delBtn.type = "button";
    delBtn.textContent = "Xóa đề";
    delBtn.addEventListener("click", function () {
      deleteSpeakingTest(name, counts[name]);
    });
    actionsTd.appendChild(delBtn);
    tr.appendChild(actionsTd);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
}

function populateSpeakingTestSelect() {
  var select = document.getElementById("speakingTestSelect");
  var previous = select.value;
  select.innerHTML = "";

  currentSpeakingTestNames.forEach(function (name) {
    var opt = document.createElement("option");
    opt.value = name;
    opt.text = name;
    select.appendChild(opt);
  });

  if (previous && Array.prototype.some.call(select.options, function (o) { return o.value === previous; })) {
    select.value = previous;
  }
}

function handleAddSpeakingTest() {
  var input = document.getElementById("newSpeakingTestName");
  var name = input.value.trim();

  if (!name) {
    window.alert("Nhập tên đề");
    return;
  }

  if (currentSpeakingTestNames.indexOf(name) !== -1) {
    document.getElementById("speakingTestSelect").value = name;
    loadSpeakingTable();
    setSpeakingTestStatus("Đề \"" + name + "\" đã có sẵn, đã chuyển sang đề này.");
    input.value = "";
    return;
  }

  currentSpeakingTestNames.push(name);
  populateSpeakingTestSelect();
  document.getElementById("speakingTestSelect").value = name;
  loadSpeakingTable();
  input.value = "";
  setSpeakingTestStatus("Đã tạo đề \"" + name + "\" — nhập câu hỏi bên dưới để lưu.");
}

async function deleteSpeakingTest(name, count) {
  if (!window.confirm("Xóa đề \"" + name + "\" cùng toàn bộ " + count + " câu hỏi trong đề này?")) {
    return;
  }
  var unitId = document.getElementById("unitSelect").value;
  var result = await supabaseClient.from("game_speaking_questions").delete().eq("unit_id", unitId).eq("test_name", name);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  await loadSpeakingTestList();
  loadSpeakingTable();
}

async function loadSpeakingTable() {
  var unitId = document.getElementById("unitSelect").value;
  var testName = document.getElementById("speakingTestSelect").value;
  var wrap = document.getElementById("speakingTableWrap");

  if (!testName) {
    wrap.innerHTML = "";
    return;
  }

  wrap.textContent = "Đang tải...";

  var result = await supabaseClient
    .from("game_speaking_questions")
    .select("*")
    .eq("unit_id", unitId)
    .eq("test_name", testName)
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
    empty.textContent = "Đề này chưa có câu hỏi kiểm tra nói nào.";
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
  loadSpeakingTestList();
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
  var testName = document.getElementById("speakingTestSelect").value;
  var text = document.getElementById("bulkSpeakingTextarea").value;
  var items = parseSpeakingBulkText(text);

  if (!testName) {
    window.alert("Chưa có đề nào — tạo đề ở mục \"Quản lý Đề\" bên trên trước");
    return;
  }

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

  var existingCountResult = await supabaseClient.from("game_speaking_questions").select("id", { count: "exact", head: true }).eq("unit_id", unitId);
  var nextSortOrder = existingCountResult.count || 0;

  var successCount = 0;
  for (i = 0; i < validItems.length; i++) {
    var item = validItems[i];
    setBulkSpeakingStatus("Đang xử lý " + (i + 1) + "/" + validItems.length + ": " + item.question_en + "...");

    var insertResult = await supabaseClient
      .from("game_speaking_questions")
      .insert({
        unit_id: unitId,
        test_name: testName,
        sort_order: nextSortOrder + i,
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
  loadSpeakingTestList();
}
