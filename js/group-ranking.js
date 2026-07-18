function computeStudentDiligenceRanking(rows) {
  var byStudent = {};
  var order = [];
  rows.forEach(function (row) {
    if (!byStudent[row.studentName]) {
      byStudent[row.studentName] = { name: row.studentName, studentId: row.studentId, count: 0, days: {}, scoreSum: 0, totalSum: 0 };
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
    return { name: name, studentId: s.studentId, count: s.count, days: dayCount, avgPercent: avgPercent };
  }).sort(function (a, b) {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return (b.avgPercent || 0) - (a.avgPercent || 0);
  });
}

function computeOwnDailyBreakdown(rows, studentId) {
  var byDay = {};
  var order = [];
  rows.forEach(function (row) {
    if (row.studentId !== studentId) {
      return;
    }
    var day = row.dateIso.slice(0, 10);
    if (!byDay[day]) {
      byDay[day] = { day: day, count: 0, scoreSum: 0, totalSum: 0 };
      order.push(day);
    }
    var d = byDay[day];
    d.count++;
    if (typeof row.score === "number" && typeof row.total === "number") {
      d.scoreSum += row.score;
      d.totalSum += row.total;
    }
  });

  return order.map(function (day) {
    var d = byDay[day];
    var avgPercent = d.totalSum > 0 ? Math.round((d.scoreSum / d.totalSum) * 100) : null;
    return { day: day, count: d.count, avgPercent: avgPercent };
  }).sort(function (a, b) {
    return b.day.localeCompare(a.day);
  });
}

function formatDayLabel(isoDay) {
  var parts = isoDay.split("-");
  return parts[2] + "/" + parts[1];
}

function buildOwnDailyBreakdown(rows, studentId) {
  var daily = computeOwnDailyBreakdown(rows, studentId);
  if (!daily.length) {
    return null;
  }

  var box = document.createElement("div");
  box.style.marginTop = "16px";

  var heading = document.createElement("p");
  heading.className = "fc-hint";
  heading.style.marginBottom = "8px";
  heading.textContent = "📅 Lịch học của em theo ngày (7 ngày gần đây)";
  box.appendChild(heading);

  var table = document.createElement("table");
  table.className = "ranking-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  ["Ngày", "Số lượt học", "Điểm TB"].forEach(function (text) {
    var th = document.createElement("th");
    th.textContent = text;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  daily.forEach(function (d) {
    var tr = document.createElement("tr");

    var dayTd = document.createElement("td");
    dayTd.textContent = formatDayLabel(d.day);
    tr.appendChild(dayTd);

    var countTd = document.createElement("td");
    countTd.textContent = "" + d.count;
    tr.appendChild(countTd);

    var scoreTd = document.createElement("td");
    scoreTd.textContent = d.avgPercent === null ? "—" : d.avgPercent + "%";
    tr.appendChild(scoreTd);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  box.appendChild(table);
  return box;
}

function openRankingModal() {
  if (!currentStudent || !currentStudent.group_id) {
    return;
  }

  var overlay = document.getElementById("rankingModalOverlay");
  var body = document.getElementById("rankingModalBody");
  body.textContent = "Đang tải...";
  overlay.style.display = "flex";

  loadGroupRanking();
}

function closeRankingModal() {
  document.getElementById("rankingModalOverlay").style.display = "none";
}

async function loadGroupRanking() {
  var body = document.getElementById("rankingModalBody");
  var groupId = currentStudent.group_id;

  var sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  var fromIso = sevenDaysAgo.toISOString();

  var attemptsResult = await supabaseClient
    .from("game_quiz_attempts")
    .select("student_id, score, total, submitted_at, game_students!inner(full_name, group_id)")
    .eq("game_students.group_id", groupId)
    .gte("submitted_at", fromIso)
    .limit(500);

  var opensResult = await supabaseClient
    .from("game_wordwall_opens")
    .select("student_id, opened_at, game_students!inner(full_name, group_id)")
    .eq("game_students.group_id", groupId)
    .gte("opened_at", fromIso)
    .limit(500);

  if (attemptsResult.error || opensResult.error) {
    body.textContent = "Không tải được xếp hạng, thử lại sau nhé.";
    return;
  }

  var rows = (attemptsResult.data || []).map(function (row) {
    return {
      studentId: row.student_id,
      studentName: row.game_students ? row.game_students.full_name : "?",
      score: row.score,
      total: row.total,
      dateIso: row.submitted_at
    };
  }).concat((opensResult.data || []).map(function (row) {
    return {
      studentId: row.student_id,
      studentName: row.game_students ? row.game_students.full_name : "?",
      score: null,
      total: null,
      dateIso: row.opened_at
    };
  }));

  body.innerHTML = "";

  var hint = document.createElement("p");
  hint.className = "fc-hint";
  hint.style.marginBottom = "12px";
  hint.textContent = "Xếp theo số lượt học nhiều nhất trong 7 ngày gần đây.";
  body.appendChild(hint);

  if (!rows.length) {
    var empty = document.createElement("p");
    empty.textContent = "Nhóm mình chưa có lượt học nào trong 7 ngày qua.";
    body.appendChild(empty);
    return;
  }

  var ranked = computeStudentDiligenceRanking(rows);
  var medals = ["🥇", "🥈", "🥉"];

  var table = document.createElement("table");
  table.className = "ranking-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  ["Hạng", "Học sinh", "Số lượt học", "Điểm TB"].forEach(function (text) {
    var th = document.createElement("th");
    th.textContent = text;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  ranked.forEach(function (s, idx) {
    var tr = document.createElement("tr");
    if (s.studentId === currentStudent.id) {
      tr.className = "ranking-row-me";
    }

    var rankTd = document.createElement("td");
    rankTd.textContent = medals[idx] || ("#" + (idx + 1));
    tr.appendChild(rankTd);

    var nameTd = document.createElement("td");
    nameTd.textContent = s.name + (s.studentId === currentStudent.id ? " (em)" : "");
    tr.appendChild(nameTd);

    var countTd = document.createElement("td");
    countTd.textContent = "" + s.count;
    tr.appendChild(countTd);

    var scoreTd = document.createElement("td");
    scoreTd.textContent = s.avgPercent === null ? "—" : s.avgPercent + "%";
    tr.appendChild(scoreTd);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  body.appendChild(table);

  var dailyBox = buildOwnDailyBreakdown(rows, currentStudent.id);
  if (dailyBox) {
    body.appendChild(dailyBox);
  }
}
