function extractWordwallEmbedUrl(input) {
  var trimmed = input.trim();
  var match = trimmed.match(/src=["']([^"']+)["']/i);
  if (match) {
    return match[1];
  }
  return trimmed;
}

function setWordwallStatus(text) {
  document.getElementById("wordwallStatus").textContent = text || "";
}

var currentWordwallRows = [];
var editingWordwallId = null;
var bulkEditWordwallMode = false;
var bulkEditWordwallRefs = [];

async function loadWordwallList() {
  var unitId = document.getElementById("unitSelect").value;
  var wrap = document.getElementById("wordwallListWrap");
  wrap.textContent = "Đang tải...";

  var result = await supabaseClient
    .from("game_wordwall_activities")
    .select("*")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true });

  if (result.error) {
    wrap.textContent = "Lỗi tải dữ liệu: " + result.error.message;
    return;
  }

  currentWordwallRows = result.data;
  renderWordwallList(result.data);
}

function buildWordwallToolbar() {
  var toolbar = document.createElement("div");
  toolbar.className = "admin-table-toolbar";

  if (bulkEditWordwallMode) {
    var saveAllBtn = document.createElement("button");
    saveAllBtn.className = "admin-btn-primary";
    saveAllBtn.type = "button";
    saveAllBtn.id = "saveAllWordwallBtn";
    saveAllBtn.textContent = "Lưu tất cả";
    saveAllBtn.addEventListener("click", handleSaveAllWordwall);
    toolbar.appendChild(saveAllBtn);

    var cancelAllBtn = document.createElement("button");
    cancelAllBtn.className = "admin-btn-secondary";
    cancelAllBtn.type = "button";
    cancelAllBtn.textContent = "Hủy";
    cancelAllBtn.addEventListener("click", function () {
      bulkEditWordwallMode = false;
      renderWordwallList(currentWordwallRows);
    });
    toolbar.appendChild(cancelAllBtn);

    var status = document.createElement("span");
    status.className = "admin-status";
    status.id = "saveAllWordwallStatus";
    toolbar.appendChild(status);
  } else {
    var editAllBtn = document.createElement("button");
    editAllBtn.className = "admin-btn-secondary";
    editAllBtn.type = "button";
    editAllBtn.textContent = "Sửa tất cả";
    editAllBtn.addEventListener("click", function () {
      bulkEditWordwallMode = true;
      renderWordwallList(currentWordwallRows);
    });
    toolbar.appendChild(editAllBtn);
  }

  return toolbar;
}

function renderWordwallList(rows) {
  var wrap = document.getElementById("wordwallListWrap");
  wrap.innerHTML = "";

  if (!rows.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Unit này chưa có bài Wordwall nào.";
    wrap.appendChild(empty);
    return;
  }

  wrap.appendChild(buildWordwallToolbar());

  var table = document.createElement("table");
  table.className = "admin-table";
  var tbody = document.createElement("tbody");

  bulkEditWordwallRefs = [];
  rows.forEach(function (row, idx) {
    if (bulkEditWordwallMode) {
      tbody.appendChild(buildWordwallBulkEditRow(row));
    } else {
      tbody.appendChild(editingWordwallId === row.id ? buildWordwallEditRow(row) : buildWordwallRow(row, idx, rows.length));
    }
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
}

function buildWordwallBulkEditRow(row) {
  var tr = document.createElement("tr");
  tr.className = "editing-row";

  var nameTd = document.createElement("td");
  var nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "admin-inline-input";
  nameInput.value = row.name;
  nameInput.setAttribute("list", "wordwallNameSuggestions");
  nameTd.appendChild(nameInput);
  tr.appendChild(nameTd);

  var urlTd = document.createElement("td");
  var urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.className = "admin-inline-input";
  urlInput.value = row.embed_url || "";
  urlInput.placeholder = "<iframe src=\"https://wordwall.net/embed/...\"...>";
  urlTd.appendChild(urlInput);
  tr.appendChild(urlTd);

  tr.appendChild(document.createElement("td"));

  var actionsTd = document.createElement("td");
  var delBtn = document.createElement("button");
  delBtn.className = "admin-btn-danger";
  delBtn.type = "button";
  delBtn.textContent = "Xóa";
  delBtn.addEventListener("click", function () {
    deleteWordwall(row.id);
  });
  actionsTd.appendChild(delBtn);
  tr.appendChild(actionsTd);

  bulkEditWordwallRefs.push({ row: row, nameInput: nameInput, urlInput: urlInput });

  return tr;
}

async function handleSaveAllWordwall() {
  var saveBtn = document.getElementById("saveAllWordwallBtn");
  var status = document.getElementById("saveAllWordwallStatus");
  saveBtn.disabled = true;

  var i;
  var savedCount = 0;
  for (i = 0; i < bulkEditWordwallRefs.length; i++) {
    var ref = bulkEditWordwallRefs[i];
    var newName = ref.nameInput.value.trim();
    var newRaw = ref.urlInput.value.trim();

    if (!newName) {
      continue;
    }

    var newEmbedUrl = newRaw ? extractWordwallEmbedUrl(newRaw) : null;
    if (newName === ref.row.name && newEmbedUrl === (ref.row.embed_url || null)) {
      continue;
    }

    status.textContent = "Đang lưu " + (savedCount + 1) + "/" + bulkEditWordwallRefs.length + ": " + newName + "...";
    await supabaseClient.from("game_wordwall_activities").update({ name: newName, embed_url: newEmbedUrl }).eq("id", ref.row.id);
    savedCount++;
  }

  status.textContent = "Đã lưu " + savedCount + " bài thay đổi.";
  bulkEditWordwallMode = false;
  await refreshCurriculumEverywhere();
}

function buildWordwallRow(row, idx, total) {
  var tr = document.createElement("tr");

  var nameTd = document.createElement("td");
  nameTd.textContent = row.name;
  tr.appendChild(nameTd);

  var urlTd = document.createElement("td");
  if (row.embed_url) {
    urlTd.textContent = row.embed_url;
  } else {
    urlTd.textContent = "(chưa có link — đang ẩn khỏi học sinh)";
    urlTd.className = "wordwall-pending-link";
  }
  urlTd.style.maxWidth = "260px";
  urlTd.style.overflow = "hidden";
  urlTd.style.textOverflow = "ellipsis";
  urlTd.style.whiteSpace = "nowrap";
  tr.appendChild(urlTd);

  var moveTd = document.createElement("td");
  var upBtn = document.createElement("button");
  upBtn.type = "button";
  upBtn.className = "admin-btn-secondary";
  upBtn.textContent = "↑";
  upBtn.disabled = idx === 0;
  upBtn.addEventListener("click", function () {
    moveWordwall(row.id, -1);
  });
  var downBtn = document.createElement("button");
  downBtn.type = "button";
  downBtn.className = "admin-btn-secondary";
  downBtn.textContent = "↓";
  downBtn.disabled = idx === total - 1;
  downBtn.addEventListener("click", function () {
    moveWordwall(row.id, 1);
  });
  moveTd.appendChild(upBtn);
  moveTd.appendChild(downBtn);
  tr.appendChild(moveTd);

  var actionsTd = document.createElement("td");

  if (row.embed_url) {
    var previewLink = document.createElement("a");
    previewLink.className = "admin-btn-secondary";
    previewLink.textContent = "Xem trước";
    previewLink.href = row.embed_url;
    previewLink.target = "_blank";
    previewLink.rel = "noopener noreferrer";
    actionsTd.appendChild(previewLink);
  }

  var editBtn = document.createElement("button");
  editBtn.className = "admin-btn-secondary";
  editBtn.type = "button";
  editBtn.textContent = "Sửa";
  editBtn.addEventListener("click", function () {
    editingWordwallId = row.id;
    renderWordwallList(currentWordwallRows);
  });
  actionsTd.appendChild(editBtn);

  var delBtn = document.createElement("button");
  delBtn.className = "admin-btn-danger";
  delBtn.type = "button";
  delBtn.textContent = "Xóa";
  delBtn.addEventListener("click", function () {
    deleteWordwall(row.id);
  });
  actionsTd.appendChild(delBtn);
  tr.appendChild(actionsTd);

  return tr;
}

function buildWordwallEditRow(row) {
  var tr = document.createElement("tr");
  tr.className = "editing-row";

  var nameTd = document.createElement("td");
  var nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "admin-inline-input";
  nameInput.value = row.name;
  nameInput.setAttribute("list", "wordwallNameSuggestions");
  nameTd.appendChild(nameInput);
  tr.appendChild(nameTd);

  var urlTd = document.createElement("td");
  var urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.className = "admin-inline-input";
  urlInput.value = row.embed_url || "";
  urlInput.placeholder = "<iframe src=\"https://wordwall.net/embed/...\"...>";
  urlTd.appendChild(urlInput);
  tr.appendChild(urlTd);

  tr.appendChild(document.createElement("td"));

  var actionsTd = document.createElement("td");

  var saveBtn = document.createElement("button");
  saveBtn.className = "admin-btn-primary";
  saveBtn.type = "button";
  saveBtn.textContent = "Lưu";
  saveBtn.addEventListener("click", async function () {
    var newName = nameInput.value.trim();
    var newRaw = urlInput.value.trim();

    if (!newName) {
      window.alert("Tên bài không được để trống");
      return;
    }

    var result = await supabaseClient
      .from("game_wordwall_activities")
      .update({ name: newName, embed_url: newRaw ? extractWordwallEmbedUrl(newRaw) : null })
      .eq("id", row.id);

    if (result.error) {
      window.alert("Lỗi lưu: " + result.error.message);
      return;
    }

    editingWordwallId = null;
    await refreshCurriculumEverywhere();
  });
  actionsTd.appendChild(saveBtn);

  var cancelBtn = document.createElement("button");
  cancelBtn.className = "admin-btn-danger";
  cancelBtn.type = "button";
  cancelBtn.textContent = "Hủy";
  cancelBtn.addEventListener("click", function () {
    editingWordwallId = null;
    renderWordwallList(currentWordwallRows);
  });
  actionsTd.appendChild(cancelBtn);

  tr.appendChild(actionsTd);

  return tr;
}

async function moveWordwall(id, direction) {
  var idx = currentWordwallRows.findIndex(function (r) { return r.id === id; });
  var swapIdx = idx + direction;
  if (idx === -1 || swapIdx < 0 || swapIdx >= currentWordwallRows.length) {
    return;
  }

  var a = currentWordwallRows[idx];
  var b = currentWordwallRows[swapIdx];

  await supabaseClient.from("game_wordwall_activities").update({ sort_order: swapIdx }).eq("id", a.id);
  await supabaseClient.from("game_wordwall_activities").update({ sort_order: idx }).eq("id", b.id);

  await refreshCurriculumEverywhere();
}

async function handleAddWordwall() {
  var unitId = document.getElementById("unitSelect").value;
  var name = document.getElementById("newWordwallName").value.trim();
  var rawInput = document.getElementById("newWordwallUrl").value.trim();

  if (!name) {
    window.alert("Nhập tên bài");
    return;
  }
  if (!rawInput) {
    window.alert("Dán mã nhúng hoặc link Wordwall");
    return;
  }

  var embedUrl = extractWordwallEmbedUrl(rawInput);

  setWordwallStatus("Đang lưu...");
  var result = await supabaseClient.from("game_wordwall_activities").insert({
    unit_id: unitId,
    name: name,
    embed_url: embedUrl,
    sort_order: currentWordwallRows.length
  });

  if (result.error) {
    setWordwallStatus("Lỗi lưu: " + result.error.message);
    return;
  }

  document.getElementById("newWordwallName").value = "";
  document.getElementById("newWordwallUrl").value = "";
  setWordwallStatus("Đã thêm bài \"" + name + "\".");
  await refreshCurriculumEverywhere();
}

async function deleteWordwall(id) {
  if (!window.confirm("Xóa bài Wordwall này?")) {
    return;
  }
  var result = await supabaseClient.from("game_wordwall_activities").delete().eq("id", id);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  await refreshCurriculumEverywhere();
}
