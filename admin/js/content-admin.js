function stripParenthetical(text) {
  return (text || "").replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
}

var VOCAB_AUDIO_BUCKET = "vocab-audio";
var VOCAB_AUDIO_PUBLIC_PREFIX = "/storage/v1/object/public/" + VOCAB_AUDIO_BUCKET + "/";

async function isAudioUrlStillReferenced(url) {
  var checks = await Promise.all([
    supabaseClient.from("game_vocab").select("id", { count: "exact", head: true }).eq("audio_en_url", url),
    supabaseClient.from("game_vocab").select("id", { count: "exact", head: true }).eq("audio_vi_url", url),
    supabaseClient.from("game_sentences").select("id", { count: "exact", head: true }).eq("audio_en_url", url),
    supabaseClient.from("game_speaking_questions").select("id", { count: "exact", head: true }).eq("audio_question_url", url)
  ]);
  return checks.some(function (r) { return (r.count || 0) > 0; });
}

async function deleteAudioFileForUrl(url) {
  if (!url) {
    return;
  }
  var idx = url.indexOf(VOCAB_AUDIO_PUBLIC_PREFIX);
  if (idx === -1) {
    return;
  }
  var stillReferenced = await isAudioUrlStillReferenced(url);
  if (stillReferenced) {
    return;
  }
  var path = url.slice(idx + VOCAB_AUDIO_PUBLIC_PREFIX.length);
  await supabaseClient.storage.from(VOCAB_AUDIO_BUCKET).remove([path]);
}

function populateUnitSelect(selectId) {
  var select = document.getElementById(selectId || "unitSelect");
  var previous = select.value;
  select.innerHTML = "";
  var c, s, u;
  for (c = 0; c < DATA.classes.length; c++) {
    var cls = DATA.classes[c];
    var subjects = DATA.subjectsByClass[cls.id] || [];
    for (s = 0; s < subjects.length; s++) {
      var subj = subjects[s];
      for (u = 0; u < subj.units.length; u++) {
        var unit = subj.units[u];
        var opt = document.createElement("option");
        opt.value = unit.id;
        opt.text = cls.name + " › " + subj.name + " › " + unitDisplayName(unit);
        select.appendChild(opt);
      }
    }
  }
  if (previous && Array.prototype.some.call(select.options, function (o) { return o.value === previous; })) {
    select.value = previous;
  }
}

function makeTd(text) {
  var td = document.createElement("td");
  td.textContent = text || "";
  return td;
}

function makeAudioTd(url) {
  var td = document.createElement("td");
  if (url) {
    var audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "metadata";
    audio.src = url;
    audio.style.width = "150px";
    td.appendChild(audio);
  } else {
    td.textContent = "—";
  }
  return td;
}

function buildImagePicker(imageUrl, onFile) {
  var wrap = document.createElement("div");
  wrap.className = "admin-image-picker";
  wrap.tabIndex = 0;
  wrap.title = "Bấm vào đây rồi Ctrl+V để dán ảnh";

  var preview = document.createElement("div");
  preview.className = "admin-image-picker-preview";
  wrap.appendChild(preview);

  var fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";

  var browseBtn = document.createElement("button");
  browseBtn.type = "button";
  browseBtn.className = "admin-image-browse-btn";
  browseBtn.title = "Chọn ảnh có sẵn trong máy";
  browseBtn.textContent = "📁";
  browseBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener("change", function () {
    if (fileInput.files && fileInput.files[0]) {
      onFile(fileInput.files[0]);
    }
  });

  wrap.addEventListener("paste", function (e) {
    var items = (e.clipboardData && e.clipboardData.items) || [];
    var i;
    for (i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        var file = items[i].getAsFile();
        if (file) {
          onFile(file);
        }
        e.preventDefault();
        return;
      }
    }
  });

  wrap.appendChild(browseBtn);
  wrap.appendChild(fileInput);

  var picker = { wrap: wrap, preview: preview };
  setImagePickerImage(picker, imageUrl);
  return picker;
}

function setImagePickerImage(picker, imageUrl) {
  picker.preview.innerHTML = "";
  if (imageUrl) {
    var img = document.createElement("img");
    img.src = imageUrl;
    picker.preview.appendChild(img);
  } else {
    var hint = document.createElement("span");
    hint.className = "admin-image-picker-hint";
    hint.textContent = "Dán ảnh";
    picker.preview.appendChild(hint);
  }
}

function showImagePreview(picker, file) {
  picker.preview.innerHTML = "";
  var img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  picker.preview.appendChild(img);
}

function fileExtension(file) {
  if (file.type.indexOf("png") !== -1) {
    return "png";
  }
  if (file.type.indexOf("webp") !== -1) {
    return "webp";
  }
  return "jpg";
}

async function uploadVocabImage(file, unitId, vocabId) {
  var path = unitId + "/" + vocabId + "." + fileExtension(file);
  var uploadResult = await supabaseClient.storage
    .from("vocab-images")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadResult.error) {
    return null;
  }

  var publicUrlResult = supabaseClient.storage.from("vocab-images").getPublicUrl(path);
  return publicUrlResult.data.publicUrl + "?v=" + Date.now();
}

async function uploadAndSetVocabImage(vocabId, unitId, file) {
  var url = await uploadVocabImage(file, unitId, vocabId);
  if (!url) {
    window.alert("Lỗi upload ảnh");
    return;
  }
  var result = await supabaseClient.from("game_vocab").update({ image_url: url }).eq("id", vocabId);
  if (result.error) {
    window.alert("Lỗi lưu ảnh: " + result.error.message);
    return;
  }
  loadVocabTable();
}

function makeImageTd(row) {
  var td = document.createElement("td");
  td.className = "admin-image-cell";

  var picker = buildImagePicker(row.image_url, function (file) {
    showImagePreview(picker, file);
    uploadAndSetVocabImage(row.id, row.unit_id, file);
  });

  td.appendChild(picker.wrap);
  return td;
}

async function loadVocabTable() {
  var unitId = document.getElementById("unitSelect").value;
  var wrap = document.getElementById("vocabTableWrap");
  wrap.textContent = "Đang tải...";

  var result = await supabaseClient
    .from("game_vocab")
    .select("*")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true });

  if (result.error) {
    wrap.textContent = "Lỗi tải dữ liệu: " + result.error.message;
    return;
  }

  renderVocabTable(result.data);
}

var currentVocabRows = [];
var editingVocabId = null;
var bulkEditMode = false;
var bulkEditRefs = [];

function buildVocabToolbar() {
  var toolbar = document.createElement("div");
  toolbar.className = "admin-table-toolbar";

  if (bulkEditMode) {
    var saveAllBtn = document.createElement("button");
    saveAllBtn.className = "admin-btn-primary";
    saveAllBtn.type = "button";
    saveAllBtn.id = "saveAllBtn";
    saveAllBtn.textContent = "Lưu tất cả";
    saveAllBtn.addEventListener("click", handleSaveAll);
    toolbar.appendChild(saveAllBtn);

    var cancelAllBtn = document.createElement("button");
    cancelAllBtn.className = "admin-btn-secondary";
    cancelAllBtn.type = "button";
    cancelAllBtn.textContent = "Hủy";
    cancelAllBtn.addEventListener("click", function () {
      bulkEditMode = false;
      renderVocabTable(currentVocabRows);
    });
    toolbar.appendChild(cancelAllBtn);

    var status = document.createElement("span");
    status.className = "admin-status";
    status.id = "saveAllStatus";
    toolbar.appendChild(status);
  } else {
    var editAllBtn = document.createElement("button");
    editAllBtn.className = "admin-btn-secondary";
    editAllBtn.type = "button";
    editAllBtn.textContent = "Sửa tất cả";
    editAllBtn.addEventListener("click", function () {
      bulkEditMode = true;
      renderVocabTable(currentVocabRows);
    });
    toolbar.appendChild(editAllBtn);

    var deleteAllBtn = document.createElement("button");
    deleteAllBtn.className = "admin-btn-danger";
    deleteAllBtn.type = "button";
    deleteAllBtn.textContent = "Xóa tất cả từ vựng";
    deleteAllBtn.addEventListener("click", handleDeleteAllVocab);
    toolbar.appendChild(deleteAllBtn);
  }

  return toolbar;
}

async function handleDeleteAllVocab() {
  var unitId = document.getElementById("unitSelect").value;
  if (!window.confirm("Xóa toàn bộ " + currentVocabRows.length + " từ vựng trong Unit này? Không thể khôi phục.")) {
    return;
  }
  var rows = currentVocabRows;
  var result = await supabaseClient.from("game_vocab").delete().eq("unit_id", unitId);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  await Promise.all(rows.map(function (row) {
    return Promise.all([deleteAudioFileForUrl(row.audio_en_url), deleteAudioFileForUrl(row.audio_vi_url)]);
  }));
  loadVocabTable();
}

function renderVocabTable(rows) {
  currentVocabRows = rows;
  var wrap = document.getElementById("vocabTableWrap");
  wrap.innerHTML = "";

  if (!rows.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Unit này chưa có từ vựng nào.";
    wrap.appendChild(empty);
    return;
  }

  wrap.appendChild(buildVocabToolbar());

  var table = document.createElement("table");
  table.className = "admin-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  var headers = ["Ảnh", "Từ (EN)", "Phiên âm", "Nghĩa (VI)", "Audio EN", ""];
  var i;
  for (i = 0; i < headers.length; i++) {
    var th = document.createElement("th");
    th.textContent = headers[i];
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  bulkEditRefs = [];
  for (i = 0; i < rows.length; i++) {
    tbody.appendChild(bulkEditMode ? buildVocabBulkEditRow(rows[i]) : buildVocabRow(rows[i]));
  }
  table.appendChild(tbody);

  wrap.appendChild(table);
}

function buildVocabBulkEditRow(row) {
  var tr = document.createElement("tr");
  tr.className = "editing-row";

  var wordTd = makeInputTd(row.word_en);
  var phoneticTd = makeInputTd(row.phonetic);
  var meaningTd = makeInputTd(row.meaning_vi);

  tr.appendChild(makeImageTd(row));
  tr.appendChild(wordTd);
  tr.appendChild(phoneticTd);
  tr.appendChild(meaningTd);
  tr.appendChild(makeAudioTd(row.audio_en_url));

  var actionsTd = document.createElement("td");
  var delBtn = document.createElement("button");
  delBtn.className = "admin-btn-danger";
  delBtn.type = "button";
  delBtn.textContent = "Xóa";
  delBtn.addEventListener("click", function () {
    deleteVocab(row);
  });
  actionsTd.appendChild(delBtn);
  tr.appendChild(actionsTd);

  bulkEditRefs.push({ row: row, wordTd: wordTd, phoneticTd: phoneticTd, meaningTd: meaningTd });

  return tr;
}

async function handleSaveAll() {
  var saveBtn = document.getElementById("saveAllBtn");
  var status = document.getElementById("saveAllStatus");
  saveBtn.disabled = true;

  var i;
  var savedCount = 0;
  for (i = 0; i < bulkEditRefs.length; i++) {
    var ref = bulkEditRefs[i];
    var newWordEn = ref.wordTd.inputEl.value.trim();
    var newPhonetic = ref.phoneticTd.inputEl.value.trim();
    var newMeaningVi = ref.meaningTd.inputEl.value.trim();

    if (!newWordEn || !newMeaningVi) {
      continue;
    }

    var textChanged = newWordEn !== ref.row.word_en || newMeaningVi !== ref.row.meaning_vi;
    var otherChanged = newPhonetic !== (ref.row.phonetic || "");
    if (!textChanged && !otherChanged) {
      continue;
    }

    status.textContent = "Đang lưu " + (savedCount + 1) + "/" + bulkEditRefs.length + ": " + newWordEn + "...";

    var updatePayload = {
      word_en: newWordEn,
      phonetic: newPhonetic,
      meaning_vi: newMeaningVi
    };

    if (textChanged) {
      var noop = function () {};
      updatePayload.audio_en_url = await generateAudio(stripParenthetical(newWordEn), "en-US", ref.row.unit_id + "/" + ref.row.id + "_en.mp3", noop);
    }

    await supabaseClient.from("game_vocab").update(updatePayload).eq("id", ref.row.id);
    savedCount++;
  }

  status.textContent = "Đã lưu " + savedCount + " từ thay đổi.";
  bulkEditMode = false;
  loadVocabTable();
}

function buildVocabRow(row) {
  if (editingVocabId === row.id) {
    return buildVocabEditRow(row);
  }

  var tr = document.createElement("tr");
  tr.appendChild(makeImageTd(row));
  tr.appendChild(makeTd(row.word_en));
  tr.appendChild(makeTd(row.phonetic));
  tr.appendChild(makeTd(row.meaning_vi));
  tr.appendChild(makeAudioTd(row.audio_en_url));

  var actionsTd = document.createElement("td");

  var editBtn = document.createElement("button");
  editBtn.className = "admin-btn-secondary";
  editBtn.type = "button";
  editBtn.textContent = "Sửa";
  editBtn.addEventListener("click", function () {
    editingVocabId = row.id;
    renderVocabTable(currentVocabRows);
  });
  actionsTd.appendChild(editBtn);

  var delBtn = document.createElement("button");
  delBtn.className = "admin-btn-danger";
  delBtn.type = "button";
  delBtn.textContent = "Xóa";
  delBtn.addEventListener("click", function () {
    deleteVocab(row);
  });
  actionsTd.appendChild(delBtn);
  tr.appendChild(actionsTd);

  return tr;
}

function makeInputTd(value, widthClass) {
  var td = document.createElement("td");
  var input = document.createElement("input");
  input.type = "text";
  input.value = value || "";
  input.className = "admin-inline-input" + (widthClass ? " " + widthClass : "");
  td.appendChild(input);
  td.inputEl = input;
  return td;
}

function buildVocabEditRow(row) {
  var tr = document.createElement("tr");
  tr.className = "editing-row";

  var wordTd = makeInputTd(row.word_en);
  var phoneticTd = makeInputTd(row.phonetic);
  var meaningTd = makeInputTd(row.meaning_vi);

  tr.appendChild(makeImageTd(row));
  tr.appendChild(wordTd);
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
    editingVocabId = null;
    renderVocabTable(currentVocabRows);
  });

  saveBtn.addEventListener("click", async function () {
    var newWordEn = wordTd.inputEl.value.trim();
    var newPhonetic = phoneticTd.inputEl.value.trim();
    var newMeaningVi = meaningTd.inputEl.value.trim();

    if (!newWordEn || !newMeaningVi) {
      window.alert("Từ tiếng Anh và Nghĩa tiếng Việt không được để trống");
      return;
    }

    saveBtn.disabled = true;
    cancelBtn.disabled = true;

    var textChanged = newWordEn !== row.word_en || newMeaningVi !== row.meaning_vi;
    var updatePayload = {
      word_en: newWordEn,
      phonetic: newPhonetic,
      meaning_vi: newMeaningVi
    };

    if (textChanged) {
      saveBtn.textContent = "Đang tạo âm thanh...";
      var noop = function () {};
      updatePayload.audio_en_url = await generateAudio(stripParenthetical(newWordEn), "en-US", row.unit_id + "/" + row.id + "_en.mp3", noop);
    } else {
      saveBtn.textContent = "Đang lưu...";
    }

    var result = await supabaseClient.from("game_vocab").update(updatePayload).eq("id", row.id);

    if (result.error) {
      window.alert("Lỗi lưu: " + result.error.message);
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
      saveBtn.textContent = "Lưu";
      return;
    }

    editingVocabId = null;
    loadVocabTable();
  });

  actionsTd.appendChild(saveBtn);
  actionsTd.appendChild(cancelBtn);
  tr.appendChild(actionsTd);

  return tr;
}

async function deleteVocab(row) {
  if (!window.confirm("Xóa từ này?")) {
    return;
  }
  var result = await supabaseClient.from("game_vocab").delete().eq("id", row.id);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  await Promise.all([deleteAudioFileForUrl(row.audio_en_url), deleteAudioFileForUrl(row.audio_vi_url)]);
  loadVocabTable();
}

async function generateAudio(text, lang, path, statusSetter) {
  try {
    var resp = await fetch(GENERATE_AUDIO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ text: text, lang: lang, path: path })
    });
    var data = await resp.json();
    if (!resp.ok || data.error) {
      statusSetter("Lỗi tạo âm thanh (" + lang + "): " + (data.error || resp.status));
      return null;
    }
    return data.url;
  } catch (err) {
    statusSetter("Lỗi kết nối tới generate-audio: " + err);
    return null;
  }
}

async function lookupPhonetic(word) {
  try {
    var resp = await fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(word.toLowerCase()));
    if (!resp.ok) {
      return "";
    }
    var data = await resp.json();
    if (Array.isArray(data) && data[0] && Array.isArray(data[0].phonetics)) {
      var i;
      for (i = 0; i < data[0].phonetics.length; i++) {
        if (data[0].phonetics[i].text) {
          return data[0].phonetics[i].text;
        }
      }
    }
    return "";
  } catch (err) {
    return "";
  }
}

async function translateToVietnamese(text, statusSetter) {
  try {
    var resp = await fetch(TRANSLATE_TEXT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ text: text })
    });
    var data = await resp.json();
    if (!resp.ok || data.error) {
      statusSetter("Lỗi dịch \"" + text + "\": " + (data.error || resp.status));
      return "";
    }
    return data.translation || "";
  } catch (err) {
    statusSetter("Lỗi kết nối dịch thuật: " + err);
    return "";
  }
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function setBulkStatus(text) {
  document.getElementById("bulkStatus").textContent = text;
}

function parseBulkLine(line) {
  if (line.indexOf("|") !== -1) {
    var parts = line.split("|");
    return {
      word_en: (parts[0] || "").trim(),
      phonetic: (parts[1] || "").trim(),
      meaning_vi: (parts[2] || "").trim()
    };
  }

  var slashMatch = line.match(/^(.+?)\s+\/([^/]+)\/\s*[-–]?\s*(.*)$/);
  if (slashMatch) {
    return {
      word_en: slashMatch[1].trim(),
      phonetic: "/" + slashMatch[2].trim() + "/",
      meaning_vi: slashMatch[3].trim()
    };
  }

  return {
    word_en: line.trim(),
    phonetic: "",
    meaning_vi: ""
  };
}

function parseBulkText(text) {
  var lines = text.split("\n");
  var items = [];
  var i;
  for (i = 0; i < lines.length; i++) {
    var raw = lines[i].trim();
    if (raw) {
      items.push(parseBulkLine(raw));
    }
  }
  return items;
}

async function buildVocabAudioLookup() {
  var result = await supabaseClient.from("game_vocab").select("word_en, audio_en_url").not("audio_en_url", "is", null);
  var lookup = {};
  (result.data || []).forEach(function (row) {
    var key = stripParenthetical(row.word_en).trim().toLowerCase();
    if (key && !lookup[key]) {
      lookup[key] = row.audio_en_url;
    }
  });
  return lookup;
}

async function handleBulkAdd(e) {
  e.preventDefault();

  var unitId = document.getElementById("unitSelect").value;
  var text = document.getElementById("bulkTextarea").value;
  var items = parseBulkText(text);

  if (!items.length) {
    window.alert("Chưa dán dữ liệu nào.");
    return;
  }

  var invalidLines = [];
  var validItems = [];
  var i;
  for (i = 0; i < items.length; i++) {
    if (!items[i].word_en) {
      invalidLines.push(i + 1);
    } else {
      validItems.push(items[i]);
    }
  }

  var existingCountResult = await supabaseClient.from("game_vocab").select("id", { count: "exact", head: true }).eq("unit_id", unitId);
  var nextSortOrder = existingCountResult.count || 0;
  var audioLookup = await buildVocabAudioLookup();

  var successCount = 0;
  var reusedCount = 0;
  for (i = 0; i < validItems.length; i++) {
    var item = validItems[i];
    setBulkStatus("Đang xử lý " + (i + 1) + "/" + validItems.length + ": " + item.word_en + "...");

    var spokenWordEn = stripParenthetical(item.word_en);
    var audioKey = spokenWordEn.trim().toLowerCase();

    if (!item.phonetic) {
      item.phonetic = await lookupPhonetic(spokenWordEn);
    }
    if (!item.meaning_vi) {
      item.meaning_vi = await translateToVietnamese(spokenWordEn, setBulkStatus);
    }

    var insertResult = await supabaseClient
      .from("game_vocab")
      .insert({
        unit_id: unitId,
        sort_order: nextSortOrder + i,
        word_en: item.word_en,
        phonetic: item.phonetic,
        meaning_vi: item.meaning_vi
      })
      .select()
      .single();

    if (insertResult.error) {
      setBulkStatus("Lỗi lưu \"" + item.word_en + "\": " + insertResult.error.message);
      continue;
    }

    var row = insertResult.data;

    var audioEnUrl;
    if (audioLookup[audioKey]) {
      audioEnUrl = audioLookup[audioKey];
      reusedCount++;
    } else {
      audioEnUrl = await generateAudio(spokenWordEn, "en-US", unitId + "/" + row.id + "_en.mp3", setBulkStatus);
      if (audioEnUrl) {
        audioLookup[audioKey] = audioEnUrl;
      }
    }

    await supabaseClient
      .from("game_vocab")
      .update({ audio_en_url: audioEnUrl })
      .eq("id", row.id);

    successCount++;
    loadVocabTable();
    await sleep(800);
  }

  var summary = "Xong! Đã thêm " + successCount + "/" + validItems.length + " từ.";
  if (reusedCount > 0) {
    summary += " Dùng lại âm thanh có sẵn cho " + reusedCount + " từ (đỡ tốn dung lượng).";
  }
  if (invalidLines.length) {
    summary += " Bỏ qua dòng trống: dòng " + invalidLines.join(", ") + ".";
  }
  setBulkStatus(summary);

  document.getElementById("bulkTextarea").value = "";
  loadVocabTable();
}
