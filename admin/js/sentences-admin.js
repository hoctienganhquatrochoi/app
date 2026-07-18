function setBulkSentenceStatus(text) {
  document.getElementById("bulkSentenceStatus").textContent = text;
}

var currentSentenceRows = [];
var editingSentenceId = null;
var sentenceBulkEditMode = false;
var sentenceBulkEditRefs = [];

async function loadSentenceTable() {
  var unitId = document.getElementById("unitSelect").value;
  var wrap = document.getElementById("sentenceTableWrap");
  if (!unitId) {
    wrap.innerHTML = "";
    return;
  }
  wrap.textContent = "Đang tải...";

  var result = await supabaseClient
    .from("game_sentences")
    .select("*")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true });

  if (result.error) {
    wrap.textContent = "Lỗi tải dữ liệu: " + result.error.message;
    return;
  }

  renderSentenceTable(result.data);
}

function buildSentenceToolbar() {
  var toolbar = document.createElement("div");
  toolbar.className = "admin-table-toolbar";

  if (sentenceBulkEditMode) {
    var saveAllBtn = document.createElement("button");
    saveAllBtn.className = "admin-btn-primary";
    saveAllBtn.type = "button";
    saveAllBtn.textContent = "Lưu tất cả";
    saveAllBtn.addEventListener("click", handleSaveAllSentences);
    toolbar.appendChild(saveAllBtn);

    var cancelAllBtn = document.createElement("button");
    cancelAllBtn.className = "admin-btn-secondary";
    cancelAllBtn.type = "button";
    cancelAllBtn.textContent = "Hủy";
    cancelAllBtn.addEventListener("click", function () {
      sentenceBulkEditMode = false;
      renderSentenceTable(currentSentenceRows);
    });
    toolbar.appendChild(cancelAllBtn);

    var status = document.createElement("span");
    status.className = "admin-status";
    status.id = "saveAllSentenceStatus";
    toolbar.appendChild(status);
  } else {
    var editAllBtn = document.createElement("button");
    editAllBtn.className = "admin-btn-secondary";
    editAllBtn.type = "button";
    editAllBtn.textContent = "Sửa tất cả";
    editAllBtn.addEventListener("click", function () {
      sentenceBulkEditMode = true;
      renderSentenceTable(currentSentenceRows);
    });
    toolbar.appendChild(editAllBtn);

    var deleteAllBtn = document.createElement("button");
    deleteAllBtn.className = "admin-btn-danger";
    deleteAllBtn.type = "button";
    deleteAllBtn.textContent = "Xóa tất cả mẫu câu";
    deleteAllBtn.addEventListener("click", handleDeleteAllSentences);
    toolbar.appendChild(deleteAllBtn);
  }

  return toolbar;
}

async function handleDeleteAllSentences() {
  var unitId = document.getElementById("unitSelect").value;
  if (!window.confirm("Xóa toàn bộ " + currentSentenceRows.length + " mẫu câu trong Unit này? Không thể khôi phục.")) {
    return;
  }
  var result = await supabaseClient.from("game_sentences").delete().eq("unit_id", unitId);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  loadSentenceTable();
  loadCurriculumData().then(loadActivityToggles);
}

function renderSentenceTable(rows) {
  currentSentenceRows = rows;
  var wrap = document.getElementById("sentenceTableWrap");
  wrap.innerHTML = "";

  if (!rows.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Unit này chưa có mẫu câu nào.";
    wrap.appendChild(empty);
    return;
  }

  wrap.appendChild(buildSentenceToolbar());

  var table = document.createElement("table");
  table.className = "admin-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  var headers = ["Câu tiếng Anh", "Phiên âm", "Nghĩa tiếng Việt", "Audio", ""];
  var i;
  for (i = 0; i < headers.length; i++) {
    var th = document.createElement("th");
    th.textContent = headers[i];
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  sentenceBulkEditRefs = [];
  for (i = 0; i < rows.length; i++) {
    if (sentenceBulkEditMode) {
      tbody.appendChild(buildSentenceBulkEditRow(rows[i]));
    } else {
      tbody.appendChild(buildSentenceRow(rows[i]));
    }
  }
  table.appendChild(tbody);

  wrap.appendChild(table);
}

function buildSentenceRow(row) {
  if (editingSentenceId === row.id) {
    return buildSentenceEditRow(row);
  }

  var tr = document.createElement("tr");
  tr.appendChild(makeTd(row.sentence_en));
  tr.appendChild(makeTd(row.phonetic));
  tr.appendChild(makeTd(row.meaning_vi));
  tr.appendChild(makeAudioTd(row.audio_en_url));

  var actionsTd = document.createElement("td");

  var editBtn = document.createElement("button");
  editBtn.className = "admin-btn-secondary";
  editBtn.type = "button";
  editBtn.textContent = "Sửa";
  editBtn.addEventListener("click", function () {
    editingSentenceId = row.id;
    renderSentenceTable(currentSentenceRows);
  });
  actionsTd.appendChild(editBtn);

  var delBtn = document.createElement("button");
  delBtn.className = "admin-btn-danger";
  delBtn.type = "button";
  delBtn.textContent = "Xóa";
  delBtn.addEventListener("click", function () {
    deleteSentence(row.id);
  });
  actionsTd.appendChild(delBtn);
  tr.appendChild(actionsTd);

  return tr;
}

function buildSentenceEditRow(row) {
  var tr = document.createElement("tr");
  tr.className = "editing-row";

  var sentenceTd = makeInputTd(row.sentence_en);
  var phoneticTd = makeInputTd(row.phonetic);
  var meaningTd = makeInputTd(row.meaning_vi);

  tr.appendChild(sentenceTd);
  tr.appendChild(phoneticTd);
  tr.appendChild(meaningTd);
  tr.appendChild(makeAudioTd(row.audio_en_url));

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
    editingSentenceId = null;
    renderSentenceTable(currentSentenceRows);
  });

  saveBtn.addEventListener("click", async function () {
    var newSentenceEn = sentenceTd.inputEl.value.trim();
    var newPhonetic = phoneticTd.inputEl.value.trim();
    var newMeaningVi = meaningTd.inputEl.value.trim();

    if (!newSentenceEn || !newMeaningVi) {
      window.alert("Câu tiếng Anh và Nghĩa tiếng Việt không được để trống");
      return;
    }

    saveBtn.disabled = true;
    cancelBtn.disabled = true;

    var textChanged = newSentenceEn !== row.sentence_en;
    var updatePayload = {
      sentence_en: newSentenceEn,
      phonetic: newPhonetic,
      meaning_vi: newMeaningVi
    };

    if (textChanged) {
      saveBtn.textContent = "Đang tạo âm thanh...";
      var noop = function () {};
      updatePayload.audio_en_url = await generateAudio(newSentenceEn, "en-US", row.unit_id + "/" + row.id + "_en.mp3", noop);
    } else {
      saveBtn.textContent = "Đang lưu...";
    }

    var result = await supabaseClient.from("game_sentences").update(updatePayload).eq("id", row.id);

    if (result.error) {
      window.alert("Lỗi lưu: " + result.error.message);
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
      saveBtn.textContent = "Lưu";
      return;
    }

    editingSentenceId = null;
    loadSentenceTable();
  });

  actionsTd.appendChild(saveBtn);
  actionsTd.appendChild(cancelBtn);
  tr.appendChild(actionsTd);

  return tr;
}

function buildSentenceBulkEditRow(row) {
  var tr = document.createElement("tr");
  tr.className = "editing-row";

  var sentenceTd = makeInputTd(row.sentence_en);
  var phoneticTd = makeInputTd(row.phonetic);
  var meaningTd = makeInputTd(row.meaning_vi);

  tr.appendChild(sentenceTd);
  tr.appendChild(phoneticTd);
  tr.appendChild(meaningTd);
  tr.appendChild(makeAudioTd(row.audio_en_url));
  tr.appendChild(document.createElement("td"));

  sentenceBulkEditRefs.push({ row: row, sentenceTd: sentenceTd, phoneticTd: phoneticTd, meaningTd: meaningTd });

  return tr;
}

async function handleSaveAllSentences() {
  var statusEl = document.getElementById("saveAllSentenceStatus");
  var i;
  for (i = 0; i < sentenceBulkEditRefs.length; i++) {
    var ref = sentenceBulkEditRefs[i];
    var newSentenceEn = ref.sentenceTd.inputEl.value.trim();
    var newPhonetic = ref.phoneticTd.inputEl.value.trim();
    var newMeaningVi = ref.meaningTd.inputEl.value.trim();
    if (!newSentenceEn || !newMeaningVi) {
      continue;
    }

    statusEl.textContent = "Đang lưu " + (i + 1) + "/" + sentenceBulkEditRefs.length + "...";

    var updatePayload = { sentence_en: newSentenceEn, phonetic: newPhonetic, meaning_vi: newMeaningVi };
    if (newSentenceEn !== ref.row.sentence_en) {
      var noop = function () {};
      updatePayload.audio_en_url = await generateAudio(newSentenceEn, "en-US", ref.row.unit_id + "/" + ref.row.id + "_en.mp3", noop);
    }

    await supabaseClient.from("game_sentences").update(updatePayload).eq("id", ref.row.id);
  }

  statusEl.textContent = "Đã lưu ✓";
  sentenceBulkEditMode = false;
  loadSentenceTable();
}

async function deleteSentence(id) {
  if (!window.confirm("Xóa câu này?")) {
    return;
  }
  var result = await supabaseClient.from("game_sentences").delete().eq("id", id);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  loadSentenceTable();
  loadCurriculumData().then(loadActivityToggles);
}

function parseSentenceBulkLine(line) {
  if (line.indexOf("|") !== -1) {
    var parts = line.split("|");
    return {
      sentence_en: (parts[0] || "").trim(),
      phonetic: (parts[1] || "").trim(),
      meaning_vi: (parts[2] || "").trim()
    };
  }

  var slashMatch = line.match(/^(.+?)\s+\/([^/]+)\/\s*[-–]?\s*(.*)$/);
  if (slashMatch) {
    return {
      sentence_en: slashMatch[1].trim(),
      phonetic: "/" + slashMatch[2].trim() + "/",
      meaning_vi: slashMatch[3].trim()
    };
  }

  return {
    sentence_en: line.trim(),
    phonetic: "",
    meaning_vi: ""
  };
}

function parseSentenceBulkText(text) {
  var lines = text.split("\n");
  var items = [];
  var i;
  for (i = 0; i < lines.length; i++) {
    var raw = lines[i].trim();
    if (raw) {
      items.push(parseSentenceBulkLine(raw));
    }
  }
  return items;
}

async function handleBulkAddSentences(e) {
  e.preventDefault();

  var unitId = document.getElementById("unitSelect").value;
  var text = document.getElementById("bulkSentenceTextarea").value;
  var items = parseSentenceBulkText(text);

  if (!items.length) {
    window.alert("Chưa dán dữ liệu nào.");
    return;
  }

  var invalidLines = [];
  var validItems = [];
  var i;
  for (i = 0; i < items.length; i++) {
    if (!items[i].sentence_en) {
      invalidLines.push(i + 1);
    } else {
      validItems.push(items[i]);
    }
  }

  var existingCountResult = await supabaseClient.from("game_sentences").select("id", { count: "exact", head: true }).eq("unit_id", unitId);
  var nextSortOrder = existingCountResult.count || 0;

  var successCount = 0;
  for (i = 0; i < validItems.length; i++) {
    var item = validItems[i];
    setBulkSentenceStatus("Đang xử lý " + (i + 1) + "/" + validItems.length + ": " + item.sentence_en + "...");

    if (!item.phonetic) {
      item.phonetic = await lookupPhonetic(item.sentence_en);
    }
    if (!item.meaning_vi) {
      item.meaning_vi = await translateToVietnamese(item.sentence_en, setBulkSentenceStatus);
    }

    var insertResult = await supabaseClient
      .from("game_sentences")
      .insert({
        unit_id: unitId,
        sort_order: nextSortOrder + i,
        sentence_en: item.sentence_en,
        phonetic: item.phonetic,
        meaning_vi: item.meaning_vi
      })
      .select()
      .single();

    if (insertResult.error) {
      setBulkSentenceStatus("Lỗi lưu \"" + item.sentence_en + "\": " + insertResult.error.message);
      continue;
    }

    var row = insertResult.data;
    var audioEnUrl = await generateAudio(item.sentence_en, "en-US", unitId + "/" + row.id + "_en.mp3", setBulkSentenceStatus);

    await supabaseClient
      .from("game_sentences")
      .update({ audio_en_url: audioEnUrl })
      .eq("id", row.id);

    successCount++;
    loadSentenceTable();
    await sleep(800);
  }

  var summary = "Xong! Đã thêm " + successCount + "/" + validItems.length + " câu.";
  if (invalidLines.length) {
    summary += " Bỏ qua dòng thiếu dữ liệu: dòng " + invalidLines.join(", ") + ".";
  }
  setBulkSentenceStatus(summary);

  document.getElementById("bulkSentenceTextarea").value = "";
  loadSentenceTable();
  loadCurriculumData().then(loadActivityToggles);
}
