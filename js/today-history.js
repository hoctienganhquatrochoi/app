var TODAY_HISTORY_ACTIVITY_LABELS = {
  "quiz": "Quiz",
  "missing-letter": "Khuyết chữ cái",
  "typing-hint": "Đánh máy có gợi ý",
  "typing-blank": "Đánh máy không gợi ý",
  "flip-card": "Thẻ lật",
  "free-typing-hint": "Nghe - Đánh máy (key)",
  "free-typing-blank": "Nghe đánh máy không key",
  "free-typing-audio": "Nghe - Đánh máy",
  "flashcard": "Thẻ đọc",
  "speaking": "Kiểm tra nói",
  "grammar-mcq": "Trắc nghiệm ngữ pháp",
  "grammar-typing": "Viết câu trả lời",
  "grammar-matching": "Nối câu",
  "grammar-dragfill": "Điền từ vào chỗ trống",
  "photo-quiz": "Đọc/Nghe theo ảnh"
};

async function fetchUnitNamesByIds(unitIds) {
  var uniqueIds = [];
  unitIds.forEach(function (id) {
    if (id && uniqueIds.indexOf(id) === -1) {
      uniqueIds.push(id);
    }
  });
  if (!uniqueIds.length) {
    return {};
  }
  var result = await supabaseClient.from("game_units").select("id, name").in("id", uniqueIds);
  var map = {};
  (result.data || []).forEach(function (row) {
    map[row.id] = row.name;
  });
  return map;
}

function openTodayModal() {
  if (!currentStudent) {
    return;
  }

  var overlay = document.getElementById("todayModalOverlay");
  var body = document.getElementById("todayModalBody");
  body.textContent = "Đang tải...";
  overlay.style.display = "flex";

  loadTodayHistory();
}

function closeTodayModal() {
  document.getElementById("todayModalOverlay").style.display = "none";
}

async function loadTodayHistory() {
  var body = document.getElementById("todayModalBody");

  var todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  var fromIso = todayStart.toISOString();

  var attemptsResult = await supabaseClient
    .from("game_quiz_attempts")
    .select("unit_id, activity_type, score, total, submitted_at")
    .eq("student_id", currentStudent.id)
    .gte("submitted_at", fromIso)
    .order("submitted_at", { ascending: false });

  var opensResult = await supabaseClient
    .from("game_wordwall_opens")
    .select("unit_id, wordwall_name, opened_at")
    .eq("student_id", currentStudent.id)
    .gte("opened_at", fromIso)
    .order("opened_at", { ascending: false });

  if (attemptsResult.error || opensResult.error) {
    body.textContent = "Không tải được, thử lại sau nhé.";
    return;
  }

  var unitNameMap = await fetchUnitNamesByIds(
    (attemptsResult.data || []).map(function (row) { return row.unit_id; })
      .concat((opensResult.data || []).map(function (row) { return row.unit_id; }))
  );

  var openIds = (opensResult.data || []).map(function (row) { return row.id; });
  var photoIdSet = {};
  if (openIds.length) {
    var photosResult = await fetchAllRows(function () {
      return supabaseClient.from("game_wordwall_photos").select("wordwall_open_id").in("wordwall_open_id", openIds);
    });
    (photosResult.data || []).forEach(function (row) {
      photoIdSet[row.wordwall_open_id] = true;
    });
  }

  var rows = (attemptsResult.data || []).map(function (row) {
    return {
      unitLabel: unitNameMap[row.unit_id] || row.unit_id,
      activityLabel: TODAY_HISTORY_ACTIVITY_LABELS[row.activity_type] || row.activity_type,
      scoreLabel: row.score + " / " + row.total,
      dateIso: row.submitted_at
    };
  }).concat((opensResult.data || []).map(function (row) {
    var unit = findUnitById(row.unit_id);
    var cls = unit ? findClassById(unit.class_id) : null;
    var photoRequired = isPhotoProofRequiredForClass(cls);
    var scoreLabel = "—";
    if (photoRequired) {
      scoreLabel = photoIdSet[row.id] ? "📸 Đã gửi ảnh" : "⚠️ Chưa gửi ảnh";
    }
    return {
      unitLabel: unitNameMap[row.unit_id] || row.unit_id,
      activityLabel: "Wordwall: " + row.wordwall_name,
      scoreLabel: scoreLabel,
      dateIso: row.opened_at
    };
  })).sort(function (a, b) {
    return new Date(b.dateIso) - new Date(a.dateIso);
  });

  body.innerHTML = "";

  if (!rows.length) {
    var empty = document.createElement("p");
    empty.textContent = "Hôm nay em chưa học bài nào cả.";
    body.appendChild(empty);
    return;
  }

  var table = document.createElement("table");
  table.className = "ranking-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  ["Giờ", "Bài", "Dạng bài", "Điểm"].forEach(function (text) {
    var th = document.createElement("th");
    th.textContent = text;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  rows.forEach(function (row) {
    var tr = document.createElement("tr");

    var timeTd = document.createElement("td");
    var d = new Date(row.dateIso);
    var hh = d.getHours() < 10 ? "0" + d.getHours() : "" + d.getHours();
    var mi = d.getMinutes() < 10 ? "0" + d.getMinutes() : "" + d.getMinutes();
    timeTd.textContent = hh + ":" + mi;
    tr.appendChild(timeTd);

    var unitTd = document.createElement("td");
    unitTd.textContent = row.unitLabel;
    tr.appendChild(unitTd);

    var activityTd = document.createElement("td");
    activityTd.textContent = row.activityLabel;
    tr.appendChild(activityTd);

    var scoreTd = document.createElement("td");
    scoreTd.textContent = row.scoreLabel;
    tr.appendChild(scoreTd);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  body.appendChild(table);
}
