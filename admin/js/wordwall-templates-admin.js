var wordwallTemplates = [];
var currentWordwallTemplateId = null;

function setWordwallTemplateStatus(text) {
  document.getElementById("wordwallTemplateStatus").textContent = text || "";
}

async function loadWordwallTemplates() {
  var templatesResult = await supabaseClient.from("game_wordwall_templates").select("*").order("sort_order", { ascending: true });
  var itemsResult = await supabaseClient.from("game_wordwall_template_items").select("*").order("sort_order", { ascending: true });

  var templates = templatesResult.data || [];
  var itemsByTemplate = {};
  (itemsResult.data || []).forEach(function (item) {
    if (!itemsByTemplate[item.template_id]) {
      itemsByTemplate[item.template_id] = [];
    }
    itemsByTemplate[item.template_id].push(item);
  });

  wordwallTemplates = templates.map(function (t) {
    return { id: t.id, name: t.name, sort_order: t.sort_order, items: itemsByTemplate[t.id] || [] };
  });

  if (!currentWordwallTemplateId && wordwallTemplates.length) {
    currentWordwallTemplateId = wordwallTemplates[0].id;
  }

  renderWordwallTemplateButtons();
  renderWordwallTemplateTabs();
  renderWordwallTemplateItems();
}

function renderWordwallTemplateButtons() {
  var wrap = document.getElementById("wordwallTemplateButtonsWrap");
  wrap.innerHTML = "";

  wordwallTemplates.forEach(function (t) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wordwall-template-quick-btn";
    btn.textContent = t.name;
    btn.addEventListener("click", function () {
      applyWordwallTemplateToUnit(t.id);
    });
    wrap.appendChild(btn);
  });

  var manageBtn = document.createElement("button");
  manageBtn.type = "button";
  manageBtn.className = "wordwall-template-manage-btn";
  manageBtn.textContent = "⚙ Quản lý";
  manageBtn.addEventListener("click", openWordwallTemplateModal);
  wrap.appendChild(manageBtn);
}

function openWordwallTemplateModal() {
  document.getElementById("wordwallTemplateModalOverlay").style.display = "flex";
  renderWordwallTemplateTabs();
  renderWordwallTemplateItems();
}

function closeWordwallTemplateModal() {
  document.getElementById("wordwallTemplateModalOverlay").style.display = "none";
}

function renderWordwallTemplateTabs() {
  var wrap = document.getElementById("wordwallTemplateTabsWrap");
  wrap.innerHTML = "";

  wordwallTemplates.forEach(function (t) {
    var tab = document.createElement("div");
    tab.className = "wordwall-template-tab" + (t.id === currentWordwallTemplateId ? " active" : "");

    var nameSpan = document.createElement("span");
    nameSpan.className = "wordwall-template-tab-name";
    nameSpan.textContent = t.name;
    nameSpan.addEventListener("click", function () {
      currentWordwallTemplateId = t.id;
      renderWordwallTemplateTabs();
      renderWordwallTemplateItems();
    });
    tab.appendChild(nameSpan);

    var renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.textContent = "✎";
    renameBtn.title = "Đổi tên";
    renameBtn.addEventListener("click", function () {
      renameWordwallTemplate(t.id, t.name);
    });
    tab.appendChild(renameBtn);

    var delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.textContent = "🗑";
    delBtn.title = "Xóa template";
    delBtn.addEventListener("click", function () {
      deleteWordwallTemplate(t.id, t.name);
    });
    tab.appendChild(delBtn);

    wrap.appendChild(tab);
  });
}

function renderWordwallTemplateItems() {
  var wrap = document.getElementById("wordwallTemplateItemsWrap");
  wrap.innerHTML = "";

  var template = wordwallTemplates.filter(function (t) { return t.id === currentWordwallTemplateId; })[0];
  if (!template) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Chưa có template nào, tạo template mới bên dưới.";
    wrap.appendChild(empty);
    return;
  }

  template.items.forEach(function (item, idx) {
    var row = document.createElement("div");
    row.className = "wordwall-template-item-row";

    var upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.className = "admin-btn-secondary";
    upBtn.textContent = "↑";
    upBtn.disabled = idx === 0;
    upBtn.addEventListener("click", function () {
      moveWordwallTemplateItem(template, item.id, -1);
    });
    row.appendChild(upBtn);

    var downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.className = "admin-btn-secondary";
    downBtn.textContent = "↓";
    downBtn.disabled = idx === template.items.length - 1;
    downBtn.addEventListener("click", function () {
      moveWordwallTemplateItem(template, item.id, 1);
    });
    row.appendChild(downBtn);

    var input = document.createElement("input");
    input.type = "text";
    input.value = item.name;
    input.addEventListener("change", function () {
      renameWordwallTemplateItem(item.id, input.value.trim());
    });
    row.appendChild(input);

    var delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "admin-btn-danger";
    delBtn.textContent = "Xóa";
    delBtn.addEventListener("click", function () {
      deleteWordwallTemplateItem(template.id, item.id);
    });
    row.appendChild(delBtn);

    wrap.appendChild(row);
  });
}

async function handleAddWordwallTemplate() {
  var input = document.getElementById("newWordwallTemplateName");
  var name = input.value.trim();
  if (!name) {
    window.alert("Nhập tên template");
    return;
  }

  var result = await supabaseClient.from("game_wordwall_templates").insert({ name: name, sort_order: wordwallTemplates.length }).select().single();
  if (result.error) {
    setWordwallTemplateStatus("Lỗi tạo template: " + result.error.message);
    return;
  }

  input.value = "";
  currentWordwallTemplateId = result.data.id;
  setWordwallTemplateStatus("Đã tạo template \"" + name + "\".");
  await loadWordwallTemplates();
}

async function renameWordwallTemplate(id, oldName) {
  var newName = window.prompt("Đổi tên template:", oldName);
  if (!newName || !newName.trim() || newName.trim() === oldName) {
    return;
  }
  var result = await supabaseClient.from("game_wordwall_templates").update({ name: newName.trim() }).eq("id", id);
  if (result.error) {
    window.alert("Lỗi lưu: " + result.error.message);
    return;
  }
  await loadWordwallTemplates();
}

async function deleteWordwallTemplate(id, name) {
  if (!window.confirm("Xóa template \"" + name + "\" cùng toàn bộ danh sách tên bài trong đó?")) {
    return;
  }
  var result = await supabaseClient.from("game_wordwall_templates").delete().eq("id", id);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  if (currentWordwallTemplateId === id) {
    currentWordwallTemplateId = null;
  }
  await loadWordwallTemplates();
}

async function handleAddWordwallTemplateItem() {
  if (!currentWordwallTemplateId) {
    window.alert("Chọn hoặc tạo 1 template trước");
    return;
  }
  var input = document.getElementById("newWordwallTemplateItemName");
  var name = input.value.trim();
  if (!name) {
    window.alert("Nhập tên bài");
    return;
  }

  var template = wordwallTemplates.filter(function (t) { return t.id === currentWordwallTemplateId; })[0];
  var result = await supabaseClient.from("game_wordwall_template_items").insert({
    template_id: currentWordwallTemplateId,
    name: name,
    sort_order: template ? template.items.length : 0
  });
  if (result.error) {
    window.alert("Lỗi lưu: " + result.error.message);
    return;
  }

  input.value = "";
  await loadWordwallTemplates();
}

async function renameWordwallTemplateItem(id, newName) {
  if (!newName) {
    return;
  }
  var result = await supabaseClient.from("game_wordwall_template_items").update({ name: newName }).eq("id", id);
  if (result.error) {
    window.alert("Lỗi lưu: " + result.error.message);
  }
  await loadWordwallTemplates();
}

async function deleteWordwallTemplateItem(templateId, itemId) {
  var result = await supabaseClient.from("game_wordwall_template_items").delete().eq("id", itemId);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  await loadWordwallTemplates();
}

async function moveWordwallTemplateItem(template, itemId, direction) {
  var idx = template.items.findIndex(function (i) { return i.id === itemId; });
  var swapIdx = idx + direction;
  if (idx === -1 || swapIdx < 0 || swapIdx >= template.items.length) {
    return;
  }

  var a = template.items[idx];
  var b = template.items[swapIdx];

  await supabaseClient.from("game_wordwall_template_items").update({ sort_order: swapIdx }).eq("id", a.id);
  await supabaseClient.from("game_wordwall_template_items").update({ sort_order: idx }).eq("id", b.id);

  await loadWordwallTemplates();
}

async function applyWordwallTemplateToUnit(templateId) {
  var unitId = document.getElementById("unitSelect").value;
  var template = wordwallTemplates.filter(function (t) { return t.id === templateId; })[0];
  if (!template || !template.items.length) {
    window.alert("Template này chưa có tên bài nào");
    return;
  }

  var existingNames = currentWordwallRows.map(function (r) { return r.name; });
  var toInsert = template.items
    .filter(function (item) { return existingNames.indexOf(item.name) === -1; })
    .map(function (item, idx) {
      return {
        unit_id: unitId,
        name: item.name,
        embed_url: null,
        sort_order: currentWordwallRows.length + idx
      };
    });

  if (!toInsert.length) {
    setWordwallStatus("Unit này đã có đủ các tên bài trong template \"" + template.name + "\".");
    return;
  }

  var result = await supabaseClient.from("game_wordwall_activities").insert(toInsert);
  if (result.error) {
    setWordwallStatus("Lỗi tạo: " + result.error.message);
    return;
  }

  setWordwallStatus("Đã tạo " + toInsert.length + " dòng từ template \"" + template.name + "\" — dán link vào từng dòng để hiển thị.");
  await refreshCurriculumEverywhere();
}
