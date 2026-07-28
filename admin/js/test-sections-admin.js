/* ---------- Đề kiểm tra: soạn nội dung trực tiếp trong chính Unit này, chỉ chọn thứ tự hiển thị ---------- */

var TEST_SECTION_TABLES = {
  "grammar-mcq": "game_grammar_mcq",
  "grammar-typing": "game_grammar_typing",
  "grammar-matching": "game_grammar_matching",
  "grammar-dragfill": "game_grammar_dragfill",
  "math-dragfill": "game_math_dragfill",
  "text-dragfill": "game_text_dragfill"
};

var TEST_SECTION_LABELS = {
  "grammar-mcq": "Trắc nghiệm ngữ pháp",
  "grammar-typing": "Viết câu trả lời",
  "grammar-matching": "Nối câu",
  "grammar-dragfill": "Điền từ vào chỗ trống",
  "math-dragfill": "Toán - Điền số",
  "text-dragfill": "Điền đoạn văn/hội thoại"
};

var currentTestSections = [];

async function loadTestSections() {
  var unitId = document.getElementById("unitSelect").value;
  var wrap = document.getElementById("testSectionsTableWrap");
  wrap.textContent = "Đang tải...";

  var result = await supabaseClient.from("game_test_sections").select("*").eq("unit_id", unitId).order("sort_order", { ascending: true });
  if (result.error) {
    wrap.textContent = "Lỗi tải dữ liệu: " + result.error.message;
    return;
  }

  currentTestSections = result.data;
  renderTestSectionsTable();
}

function renderTestSectionsTable() {
  var wrap = document.getElementById("testSectionsTableWrap");
  wrap.innerHTML = "";

  if (!currentTestSections.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Đề này chưa có mục nào, thêm ở bên dưới.";
    wrap.appendChild(empty);
    return;
  }

  var table = document.createElement("table");
  table.className = "admin-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  ["#", "Nhãn", "Dạng bài", ""].forEach(function (h) {
    var th = document.createElement("th");
    th.textContent = h;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  currentTestSections.forEach(function (row, idx) {
    var tr = document.createElement("tr");
    tr.appendChild(makeTd("" + (idx + 1)));
    tr.appendChild(makeTd(row.label || "(không đặt tên)"));
    tr.appendChild(makeTd(TEST_SECTION_LABELS[row.section_type] || row.section_type));

    var actionsTd = document.createElement("td");

    var editBtn = document.createElement("button");
    editBtn.className = "admin-btn-secondary";
    editBtn.type = "button";
    editBtn.textContent = "Sửa";
    editBtn.addEventListener("click", function () { handleEditTestSection(row); });
    actionsTd.appendChild(editBtn);

    var upBtn = document.createElement("button");
    upBtn.className = "admin-btn-secondary";
    upBtn.type = "button";
    upBtn.textContent = "↑";
    upBtn.disabled = idx === 0;
    upBtn.addEventListener("click", function () { moveTestSection(idx, -1); });
    actionsTd.appendChild(upBtn);

    var downBtn = document.createElement("button");
    downBtn.className = "admin-btn-secondary";
    downBtn.type = "button";
    downBtn.textContent = "↓";
    downBtn.disabled = idx === currentTestSections.length - 1;
    downBtn.addEventListener("click", function () { moveTestSection(idx, 1); });
    actionsTd.appendChild(downBtn);

    var delBtn = document.createElement("button");
    delBtn.className = "admin-btn-danger";
    delBtn.type = "button";
    delBtn.textContent = "Xóa khỏi đề";
    delBtn.addEventListener("click", function () { deleteTestSection(row.id); });
    actionsTd.appendChild(delBtn);

    tr.appendChild(actionsTd);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  wrap.appendChild(table);
}

async function moveTestSection(idx, delta) {
  var otherIdx = idx + delta;
  if (otherIdx < 0 || otherIdx >= currentTestSections.length) {
    return;
  }
  var a = currentTestSections[idx];
  var b = currentTestSections[otherIdx];
  await supabaseClient.from("game_test_sections").update({ sort_order: b.sort_order }).eq("id", a.id);
  await supabaseClient.from("game_test_sections").update({ sort_order: a.sort_order }).eq("id", b.id);
  loadTestSections();
}

async function deleteTestSection(id) {
  if (!window.confirm("Xóa mục này khỏi thứ tự đề? (Nội dung bài vẫn còn ở tab tương ứng, không bị xóa)")) {
    return;
  }
  var result = await supabaseClient.from("game_test_sections").delete().eq("id", id);
  if (result.error) {
    window.alert("Lỗi xóa: " + result.error.message);
    return;
  }
  loadTestSections();
  loadCurriculumData().then(loadActivityToggles);
}

var TEST_SECTION_CONTENT_HELP = {
  "grammar-mcq": {
    hint: "Mỗi câu 3 dòng, cách nhau 1 dòng trống: câu hỏi (gạch chân 1 đoạn thì đặt dấu _ ở 2 đầu, VD gr_ea_t), dòng \"Đáp án đúng: ...\", dòng \"Đáp án sai: ...\" (cách nhau dấu phẩy).",
    placeholder: "Tom and Lucy are my _________.\nĐáp án đúng: friends\nĐáp án sai: friend, classmate, brother"
  },
  "grammar-typing": {
    hint: "Mỗi dòng 1 câu, cách nhau dấu |: Câu hỏi | Đáp án.",
    placeholder: "I am a student. | I am not a student.\nTôi có hai anh em trai. | I have two brothers."
  },
  "grammar-matching": {
    hint: "Mỗi dòng 1 cặp, cách nhau dấu |: Vế trái | Vế phải.",
    placeholder: "This is | my friend Lan.\nHow | old are you?"
  },
  "grammar-dragfill": {
    hint: "Mỗi câu cách nhau 1 dòng trống: câu có 1 chỗ trống đánh dấu bằng _____, dòng \"Đáp án đúng: ...\", dòng \"Đáp án sai: ...\".",
    placeholder: "Where are the _____?\nĐáp án đúng: lamps\nĐáp án sai: a lamp, lamp"
  },
  "math-dragfill": {
    hint: "Đề bài viết bình thường, số nào là chỗ trống thì bọc trong ⟦ ⟧ (VD ⟦105⟧). Dòng \"Đáp án sai\" không bắt buộc.",
    placeholder: "Một cửa hàng bán được 15kg gạo nếp, số gạo tẻ bán được gấp 7 lần số gạo nếp. Vậy số gạo tẻ bán được là: ⟦105⟧ kg.\nĐáp án sai: 95, 110"
  },
  "text-dragfill": {
    hint: "Đoạn văn/hội thoại, giữ nguyên xuống dòng theo từng câu — từ nào là chỗ trống thì bọc trong ⟦ ⟧ (VD ⟦Who⟧). Dòng \"Đáp án sai\" không bắt buộc.",
    placeholder: "Lan: Hello.\nJames: Hi.\nLan: ⟦Who⟧ is your name?\nJames: My ⟦name⟧ is James."
  }
};

function updateTestSectionContentHint() {
  var sectionType = document.getElementById("newTestSectionType").value;
  var help = TEST_SECTION_CONTENT_HELP[sectionType];
  if (!help) {
    return;
  }
  document.getElementById("newTestSectionHint").textContent = help.hint;
  document.getElementById("newTestSectionContent").placeholder = help.placeholder;
}

var editingTestSectionId = null;
var editingTestSectionOldType = null;
var editingTestSectionOldSetName = null;

function resetTestSectionForm() {
  editingTestSectionId = null;
  editingTestSectionOldType = null;
  editingTestSectionOldSetName = null;
  document.getElementById("newTestSectionLabel").value = "";
  document.getElementById("newTestSectionContent").value = "";
  document.getElementById("addTestSectionBtn").textContent = "+ Thêm mục vào đề";
  var cancelBtn = document.getElementById("cancelEditTestSectionBtn");
  if (cancelBtn) {
    cancelBtn.style.display = "none";
  }
}

function reconstructSectionContent(sectionType, rows) {
  if (sectionType === "grammar-mcq") {
    return rows.map(function (r) {
      return [r.question || "", "Đáp án đúng: " + r.correct_answer, "Đáp án sai: " + (r.wrong_answers || []).join(", ")].join("\n");
    }).join("\n\n");
  }
  if (sectionType === "grammar-typing") {
    return rows.map(function (r) { return r.prompt + " | " + r.answer; }).join("\n");
  }
  if (sectionType === "grammar-matching") {
    return rows.map(function (r) { return r.left_text + " | " + r.right_text; }).join("\n");
  }
  if (sectionType === "grammar-dragfill") {
    return rows.map(function (r) {
      var lines = [r.question_en];
      if (r.question_vi) {
        lines.push(r.question_vi);
      }
      lines.push("Đáp án đúng: " + r.correct_answer, "Đáp án sai: " + (r.wrong_answers || []).join(", "));
      return lines.join("\n");
    }).join("\n\n");
  }
  if (sectionType === "math-dragfill" || sectionType === "text-dragfill") {
    return rows.map(function (r) {
      var lines = [r.passage];
      if (r.wrong_answers && r.wrong_answers.length) {
        lines.push("Đáp án sai: " + r.wrong_answers.join(", "));
      }
      return lines.join("\n");
    }).join("\n\n");
  }
  return "";
}

async function handleEditTestSection(row) {
  var table = TEST_SECTION_TABLES[row.section_type];
  var result = await supabaseClient.from(table).select("*").eq("unit_id", row.unit_id).eq("set_name", row.source_set_name).order("sort_order", { ascending: true });
  if (result.error) {
    window.alert("Lỗi tải nội dung: " + result.error.message);
    return;
  }

  document.getElementById("newTestSectionLabel").value = row.label || "";
  document.getElementById("newTestSectionType").value = row.section_type;
  updateTestSectionContentHint();
  document.getElementById("newTestSectionContent").value = reconstructSectionContent(row.section_type, result.data || []);

  editingTestSectionId = row.id;
  editingTestSectionOldType = row.section_type;
  editingTestSectionOldSetName = row.source_set_name;
  document.getElementById("addTestSectionBtn").textContent = "Lưu chỉnh sửa mục";
  var cancelBtn = document.getElementById("cancelEditTestSectionBtn");
  if (cancelBtn) {
    cancelBtn.style.display = "";
  }
  document.getElementById("addTestSectionBox").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function handleAddTestSection() {
  var unitId = document.getElementById("unitSelect").value;
  var sectionType = document.getElementById("newTestSectionType").value;
  var label = document.getElementById("newTestSectionLabel").value.trim();
  var content = document.getElementById("newTestSectionContent").value;

  if (!label) {
    window.alert("Đặt nhãn cho mục này (VD Exercise 1) trước đã.");
    return;
  }
  if (!content.trim()) {
    window.alert("Chưa dán nội dung nào.");
    return;
  }

  document.getElementById("testSectionStatus").textContent = "Đang xử lý...";

  if (editingTestSectionId) {
    var oldTable = TEST_SECTION_TABLES[editingTestSectionOldType];
    await supabaseClient.from(oldTable).delete().eq("unit_id", unitId).eq("set_name", editingTestSectionOldSetName);
  }

  var insertRes = await insertParsedSectionContent(sectionType, unitId, label, content);
  if (insertRes.error) {
    window.alert("Lỗi: " + insertRes.error);
    return;
  }

  if (editingTestSectionId) {
    var updateRes = await supabaseClient.from("game_test_sections").update({
      section_type: sectionType,
      source_unit_id: unitId,
      source_set_name: label,
      label: label
    }).eq("id", editingTestSectionId);
    if (updateRes.error) {
      window.alert("Lỗi lưu: " + updateRes.error.message);
      return;
    }
    document.getElementById("testSectionStatus").textContent = "Đã lưu chỉnh sửa mục \"" + label + "\" (" + insertRes.count + " câu).";
  } else {
    var nextSortOrder = currentTestSections.length;
    var result = await supabaseClient.from("game_test_sections").insert({
      unit_id: unitId,
      sort_order: nextSortOrder,
      section_type: sectionType,
      source_unit_id: unitId,
      source_set_name: label,
      label: label
    });
    if (result.error) {
      window.alert("Lỗi lưu thứ tự: " + result.error.message);
      return;
    }
    document.getElementById("testSectionStatus").textContent = "Đã thêm " + insertRes.count + " câu vào mục \"" + label + "\".";
  }

  resetTestSectionForm();
  loadTestSections();
  loadCurriculumData().then(loadActivityToggles);
}

/* ---------- Dán nhanh cả đề: tách theo "Dán vào tab: ..." rồi tạo nội dung + thứ tự trong 1 lần ---------- */

function normalizeTabLabelForMatch(s) {
  return (s || "").toLowerCase().trim().replace(/\s+/g, " ");
}

var TAB_LABEL_TO_TYPE = (function () {
  var map = {};
  Object.keys(TEST_SECTION_LABELS).forEach(function (key) {
    map[normalizeTabLabelForMatch(TEST_SECTION_LABELS[key])] = key;
  });
  return map;
})();

function parseMegaTestImport(text) {
  var lines = text.split("\n");
  var markerRe = /^\s*(?:dán\s*vào\s*tab|dạng\s*bài)\s*:\s*(.+?)\s*$/i;
  var markers = [];
  lines.forEach(function (line, idx) {
    var m = line.match(markerRe);
    if (m) {
      markers.push({ idx: idx, typeLabelRaw: m[1].trim() });
    }
  });

  function findHeadingIdx(fromIdx) {
    var i = fromIdx;
    while (i >= 0 && lines[i].trim() === "") {
      i--;
    }
    return i;
  }

  var sections = [];
  markers.forEach(function (marker, i) {
    var headingIdx = findHeadingIdx(marker.idx - 1);
    var label = headingIdx >= 0 ? lines[headingIdx].trim() : ("Mục " + (i + 1));

    var contentStart = marker.idx + 1;
    while (contentStart < lines.length && lines[contentStart].trim() === "") {
      contentStart++;
    }

    var contentEnd = lines.length;
    if (i + 1 < markers.length) {
      var nextHeadingIdx = findHeadingIdx(markers[i + 1].idx - 1);
      contentEnd = nextHeadingIdx > marker.idx ? nextHeadingIdx : markers[i + 1].idx;
    }

    var content = lines.slice(contentStart, contentEnd).join("\n").trim();
    var typeKey = TAB_LABEL_TO_TYPE[normalizeTabLabelForMatch(marker.typeLabelRaw)];

    sections.push({ label: label, typeLabelRaw: marker.typeLabelRaw, typeKey: typeKey, content: content });
  });

  return sections;
}

async function insertParsedSectionContent(typeKey, unitId, setName, content) {
  var table = TEST_SECTION_TABLES[typeKey];
  var existingCountResult = await supabaseClient.from(table).select("id", { count: "exact", head: true }).eq("unit_id", unitId).eq("set_name", setName);
  var nextSortOrder = existingCountResult.count || 0;

  var rows = [];
  if (typeKey === "grammar-mcq") {
    var mcqItems = parseGrammarMcqBulkText(content).filter(function (it) { return it.correct_answer && it.wrong_answers.length; });
    rows = mcqItems.map(function (it, idx) {
      return { unit_id: unitId, set_name: setName, sort_order: nextSortOrder + idx, question: it.question, correct_answer: it.correct_answer, wrong_answers: it.wrong_answers };
    });
  } else if (typeKey === "grammar-typing") {
    var typingLines = content.split("\n").map(function (l) { return l.trim(); }).filter(function (l) { return l; });
    var typingItems = typingLines.map(parseGrammarTypingBulkLine).filter(function (it) { return it.prompt && it.answer; });
    rows = typingItems.map(function (it, idx) {
      return { unit_id: unitId, set_name: setName, sort_order: nextSortOrder + idx, prompt: it.prompt, answer: it.answer };
    });
  } else if (typeKey === "grammar-matching") {
    var matchLines = content.split("\n").map(function (l) { return l.trim(); }).filter(function (l) { return l; });
    var matchItems = matchLines.map(parseGrammarMatchingBulkLine).filter(function (it) { return it.left_text && it.right_text; });
    rows = matchItems.map(function (it, idx) {
      return { unit_id: unitId, set_name: setName, sort_order: nextSortOrder + idx, left_text: it.left_text, right_text: it.right_text };
    });
  } else if (typeKey === "grammar-dragfill") {
    var dragfillItems = parseGrammarDragfillBulkText(content).filter(function (it) { return it.question_en && it.correct_answer && it.wrong_answers.length; });
    rows = dragfillItems.map(function (it, idx) {
      return { unit_id: unitId, set_name: setName, sort_order: nextSortOrder + idx, question_en: it.question_en, question_vi: it.question_vi, correct_answer: it.correct_answer, wrong_answers: it.wrong_answers };
    });
  } else if (typeKey === "math-dragfill" || typeKey === "text-dragfill") {
    var joinWithNewline = typeKey === "text-dragfill";
    var dfItems = parseMathDragfillBulkText(content, joinWithNewline).filter(function (it) { return it.passage && it.correct_answers.length; });
    rows = dfItems.map(function (it, idx) {
      return { unit_id: unitId, set_name: setName, sort_order: nextSortOrder + idx, passage: it.passage, correct_answers: it.correct_answers, wrong_answers: it.wrong_answers };
    });
  }

  if (!rows.length) {
    return { count: 0, error: "không đọc được nội dung hợp lệ" };
  }

  var insertResult = await supabaseClient.from(table).insert(rows);
  if (insertResult.error) {
    return { count: 0, error: insertResult.error.message };
  }
  return { count: rows.length, error: null };
}

async function handleMegaImport() {
  var unitId = document.getElementById("unitSelect").value;
  var text = document.getElementById("megaImportTextarea").value;
  var sections = parseMegaTestImport(text);

  if (!sections.length) {
    window.alert("Không tìm thấy dòng \"Dán vào tab: ...\" nào trong nội dung dán vào.");
    return;
  }

  var nextSortOrder = currentTestSections.length;
  var successCount = 0;
  var messages = [];

  for (var i = 0; i < sections.length; i++) {
    var sec = sections[i];
    if (!sec.typeKey) {
      messages.push("Mục \"" + sec.label + "\": không nhận ra tên tab \"" + sec.typeLabelRaw + "\".");
      continue;
    }
    document.getElementById("megaImportStatus").textContent = "Đang xử lý mục " + (i + 1) + "/" + sections.length + "...";

    var insertRes = await insertParsedSectionContent(sec.typeKey, unitId, sec.label, sec.content);
    if (insertRes.error) {
      messages.push("Mục \"" + sec.label + "\": " + insertRes.error + ".");
      continue;
    }

    var sectionInsert = await supabaseClient.from("game_test_sections").insert({
      unit_id: unitId,
      sort_order: nextSortOrder + successCount,
      section_type: sec.typeKey,
      source_unit_id: unitId,
      source_set_name: sec.label,
      label: sec.label
    });
    if (sectionInsert.error) {
      messages.push("Mục \"" + sec.label + "\": lưu thứ tự lỗi - " + sectionInsert.error.message + ".");
      continue;
    }
    successCount++;
  }

  var summary = "Xong! Đã tạo " + successCount + "/" + sections.length + " mục.";
  if (messages.length) {
    summary += " " + messages.join(" ");
  }
  document.getElementById("megaImportStatus").textContent = summary;
  document.getElementById("megaImportTextarea").value = "";

  loadTestSections();
  loadCurriculumData().then(loadActivityToggles);
}
