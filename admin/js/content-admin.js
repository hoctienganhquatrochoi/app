function populateUnitSelect(selectId) {
  var select = document.getElementById(selectId || "unitSelect");
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
        opt.text = cls.name + " › " + subj.name + " › " + unit.name;
        select.appendChild(opt);
      }
    }
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
    audio.src = url;
    audio.style.width = "150px";
    td.appendChild(audio);
  } else {
    td.textContent = "—";
  }
  return td;
}

function setupImagePicker(pickerEl, fileInputEl, onFile) {
  pickerEl.addEventListener("click", function () {
    fileInputEl.click();
  });
  fileInputEl.addEventListener("change", function () {
    if (fileInputEl.files && fileInputEl.files[0]) {
      onFile(fileInputEl.files[0]);
    }
  });
  pickerEl.addEventListener("paste", function (e) {
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
}

function showImagePreview(pickerEl, file) {
  pickerEl.innerHTML = "";
  var img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  pickerEl.appendChild(img);
}

function resetImagePicker(pickerEl) {
  pickerEl.innerHTML = "";
  var hint = document.createElement("span");
  hint.className = "admin-image-picker-hint";
  hint.textContent = "Bấm / dán ảnh";
  pickerEl.appendChild(hint);
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
  return publicUrlResult.data.publicUrl;
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

  if (row.image_url) {
    var img = document.createElement("img");
    img.className = "admin-image-thumb";
    img.src = row.image_url;
    td.appendChild(img);
  }

  var changeBtn = document.createElement("button");
  changeBtn.className = "admin-btn-secondary";
  changeBtn.type = "button";
  changeBtn.textContent = row.image_url ? "Đổi ảnh" : "Thêm ảnh";

  var fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";
  fileInput.addEventListener("change", function () {
    if (fileInput.files && fileInput.files[0]) {
      uploadAndSetVocabImage(row.id, row.unit_id, fileInput.files[0]);
    }
  });

  changeBtn.addEventListener("click", function () {
    fileInput.click();
  });

  td.appendChild(changeBtn);
  td.appendChild(fileInput);

  return td;
}

function setAddStatus(text) {
  document.getElementById("addStatus").textContent = text;
}

var pendingImageFile = null;

function clearAddForm() {
  document.getElementById("newEmoji").value = "";
  document.getElementById("newWordEn").value = "";
  document.getElementById("newPhonetic").value = "";
  document.getElementById("newMeaningVi").value = "";
  document.getElementById("newImageFile").value = "";
  pendingImageFile = null;
  resetImagePicker(document.getElementById("newImagePicker"));
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

  var table = document.createElement("table");
  table.className = "admin-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  var headers = ["Emoji", "Ảnh", "Từ (EN)", "Phiên âm", "Nghĩa (VI)", "Audio EN", "Audio VI", ""];
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
    tbody.appendChild(buildVocabRow(rows[i]));
  }
  table.appendChild(tbody);

  wrap.appendChild(table);
}

function buildVocabRow(row) {
  if (editingVocabId === row.id) {
    return buildVocabEditRow(row);
  }

  var tr = document.createElement("tr");
  tr.appendChild(makeTd(row.emoji));
  tr.appendChild(makeImageTd(row));
  tr.appendChild(makeTd(row.word_en));
  tr.appendChild(makeTd(row.phonetic));
  tr.appendChild(makeTd(row.meaning_vi));
  tr.appendChild(makeAudioTd(row.audio_en_url));
  tr.appendChild(makeAudioTd(row.audio_vi_url));

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
    deleteVocab(row.id);
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

  var emojiTd = makeInputTd(row.emoji, "admin-inline-input-small");
  var wordTd = makeInputTd(row.word_en);
  var phoneticTd = makeInputTd(row.phonetic);
  var meaningTd = makeInputTd(row.meaning_vi);

  tr.appendChild(emojiTd);
  tr.appendChild(makeImageTd(row));
  tr.appendChild(wordTd);
  tr.appendChild(phoneticTd);
  tr.appendChild(meaningTd);
  tr.appendChild(makeAudioTd(row.audio_en_url));
  tr.appendChild(makeAudioTd(row.audio_vi_url));

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
    var newEmoji = emojiTd.inputEl.value.trim();
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
      emoji: newEmoji,
      word_en: newWordEn,
      phonetic: newPhonetic,
      meaning_vi: newMeaningVi
    };

    if (textChanged) {
      saveBtn.textContent = "Đang tạo âm thanh...";
      var noop = function () {};
      updatePayload.audio_en_url = await generateAudio(newWordEn, "en-US", row.unit_id + "/" + row.id + "_en.mp3", noop);
      updatePayload.audio_vi_url = await generateAudio(newMeaningVi, "vi", row.unit_id + "/" + row.id + "_vi.mp3", noop);
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

async function deleteVocab(id) {
  if (!window.confirm("Xóa từ này?")) {
    return;
  }
  var result = await supabaseClient.from("game_vocab").delete().eq("id", id);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
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

async function handleAddVocab(e) {
  e.preventDefault();

  var unitId = document.getElementById("unitSelect").value;
  var emoji = document.getElementById("newEmoji").value.trim();
  var wordEn = document.getElementById("newWordEn").value.trim();
  var phonetic = document.getElementById("newPhonetic").value.trim();
  var meaningVi = document.getElementById("newMeaningVi").value.trim();

  if (!wordEn || !meaningVi) {
    window.alert("Cần nhập ít nhất Từ tiếng Anh và Nghĩa tiếng Việt");
    return;
  }

  setAddStatus("Đang lưu từ vựng...");

  var insertResult = await supabaseClient
    .from("game_vocab")
    .insert({
      unit_id: unitId,
      emoji: emoji,
      word_en: wordEn,
      phonetic: phonetic,
      meaning_vi: meaningVi
    })
    .select()
    .single();

  if (insertResult.error) {
    setAddStatus("Lỗi lưu: " + insertResult.error.message);
    return;
  }

  var row = insertResult.data;
  var imageFile = pendingImageFile;
  clearAddForm();
  loadVocabTable();

  setAddStatus("Đang tạo âm thanh tiếng Anh...");
  var audioEnUrl = await generateAudio(wordEn, "en-US", unitId + "/" + row.id + "_en.mp3", setAddStatus);

  setAddStatus("Đang tạo âm thanh tiếng Việt...");
  var audioViUrl = await generateAudio(meaningVi, "vi", unitId + "/" + row.id + "_vi.mp3", setAddStatus);

  var updatePayload = { audio_en_url: audioEnUrl, audio_vi_url: audioViUrl };

  if (imageFile) {
    setAddStatus("Đang tải ảnh lên...");
    updatePayload.image_url = await uploadVocabImage(imageFile, unitId, row.id);
  }

  var updateResult = await supabaseClient
    .from("game_vocab")
    .update(updatePayload)
    .eq("id", row.id);

  if (updateResult.error) {
    setAddStatus("Lưu audio thất bại: " + updateResult.error.message);
  } else {
    setAddStatus("Xong! Đã thêm từ và tạo âm thanh.");
  }

  loadVocabTable();
}

var EMOJI_LOOKUP = {
  "apple": "🍎", "banana": "🍌", "orange": "🍊", "grape": "🍇", "watermelon": "🍉",
  "strawberry": "🍓", "pineapple": "🍍", "mango": "🥭", "lemon": "🍋", "coconut": "🥥",
  "pear": "🍐", "cherry": "🍒", "kiwi": "🥝", "guava": "🍈",
  "dog": "🐶", "cat": "🐱", "cow": "🐮", "pig": "🐷", "chicken": "🐔", "duck": "🦆",
  "fish": "🐟", "bird": "🐦", "elephant": "🐘", "lion": "🦁", "tiger": "🐯", "monkey": "🐵",
  "rabbit": "🐰", "bear": "🐻", "frog": "🐸", "horse": "🐴", "sheep": "🐑", "snake": "🐍",
  "red": "🔴", "blue": "🔵", "green": "🟢", "yellow": "🟡", "black": "⚫", "white": "⚪",
  "one": "1️⃣", "two": "2️⃣", "three": "3️⃣", "four": "4️⃣", "five": "5️⃣",
  "six": "6️⃣", "seven": "7️⃣", "eight": "8️⃣", "nine": "9️⃣", "ten": "🔟",
  "mother": "👩", "father": "👨", "sister": "👧", "brother": "👦", "baby": "👶",
  "book": "📘", "pen": "🖊️", "pencil": "✏️", "school": "🏫", "ball": "⚽",
  "sun": "☀️", "moon": "🌙", "star": "⭐", "rain": "🌧️", "tree": "🌳", "flower": "🌸",
  "car": "🚗", "bus": "🚌", "bike": "🚲", "house": "🏠", "chair": "🪑", "table": "🪑"
};

function lookupEmoji(word) {
  return EMOJI_LOOKUP[word.toLowerCase().trim()] || "";
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

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function setBulkStatus(text) {
  document.getElementById("bulkStatus").textContent = text;
}

function parseBulkLine(line) {
  var parts = line.split("|");
  return {
    word_en: (parts[0] || "").trim(),
    phonetic: (parts[1] || "").trim(),
    meaning_vi: (parts[2] || "").trim(),
    emoji: (parts[3] || "").trim()
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
    if (!items[i].word_en || !items[i].meaning_vi) {
      invalidLines.push(i + 1);
    } else {
      validItems.push(items[i]);
    }
  }

  var successCount = 0;
  for (i = 0; i < validItems.length; i++) {
    var item = validItems[i];
    setBulkStatus("Đang xử lý " + (i + 1) + "/" + validItems.length + ": " + item.word_en + "...");

    if (!item.phonetic) {
      item.phonetic = await lookupPhonetic(item.word_en);
    }
    if (!item.emoji) {
      item.emoji = lookupEmoji(item.word_en);
    }

    var insertResult = await supabaseClient
      .from("game_vocab")
      .insert({
        unit_id: unitId,
        emoji: item.emoji,
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

    var audioEnUrl = await generateAudio(item.word_en, "en-US", unitId + "/" + row.id + "_en.mp3", setBulkStatus);
    var audioViUrl = await generateAudio(item.meaning_vi, "vi", unitId + "/" + row.id + "_vi.mp3", setBulkStatus);

    await supabaseClient
      .from("game_vocab")
      .update({ audio_en_url: audioEnUrl, audio_vi_url: audioViUrl })
      .eq("id", row.id);

    successCount++;
    loadVocabTable();
    await sleep(800);
  }

  var summary = "Xong! Đã thêm " + successCount + "/" + validItems.length + " từ.";
  if (invalidLines.length) {
    summary += " Bỏ qua dòng thiếu dữ liệu (cần ít nhất Từ tiếng Anh + Nghĩa tiếng Việt): dòng " + invalidLines.join(", ") + ".";
  }
  setBulkStatus(summary);

  document.getElementById("bulkTextarea").value = "";
  loadVocabTable();
}
