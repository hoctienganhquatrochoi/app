var TODAY_HISTORY_ACTIVITY_LABELS = {
  "quiz": "Quiz",
  "missing-letter": "Khuyết chữ cái",
  "typing-hint": "Đánh máy có gợi ý",
  "typing-blank": "Đánh máy không gợi ý",
  "flip-card": "Thẻ lật",
  "free-typing-hint": "Nghe - Đánh máy (key)",
  "free-typing-blank": "Nghe - Đánh máy",
  "flashcard": "Thẻ đọc",
  "speaking": "Kiểm tra nói"
};

function unitNameById(unitId) {
  var classes = DATA.classes || [];
  var i, j, k;
  for (i = 0; i < classes.length; i++) {
    var subjects = DATA.subjectsByClass[classes[i].id] || [];
    for (j = 0; j < subjects.length; j++) {
      var units = subjects[j].units || [];
      for (k = 0; k < units.length; k++) {
        if (units[k].id === unitId) {
          return units[k].name || unitId;
        }
      }
    }
  }
  return unitId;
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

  var rows = (attemptsResult.data || []).map(function (row) {
    return {
      unitLabel: unitNameById(row.unit_id),
      activityLabel: TODAY_HISTORY_ACTIVITY_LABELS[row.activity_type] || row.activity_type,
      scoreLabel: row.score + " / " + row.total,
      dateIso: row.submitted_at
    };
  }).concat((opensResult.data || []).map(function (row) {
    return {
      unitLabel: unitNameById(row.unit_id),
      activityLabel: "Wordwall: " + row.wordwall_name,
      scoreLabel: "—",
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
