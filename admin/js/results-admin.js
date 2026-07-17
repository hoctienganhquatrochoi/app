function populateResultsUnitSelect() {
  populateSearchableUnitSelect("resultsUnitSearch", "resultsUnitSelect");
}

var currentResultsAssignmentId = null;

function renderResultsFilterStatus() {
  var el = document.getElementById("resultsFilterStatus");
  el.textContent = currentResultsAssignmentId
    ? "Đang xem: chỉ kết quả của bài giao này (không tính luyện tự do)."
    : "";
}

function populateHistoryGroupSelect() {
  var select = document.getElementById("historyGroupSelect");
  var previous = select.value;
  select.innerHTML = "";

  var placeholderOpt = document.createElement("option");
  placeholderOpt.value = "";
  placeholderOpt.text = "-- Chọn Nhóm --";
  select.appendChild(placeholderOpt);

  var i;
  for (i = 0; i < TEACHING_GROUPS.length; i++) {
    var opt = document.createElement("option");
    opt.value = TEACHING_GROUPS[i].id;
    opt.text = TEACHING_GROUPS[i].name;
    select.appendChild(opt);
  }

  if (previous && Array.prototype.some.call(select.options, function (o) { return o.value === previous; })) {
    select.value = previous;
  }

  if (!document.getElementById("historyFromDate").value) {
    setHistoryDateRange(1);
  }
}

function formatDateInputValue(d) {
  var yyyy = d.getFullYear();
  var mm = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : "" + (d.getMonth() + 1);
  var dd = d.getDate() < 10 ? "0" + d.getDate() : "" + d.getDate();
  return yyyy + "-" + mm + "-" + dd;
}

function formatVNDateDisplay(isoDateStr) {
  if (!isoDateStr) {
    return "?";
  }
  var parts = isoDateStr.split("-");
  return parts[2] + "/" + parts[1] + "/" + parts[0];
}

function setHistoryDateRange(days) {
  var today = new Date();
  var toStr = formatDateInputValue(today);
  var fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - (days - 1));
  var fromStr = formatDateInputValue(fromDate);
  document.getElementById("historyFromDate").value = fromStr;
  document.getElementById("historyToDate").value = toStr;
}

async function loadGroupHistory() {
  var groupId = document.getElementById("historyGroupSelect").value;
  var wrap = document.getElementById("historyListWrap");
  if (!groupId) {
    wrap.innerHTML = "";
    return;
  }
  wrap.textContent = "Đang tải...";

  var fromStr = document.getElementById("historyFromDate").value;
  var toStr = document.getElementById("historyToDate").value;
  var fromIso = fromStr ? new Date(fromStr + "T00:00:00").toISOString() : null;
  var toIso = toStr ? new Date(toStr + "T23:59:59.999").toISOString() : null;

  var attemptsQuery = supabaseClient
    .from("game_quiz_attempts")
    .select("*, game_students!inner(full_name, group_id)")
    .eq("game_students.group_id", groupId)
    .order("submitted_at", { ascending: false })
    .limit(500);
  var opensQuery = supabaseClient
    .from("game_wordwall_opens")
    .select("*, game_students!inner(full_name, group_id)")
    .eq("game_students.group_id", groupId)
    .order("opened_at", { ascending: false })
    .limit(500);

  if (fromIso) {
    attemptsQuery = attemptsQuery.gte("submitted_at", fromIso);
    opensQuery = opensQuery.gte("opened_at", fromIso);
  }
  if (toIso) {
    attemptsQuery = attemptsQuery.lte("submitted_at", toIso);
    opensQuery = opensQuery.lte("opened_at", toIso);
  }

  var attemptsResult = await attemptsQuery;
  var opensResult = await opensQuery;

  if (attemptsResult.error) {
    wrap.textContent = "Lỗi tải dữ liệu: " + attemptsResult.error.message;
    return;
  }
  if (opensResult.error) {
    wrap.textContent = "Lỗi tải dữ liệu: " + opensResult.error.message;
    return;
  }

  renderGroupHistory(attemptsResult.data, opensResult.data || []);
}

function handleHistoryPrint() {
  var groupSelect = document.getElementById("historyGroupSelect");
  if (!groupSelect.value) {
    window.alert("Chọn 1 Nhóm học sinh trước khi in báo cáo");
    return;
  }

  var printArea = document.getElementById("historyPrintArea");
  printArea.innerHTML = "";

  var title = document.createElement("h2");
  title.textContent = "Báo cáo học tập — Nhóm " + groupSelect.options[groupSelect.selectedIndex].text;
  printArea.appendChild(title);

  var fromStr = document.getElementById("historyFromDate").value;
  var toStr = document.getElementById("historyToDate").value;
  var rangeLine = document.createElement("p");
  rangeLine.textContent = "Từ ngày " + formatVNDateDisplay(fromStr) + " đến ngày " + formatVNDateDisplay(toStr);
  printArea.appendChild(rangeLine);

  var genLine = document.createElement("p");
  genLine.className = "history-print-gen";
  genLine.textContent = "Xuất báo cáo lúc: " + formatDateTime(new Date().toISOString());
  printArea.appendChild(genLine);

  var historyListWrap = document.getElementById("historyListWrap");
  if (historyListWrap.querySelector("table")) {
    printArea.appendChild(historyListWrap.cloneNode(true));
  } else {
    var empty = document.createElement("p");
    empty.textContent = "Không có dữ liệu trong khoảng thời gian này.";
    printArea.appendChild(empty);
  }

  document.body.classList.add("printing-history");
  window.print();
}

window.addEventListener("afterprint", function () {
  document.body.classList.remove("printing-history");
});

function computeDiligenceRanking(rows) {
  var byStudent = {};
  var order = [];
  rows.forEach(function (row) {
    if (!byStudent[row.studentName]) {
      byStudent[row.studentName] = { name: row.studentName, count: 0, days: {}, scoreSum: 0, totalSum: 0 };
      order.push(row.studentName);
    }
    var s = byStudent[row.studentName];
    s.count++;
    s.days[row.dateIso.slice(0, 10)] = true;
    if (typeof row.score === "number" && typeof row.total === "number") {
      s.scoreSum += row.score;
      s.totalSum += row.total;
    }
  });

  return order.map(function (name) {
    var s = byStudent[name];
    var dayCount = Object.keys(s.days).length;
    var avgPercent = s.totalSum > 0 ? Math.round((s.scoreSum / s.totalSum) * 100) : null;
    return { name: name, count: s.count, days: dayCount, avgPercent: avgPercent };
  }).sort(function (a, b) {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return (b.avgPercent || 0) - (a.avgPercent || 0);
  });
}

function buildDiligenceRanking(ranked) {
  var box = document.createElement("div");
  box.className = "admin-form";
  box.style.marginBottom = "16px";

  var heading = document.createElement("h3");
  heading.textContent = "🏅 Xếp hạng chuyên cần";
  box.appendChild(heading);

  var hint = document.createElement("p");
  hint.className = "admin-hint";
  hint.textContent = "Xếp theo số lượt học nhiều nhất trong khoảng thời gian đang chọn, sau đó theo điểm trung bình.";
  box.appendChild(hint);

  var medals = ["🥇", "🥈", "🥉"];
  var table = document.createElement("table");
  table.className = "admin-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  ["Hạng", "Học sinh", "Số lượt học", "Số ngày có học", "Điểm TB"].forEach(function (text) {
    var th = document.createElement("th");
    th.textContent = text;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  ranked.forEach(function (s, idx) {
    var tr = document.createElement("tr");
    tr.appendChild(makeTd(medals[idx] || ("#" + (idx + 1))));
    tr.appendChild(makeTd(s.name));
    tr.appendChild(makeTd("" + s.count));
    tr.appendChild(makeTd("" + s.days));
    tr.appendChild(makeTd(s.avgPercent === null ? "—" : s.avgPercent + "%"));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  box.appendChild(table);
  return box;
}

function renderGroupHistory(attempts, opens) {
  var wrap = document.getElementById("historyListWrap");
  wrap.innerHTML = "";

  buildAllUnitsFlat();
  var unitLabelById = {};
  ALL_UNITS_FLAT.forEach(function (u) {
    unitLabelById[u.id] = u.label;
  });

  var rows = attempts.map(function (row) {
    return {
      studentName: row.game_students ? row.game_students.full_name : "(đã xóa tài khoản)",
      unitLabel: unitLabelById[row.unit_id] || row.unit_id,
      activityLabel: ASSIGNMENT_ACTIVITY_LABELS[row.activity_type] || row.activity_type,
      scoreLabel: row.score + " / " + row.total,
      score: row.score,
      total: row.total,
      dateIso: row.submitted_at
    };
  }).concat(opens.map(function (row) {
    return {
      studentName: row.game_students ? row.game_students.full_name : "(đã xóa tài khoản)",
      unitLabel: unitLabelById[row.unit_id] || row.unit_id,
      activityLabel: "Wordwall: " + row.wordwall_name + " (đã mở)",
      scoreLabel: "—",
      score: null,
      total: null,
      dateIso: row.opened_at
    };
  }));

  if (!rows.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Nhóm này chưa có lượt làm bài nào.";
    wrap.appendChild(empty);
    return;
  }

  var ranked = computeDiligenceRanking(rows);
  wrap.appendChild(buildDiligenceRanking(ranked));

  var byStudent = {};
  rows.forEach(function (row) {
    if (!byStudent[row.studentName]) {
      byStudent[row.studentName] = [];
    }
    byStudent[row.studentName].push(row);
  });
  var studentNames = ranked.map(function (s) {
    return s.name;
  });

  studentNames.forEach(function (name) {
    var studentRows = byStudent[name].sort(function (a, b) {
      return new Date(b.dateIso) - new Date(a.dateIso);
    });

    var studentHeader = document.createElement("h4");
    studentHeader.className = "history-student-header";
    studentHeader.textContent = "👤 " + name + " (" + studentRows.length + " lượt)";
    wrap.appendChild(studentHeader);

    var table = document.createElement("table");
    table.className = "admin-table";

    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");
    ["Bài", "Dạng bài", "Điểm", "Ngày làm"].forEach(function (text) {
      var th = document.createElement("th");
      th.textContent = text;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    studentRows.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.appendChild(makeTd(row.unitLabel));
      tr.appendChild(makeTd(row.activityLabel));
      tr.appendChild(makeTd(row.scoreLabel));
      tr.appendChild(makeTd(formatDateTime(row.dateIso)));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    wrap.appendChild(table);
  });
}

function formatDateTime(iso) {
  var d = new Date(iso);
  var dd = d.getDate() < 10 ? "0" + d.getDate() : "" + d.getDate();
  var mm = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : "" + (d.getMonth() + 1);
  var hh = d.getHours() < 10 ? "0" + d.getHours() : "" + d.getHours();
  var mi = d.getMinutes() < 10 ? "0" + d.getMinutes() : "" + d.getMinutes();
  return hh + ":" + mi + " " + dd + "/" + mm + "/" + d.getFullYear();
}

async function loadAllAssignmentsForResults() {
  var wrap = document.getElementById("resultsAssignmentListWrap");
  wrap.textContent = "Đang tải...";

  var result = await supabaseClient
    .from("game_assignments")
    .select("*")
    .order("due_at", { ascending: false });

  if (result.error) {
    wrap.textContent = "Lỗi tải dữ liệu: " + result.error.message;
    return;
  }

  renderResultsAssignmentList(result.data);
}

function renderResultsAssignmentList(rows) {
  var wrap = document.getElementById("resultsAssignmentListWrap");
  wrap.innerHTML = "";

  if (!rows.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Chưa giao bài nào.";
    wrap.appendChild(empty);
    return;
  }

  buildAllUnitsFlat();
  var unitLabelById = {};
  ALL_UNITS_FLAT.forEach(function (u) {
    unitLabelById[u.id] = u.label;
  });

  var table = document.createElement("table");
  table.className = "admin-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  var headers = ["Bài kiểm tra", "Nhóm", "Hạn nộp", ""];
  var i;
  for (i = 0; i < headers.length; i++) {
    var th = document.createElement("th");
    th.textContent = headers[i];
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  var now = new Date();
  for (i = 0; i < rows.length; i++) {
    var row = rows[i];
    var tr = document.createElement("tr");

    var nameTd = document.createElement("td");
    nameTd.textContent = row.activity_name + " (" + (unitLabelById[row.unit_id] || row.unit_id) + ")";
    tr.appendChild(nameTd);

    var groupTd = document.createElement("td");
    groupTd.textContent = groupNameById(row.group_id);
    tr.appendChild(groupTd);

    var dueTd = document.createElement("td");
    var badge = document.createElement("span");
    var isPast = new Date(row.due_at) < now;
    badge.className = "status-badge " + (isPast ? "status-expired" : "status-active");
    badge.textContent = formatDateTime(row.due_at) + (isPast ? " (đã hết hạn)" : "");
    dueTd.appendChild(badge);
    tr.appendChild(dueTd);

    var actionTd = document.createElement("td");
    var viewBtn = document.createElement("button");
    viewBtn.className = "admin-btn-secondary";
    viewBtn.type = "button";
    viewBtn.textContent = "Xem kết quả";
    viewBtn.addEventListener("click", function (assignmentRow) {
      return function () {
        jumpToAssignmentResults(assignmentRow);
      };
    }(row));
    actionTd.appendChild(viewBtn);
    tr.appendChild(actionTd);

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  wrap.appendChild(table);
}

function jumpToAssignmentResults(assignmentRow) {
  document.getElementById("resultsUnitSelect").value = assignmentRow.unit_id;
  document.getElementById("resultsActivitySelect").value = assignmentRow.activity_type;
  document.getElementById("resultsGroupFilter").value = assignmentRow.group_id;
  currentResultsAssignmentId = assignmentRow.id;
  loadResults();
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
  var groupFilter = document.getElementById("resultsGroupFilter").value;

  var leaderboardWrap = document.getElementById("resultsLeaderboardWrap");
  var studentWrap = document.getElementById("resultsByStudentWrap");
  var questionWrap = document.getElementById("resultsByQuestionWrap");
  leaderboardWrap.textContent = "Đang tải...";
  studentWrap.textContent = "Đang tải...";
  questionWrap.textContent = "";

  var selectClause = groupFilter ? "*, game_students!inner(full_name, group_id)" : "*, game_students(full_name, group_id)";
  var query = supabaseClient
    .from("game_quiz_attempts")
    .select(selectClause)
    .eq("unit_id", unitId)
    .eq("activity_type", activityType)
    .order("submitted_at", { ascending: false });

  if (groupFilter) {
    query = query.eq("game_students.group_id", groupFilter);
  }
  if (currentResultsAssignmentId) {
    query = query.eq("assignment_id", currentResultsAssignmentId);
  }

  renderResultsFilterStatus();

  var result = await query;

  if (result.error) {
    leaderboardWrap.textContent = "Lỗi tải dữ liệu: " + result.error.message;
    studentWrap.textContent = "";
    return;
  }

  renderLeaderboard(result.data);
  renderResultsByStudent(result.data);
  renderResultsByQuestion(result.data);
}

function attemptDurationMs(attempt) {
  return new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime();
}

function bestAttemptPerStudent(attempts) {
  var bestByStudent = {};
  attempts.forEach(function (attempt) {
    var key = attempt.student_id || attempt.id;
    var current = bestByStudent[key];
    if (!current) {
      bestByStudent[key] = attempt;
      return;
    }
    var rate = attempt.total ? attempt.score / attempt.total : 0;
    var currentRate = current.total ? current.score / current.total : 0;
    if (rate > currentRate || (rate === currentRate && attemptDurationMs(attempt) < attemptDurationMs(current))) {
      bestByStudent[key] = attempt;
    }
  });
  return Object.keys(bestByStudent).map(function (key) {
    return bestByStudent[key];
  });
}

function renderLeaderboard(attempts) {
  var wrap = document.getElementById("resultsLeaderboardWrap");
  wrap.innerHTML = "";

  if (!attempts.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Chưa có lượt làm bài nào.";
    wrap.appendChild(empty);
    return;
  }

  var ranked = bestAttemptPerStudent(attempts).sort(function (a, b) {
    var rateA = a.total ? a.score / a.total : 0;
    var rateB = b.total ? b.score / b.total : 0;
    if (rateB !== rateA) {
      return rateB - rateA;
    }
    return attemptDurationMs(a) - attemptDurationMs(b);
  });

  var medals = ["🥇", "🥈", "🥉"];

  var table = document.createElement("table");
  table.className = "admin-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  var headers = ["Hạng", "Học sinh", "Điểm", "Ngày làm", "Thời gian làm"];
  var i;
  for (i = 0; i < headers.length; i++) {
    var th = document.createElement("th");
    th.textContent = headers[i];
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  for (i = 0; i < ranked.length; i++) {
    var attempt = ranked[i];
    var tr = document.createElement("tr");

    var rankTd = document.createElement("td");
    rankTd.textContent = medals[i] || ("#" + (i + 1));
    tr.appendChild(rankTd);

    var nameTd = document.createElement("td");
    nameTd.textContent = attempt.game_students ? attempt.game_students.full_name : "(đã xóa tài khoản)";
    tr.appendChild(nameTd);

    var scoreTd = document.createElement("td");
    scoreTd.textContent = attempt.score + " / " + attempt.total;
    tr.appendChild(scoreTd);

    var dateTd = document.createElement("td");
    dateTd.textContent = formatDateTime(attempt.submitted_at);
    tr.appendChild(dateTd);

    var durationTd = document.createElement("td");
    durationTd.textContent = formatDuration(attempt.started_at, attempt.submitted_at);
    tr.appendChild(durationTd);

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  wrap.appendChild(table);
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
  var headers = ["Học sinh", "Giờ nộp", "Đúng/Tổng", "Thời gian làm", "Câu làm sai"];
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

    var wrongTd = document.createElement("td");
    var wrongWords = (attempt.answers || [])
      .filter(function (ans) {
        return !ans.is_correct;
      })
      .map(function (ans) {
        return ans.word_en;
      });
    wrongTd.textContent = wrongWords.length ? wrongWords.join(", ") : "—";
    tr.appendChild(wrongTd);

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
