function setBulkVietLiteracyStatus(text) {
  document.getElementById("bulkVietLiteracyStatus").textContent = text;
}

var currentVietTier = "letter";
var currentVietLiteracyRows = [];
var editingVietLiteracyId = null;

async function loadVietLiteracyTable() {
  var unitId = document.getElementById("unitSelect").value;
  var wrap = document.getElementById("vietLiteracyTableWrap");
  if (!unitId) {
    wrap.innerHTML = "";
    return;
  }
  wrap.textContent = "Đang tải...";

  var result = await supabaseClient
    .from("game_viet_literacy")
    .select("*")
    .eq("unit_id", unitId)
    .eq("tier", currentVietTier)
    .order("sort_order", { ascending: true });

  if (result.error) {
    wrap.textContent = "Lỗi tải dữ liệu: " + result.error.message;
    return;
  }

  renderVietLiteracyTable(result.data);
}

function buildVietLiteracyToolbar() {
  var toolbar = document.createElement("div");
  toolbar.className = "admin-table-toolbar";

  var deleteAllBtn = document.createElement("button");
  deleteAllBtn.className = "admin-btn-danger";
  deleteAllBtn.type = "button";
  deleteAllBtn.textContent = "Xóa tất cả";
  deleteAllBtn.addEventListener("click", handleDeleteAllVietLiteracy);
  toolbar.appendChild(deleteAllBtn);

  return toolbar;
}

async function handleDeleteAllVietLiteracy() {
  var unitId = document.getElementById("unitSelect").value;
  if (!window.confirm("Xóa toàn bộ " + currentVietLiteracyRows.length + " mục trong tầng này? Không thể khôi phục.")) {
    return;
  }
  var result = await supabaseClient.from("game_viet_literacy").delete().eq("unit_id", unitId).eq("tier", currentVietTier);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  loadVietLiteracyTable();
  loadCurriculumData().then(loadActivityToggles);
}

function renderVietLiteracyTable(rows) {
  currentVietLiteracyRows = rows;
  var wrap = document.getElementById("vietLiteracyTableWrap");
  wrap.innerHTML = "";

  if (!rows.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Tầng này chưa có mục nào.";
    wrap.appendChild(empty);
    return;
  }

  wrap.appendChild(buildVietLiteracyToolbar());

  var table = document.createElement("table");
  table.className = "admin-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  var headers = ["Chữ/Từ/Câu", "Cách đọc (tùy chọn)", "Audio", ""];
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
    tbody.appendChild(buildVietLiteracyRow(rows[i]));
  }
  table.appendChild(tbody);

  wrap.appendChild(table);
}

function buildVietLiteracyRow(row) {
  if (editingVietLiteracyId === row.id) {
    return buildVietLiteracyEditRow(row);
  }

  var tr = document.createElement("tr");
  tr.appendChild(makeTd(row.text_vi));
  tr.appendChild(makeTd(row.audio_override_text));
  tr.appendChild(makeAudioTd(row.audio_vi_url));

  var actionsTd = document.createElement("td");

  var editBtn = document.createElement("button");
  editBtn.className = "admin-btn-secondary";
  editBtn.type = "button";
  editBtn.textContent = "Sửa";
  editBtn.addEventListener("click", function () {
    editingVietLiteracyId = row.id;
    renderVietLiteracyTable(currentVietLiteracyRows);
  });
  actionsTd.appendChild(editBtn);

  var delBtn = document.createElement("button");
  delBtn.className = "admin-btn-danger";
  delBtn.type = "button";
  delBtn.textContent = "Xóa";
  delBtn.addEventListener("click", function () {
    deleteVietLiteracyItem(row.id);
  });
  actionsTd.appendChild(delBtn);
  tr.appendChild(actionsTd);

  return tr;
}

function buildVietLiteracyEditRow(row) {
  var tr = document.createElement("tr");
  tr.className = "editing-row";

  var textTd = makeInputTd(row.text_vi);
  var overrideTd = makeInputTd(row.audio_override_text);

  tr.appendChild(textTd);
  tr.appendChild(overrideTd);
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
    editingVietLiteracyId = null;
    renderVietLiteracyTable(currentVietLiteracyRows);
  });

  saveBtn.addEventListener("click", async function () {
    var newTextVi = textTd.inputEl.value.trim();
    var newOverride = overrideTd.inputEl.value.trim();

    if (!newTextVi) {
      window.alert("Không được để trống");
      return;
    }

    saveBtn.disabled = true;
    cancelBtn.disabled = true;

    var textChanged = newTextVi !== row.text_vi || newOverride !== (row.audio_override_text || "");
    var updatePayload = {
      text_vi: newTextVi,
      audio_override_text: newOverride || null
    };

    if (textChanged) {
      saveBtn.textContent = "Đang tạo âm thanh...";
      var noop = function () {};
      updatePayload.audio_vi_url = await generateAudio(newOverride || newTextVi, "vi", row.unit_id + "/" + row.id + "_vi.mp3", noop);
    } else {
      saveBtn.textContent = "Đang lưu...";
    }

    var result = await supabaseClient.from("game_viet_literacy").update(updatePayload).eq("id", row.id);

    if (result.error) {
      window.alert("Lỗi lưu: " + result.error.message);
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
      saveBtn.textContent = "Lưu";
      return;
    }

    editingVietLiteracyId = null;
    loadVietLiteracyTable();
  });

  actionsTd.appendChild(saveBtn);
  actionsTd.appendChild(cancelBtn);
  tr.appendChild(actionsTd);

  return tr;
}

async function deleteVietLiteracyItem(id) {
  if (!window.confirm("Xóa mục này?")) {
    return;
  }
  var result = await supabaseClient.from("game_viet_literacy").delete().eq("id", id);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  loadVietLiteracyTable();
  loadCurriculumData().then(loadActivityToggles);
}

function parseVietLiteracyBulkLine(line) {
  var parts = line.split("|");
  return {
    text_vi: (parts[0] || "").trim(),
    audio_override_text: (parts[1] || "").trim()
  };
}

function parseVietLiteracyBulkText(text) {
  var lines = text.split("\n");
  var items = [];
  var i;
  for (i = 0; i < lines.length; i++) {
    var raw = lines[i].trim();
    if (raw) {
      items.push(parseVietLiteracyBulkLine(raw));
    }
  }
  return items;
}

async function handleBulkAddVietLiteracy(e) {
  e.preventDefault();

  var unitId = document.getElementById("unitSelect").value;
  var text = document.getElementById("bulkVietLiteracyTextarea").value;
  var items = parseVietLiteracyBulkText(text);

  if (!items.length) {
    window.alert("Chưa dán dữ liệu nào.");
    return;
  }

  var invalidLines = [];
  var validItems = [];
  var i;
  for (i = 0; i < items.length; i++) {
    if (!items[i].text_vi) {
      invalidLines.push(i + 1);
    } else {
      validItems.push(items[i]);
    }
  }

  var existingCountResult = await supabaseClient.from("game_viet_literacy").select("id", { count: "exact", head: true }).eq("unit_id", unitId).eq("tier", currentVietTier);
  var nextSortOrder = existingCountResult.count || 0;

  var successCount = 0;
  for (i = 0; i < validItems.length; i++) {
    var item = validItems[i];
    setBulkVietLiteracyStatus("Đang xử lý " + (i + 1) + "/" + validItems.length + ": " + item.text_vi + "...");

    var insertResult = await supabaseClient
      .from("game_viet_literacy")
      .insert({
        unit_id: unitId,
        tier: currentVietTier,
        sort_order: nextSortOrder + i,
        text_vi: item.text_vi,
        audio_override_text: item.audio_override_text || null
      })
      .select()
      .single();

    if (insertResult.error) {
      setBulkVietLiteracyStatus("Lỗi lưu \"" + item.text_vi + "\": " + insertResult.error.message);
      continue;
    }

    var row = insertResult.data;
    var audioVal = item.audio_override_text || item.text_vi;
    var audioVietUrl = await generateAudio(audioVal, "vi", unitId + "/" + row.id + "_vi.mp3", setBulkVietLiteracyStatus);

    await supabaseClient
      .from("game_viet_literacy")
      .update({ audio_vi_url: audioVietUrl })
      .eq("id", row.id);

    successCount++;
    loadVietLiteracyTable();
    await sleep(800);
  }

  var summary = "Xong! Đã thêm " + successCount + "/" + validItems.length + " mục.";
  if (invalidLines.length) {
    summary += " Bỏ qua dòng thiếu dữ liệu: dòng " + invalidLines.join(", ") + ".";
  }
  setBulkVietLiteracyStatus(summary);

  document.getElementById("bulkVietLiteracyTextarea").value = "";
  loadVietLiteracyTable();
  loadCurriculumData().then(loadActivityToggles);
}
