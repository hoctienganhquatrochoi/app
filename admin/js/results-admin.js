function populateResultsUnitSelect() {
  populateUnitSelect("resultsUnitSelect");
}

function formatDateTime(iso) {
  var d = new Date(iso);
  var dd = d.getDate() < 10 ? "0" + d.getDate() : "" + d.getDate();
  var mm = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : "" + (d.getMonth() + 1);
  var hh = d.getHours() < 10 ? "0" + d.getHours() : "" + d.getHours();
  var mi = d.getMinutes() < 10 ? "0" + d.getMinutes() : "" + d.getMinutes();
  return hh + ":" + mi + " " + dd + "/" + mm;
}

function formatDuration(startedAtIso, submittedAtIso) {
  var startMs = new Date(startedAtIso).getTime();
  var endMs = new Date(submittedAtIso).getTime();
  var totalSeconds = Math.max(0, Math.round((endMs - startMs) / 1000));
  var minutes = Math.floor(totalSeconds / 60);
  var seconds = totalSeconds % 60;
  if (minutes > 0) {
    return minutes + " phút " + seconds + " giây";
  }
  return seconds + " giây";
}

async function loadResults() {
  var unitId = document.getElementById("resultsUnitSelect").value;
  var activityType = document.getElementById("resultsActivitySelect").value;

  var studentWrap = document.getElementById("resultsByStudentWrap");
  var questionWrap = document.getElementById("resultsByQuestionWrap");
  studentWrap.textContent = "Đang tải...";
  questionWrap.textContent = "";

  var result = await supabaseClient
    .from("game_quiz_attempts")
    .select("*, game_students(full_name)")
    .eq("unit_id", unitId)
    .eq("activity_type", activityType)
    .order("submitted_at", { ascending: false });

  if (result.error) {
    studentWrap.textContent = "Lỗi tải dữ liệu: " + result.error.message;
    return;
  }

  renderResultsByStudent(result.data);
  renderResultsByQuestion(result.data);
}

function renderResultsByStudent(attempts) {
  var wrap = document.getElementById("resultsByStudentWrap");
  wrap.innerHTML = "";

  if (!attempts.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Chưa có lượt làm bài nào.";
    wrap.appendChild(empty);
    return;
  }

  var table = document.createElement("table");
  table.className = "admin-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  var headers = ["Học sinh", "Giờ nộp", "Đúng/Tổng", "Thời gian làm"];
  var i;
  for (i = 0; i < headers.length; i++) {
    var th = document.createElement("th");
    th.textContent = headers[i];
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  for (i = 0; i < attempts.length; i++) {
    var attempt = attempts[i];
    var tr = document.createElement("tr");

    var nameTd = document.createElement("td");
    nameTd.textContent = attempt.game_students ? attempt.game_students.full_name : "(đã xóa tài khoản)";
    tr.appendChild(nameTd);

    var timeTd = document.createElement("td");
    timeTd.textContent = formatDateTime(attempt.submitted_at);
    tr.appendChild(timeTd);

    var scoreTd = document.createElement("td");
    scoreTd.textContent = attempt.score + " / " + attempt.total;
    tr.appendChild(scoreTd);

    var durationTd = document.createElement("td");
    durationTd.textContent = formatDuration(attempt.started_at, attempt.submitted_at);
    tr.appendChild(durationTd);

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  wrap.appendChild(table);
}

function renderResultsByQuestion(attempts) {
  var wrap = document.getElementById("resultsByQuestionWrap");
  wrap.innerHTML = "";

  if (!attempts.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Chưa có dữ liệu.";
    wrap.appendChild(empty);
    return;
  }

  var statsByWord = {};
  var order = [];
  var i, j;
  for (i = 0; i < attempts.length; i++) {
    var answers = attempts[i].answers || [];
    for (j = 0; j < answers.length; j++) {
      var ans = answers[j];
      if (!statsByWord[ans.vocab_id]) {
        statsByWord[ans.vocab_id] = { word_en: ans.word_en, correct: 0, wrong: 0 };
        order.push(ans.vocab_id);
      }
      if (ans.is_correct) {
        statsByWord[ans.vocab_id].correct++;
      } else {
        statsByWord[ans.vocab_id].wrong++;
      }
    }
  }

  var rows = order.map(function (vocabId) {
    return statsByWord[vocabId];
  });

  rows.sort(function (a, b) {
    var totalA = a.correct + a.wrong;
    var totalB = b.correct + b.wrong;
    var rateA = totalA ? a.correct / totalA : 1;
    var rateB = totalB ? b.correct / totalB : 1;
    return rateA - rateB;
  });

  var table = document.createElement("table");
  table.className = "admin-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  var headers = ["Từ vựng", "Số lượt đúng", "Số lượt sai", "Tỷ lệ đúng"];
  for (i = 0; i < headers.length; i++) {
    var th = document.createElement("th");
    th.textContent = headers[i];
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  for (i = 0; i < rows.length; i++) {
    var row = rows[i];
    var total = row.correct + row.wrong;
    var rate = total ? Math.round((row.correct / total) * 100) : 0;

    var tr = document.createElement("tr");

    var wordTd = document.createElement("td");
    wordTd.textContent = row.word_en;
    tr.appendChild(wordTd);

    var correctTd = document.createElement("td");
    correctTd.textContent = row.correct;
    tr.appendChild(correctTd);

    var wrongTd = document.createElement("td");
    wrongTd.textContent = row.wrong;
    tr.appendChild(wrongTd);

    var rateTd = document.createElement("td");
    var badge = document.createElement("span");
    badge.className = "status-badge " + (rate < 50 ? "status-expired" : rate < 80 ? "status-soon" : "status-active");
    badge.textContent = rate + "%";
    rateTd.appendChild(badge);
    tr.appendChild(rateTd);

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  wrap.appendChild(table);
}
