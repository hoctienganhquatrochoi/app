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

  var table = document.createElement("table");
  table.className = "admin-table";
  var tbody = document.createElement("tbody");

  rows.forEach(function (row, idx) {
    var tr = document.createElement("tr");

    var nameTd = document.createElement("td");
    nameTd.textContent = row.name;
    tr.appendChild(nameTd);

    var urlTd = document.createElement("td");
    urlTd.textContent = row.embed_url;
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
    downBtn.disabled = idx === rows.length - 1;
    downBtn.addEventListener("click", function () {
      moveWordwall(row.id, 1);
    });
    moveTd.appendChild(upBtn);
    moveTd.appendChild(downBtn);
    tr.appendChild(moveTd);

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

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
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
