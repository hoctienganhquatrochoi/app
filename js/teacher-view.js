var ASSIGNMENT_ACTIVITY_LABELS = {
  "quiz": "Quiz",
  "missing-letter": "Khuyết chữ cái",
  "typing-hint": "Đánh máy có gợi ý",
  "typing-blank": "Đánh máy không gợi ý",
  "flip-card": "Thẻ lật",
  "flashcard": "Thẻ đọc",
  "free-typing-hint": "Nghe - Đánh máy (key)",
  "free-typing-blank": "Nghe đánh máy không key",
  "free-typing-audio": "Nghe - Đánh máy",
  "grammar-mcq": "Trắc nghiệm ngữ pháp",
  "grammar-typing": "Viết câu trả lời",
  "grammar-matching": "Nối câu",
  "grammar-dragfill": "Điền từ vào chỗ trống",
  "photo-quiz": "Đọc/Nghe theo ảnh",
  "math-dragfill": "Toán - Điền số",
  "text-dragfill": "Điền đoạn văn/hội thoại",
  "test": "Đề kiểm tra"
};

var MIN_WORDWALL_SECONDS_FOR_CREDIT = 15;
var MAX_WORDWALL_TAB_SWITCHES_FOR_CREDIT = 3;
var TEACHER_SESSION_KEY = "efkTeacherSession";
var teacherGroup = null;

function makeTd(text) {
  var td = document.createElement("td");
  td.textContent = text || "";
  return td;
}

function formatSecondsVN(totalSeconds) {
  var seconds = Math.max(0, Math.floor(totalSeconds || 0));
  var minutes = Math.floor(seconds / 60);
  var rem = seconds % 60;
  if (minutes > 0) {
    return minutes + " phút " + rem + " giây";
  }
  return rem + " giây";
}

function formatDateTime(iso) {
  var d = new Date(iso);
  var dd = d.getDate() < 10 ? "0" + d.getDate() : "" + d.getDate();
  var mm = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : "" + (d.getMonth() + 1);
  var hh = d.getHours() < 10 ? "0" + d.getHours() : "" + d.getHours();
  var mi = d.getMinutes() < 10 ? "0" + d.getMinutes() : "" + d.getMinutes();
  return hh + ":" + mi + " " + dd + "/" + mm + "/" + d.getFullYear();
}

function formatDateInputValue(d) {
  var yyyy = d.getFullYear();
  var mm = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : "" + (d.getMonth() + 1);
  var dd = d.getDate() < 10 ? "0" + d.getDate() : "" + d.getDate();
  return yyyy + "-" + mm + "-" + dd;
}

function localDateKey(dateInput) {
  var d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  var yyyy = d.getFullYear();
  var mm = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : "" + (d.getMonth() + 1);
  var dd = d.getDate() < 10 ? "0" + d.getDate() : "" + d.getDate();
  return yyyy + "-" + mm + "-" + dd;
}

function setTeacherDateRange(days) {
  var today = new Date();
  var toStr = formatDateInputValue(today);
  var fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - (days - 1));
  var fromStr = formatDateInputValue(fromDate);
  document.getElementById("teacherFromDate").value = fromStr;
  document.getElementById("teacherToDate").value = toStr;
}

function buildUnitLabelMap() {
  var map = {};
  var c, s, u;
  for (c = 0; c < DATA.classes.length; c++) {
    var cls = DATA.classes[c];
    var subjects = DATA.subjectsByClass[cls.id] || [];
    for (s = 0; s < subjects.length; s++) {
      for (u = 0; u < subjects[s].units.length; u++) {
        var unit = subjects[s].units[u];
        var unitName = unit.name || ("(Không đặt tên #" + unit.id.slice(-4) + ")");
        map[unit.id] = cls.name + " › " + (subjects[s].name || "") + " › " + unitName;
      }
    }
  }
  return map;
}

function computeDiligenceRanking(rows) {
  var byStudent = {};
  var order = [];
  rows.forEach(function (row) {
    if (row.activityType === "flashcard" || row.activityType === "flip-card") {
      return;
    }
    if (typeof row.durationSeconds === "number" && row.durationSeconds < MIN_WORDWALL_SECONDS_FOR_CREDIT) {
      return;
    }
    if (typeof row.tabSwitchCount === "number" && row.tabSwitchCount > MAX_WORDWALL_TAB_SWITCHES_FOR_CREDIT) {
      return;
    }
    if (!byStudent[row.studentName]) {
      byStudent[row.studentName] = { name: row.studentName, count: 0, days: {}, scoreSum: 0, totalSum: 0 };
      order.push(row.studentName);
    }
    var s = byStudent[row.studentName];
    s.count++;
    s.days[localDateKey(row.dateIso)] = true;
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

function renderTeacherResults(attempts, opens) {
  var rankingWrap = document.getElementById("teacherRankingWrap");
  var historyWrap = document.getElementById("teacherHistoryWrap");
  rankingWrap.innerHTML = "";
  historyWrap.innerHTML = "";

  var unitLabelById = buildUnitLabelMap();

  var rows = attempts.map(function (row) {
    var attemptTabLabel = typeof row.tab_switch_count === "number" ? " · Rời màn hình " + row.tab_switch_count + " lần" : "";
    return {
      studentName: row.game_students ? row.game_students.full_name : "(đã xóa tài khoản)",
      unitLabel: unitLabelById[row.unit_id] || row.unit_id,
      activityLabel: (ASSIGNMENT_ACTIVITY_LABELS[row.activity_type] || row.activity_type) + attemptTabLabel,
      scoreLabel: row.score + " / " + row.total,
      score: row.score,
      total: row.total,
      dateIso: row.submitted_at,
      tabSwitchCount: row.tab_switch_count,
      activityType: row.activity_type
    };
  }).concat(opens.map(function (row) {
    var durationLabel = row.duration_seconds != null ? " (" + formatSecondsVN(row.duration_seconds) + ")" : " (đã mở)";
    var tabLabel = typeof row.tab_switch_count === "number" ? " · Rời màn hình " + row.tab_switch_count + " lần" : "";
    return {
      studentName: row.game_students ? row.game_students.full_name : "(đã xóa tài khoản)",
      unitLabel: unitLabelById[row.unit_id] || row.unit_id,
      activityLabel: "Wordwall: " + row.wordwall_name + durationLabel + tabLabel,
      scoreLabel: "—",
      score: null,
      total: null,
      dateIso: row.opened_at,
      durationSeconds: row.duration_seconds,
      tabSwitchCount: row.tab_switch_count
    };
  }));

  if (!rows.length) {
    var empty = document.createElement("div");
    empty.className = "admin-status";
    empty.textContent = "Chưa có lượt làm bài nào.";
    historyWrap.appendChild(empty);
    return;
  }

  var ranked = computeDiligenceRanking(rows);
  rankingWrap.appendChild(buildDiligenceRanking(ranked));

  var countedByName = {};
  ranked.forEach(function (s) {
    countedByName[s.name] = s.count;
  });

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
  Object.keys(byStudent).forEach(function (name) {
    if (studentNames.indexOf(name) === -1) {
      studentNames.push(name);
    }
  });

  studentNames.forEach(function (name) {
    var studentRows = byStudent[name].sort(function (a, b) {
      return new Date(b.dateIso) - new Date(a.dateIso);
    });
    var countedCount = countedByName[name] || 0;

    var studentHeader = document.createElement("h4");
    studentHeader.className = "history-student-header";
    studentHeader.textContent = "👤 " + name + " (" + countedCount + "/" + studentRows.length + " lượt được tính)";
    historyWrap.appendChild(studentHeader);

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

    historyWrap.appendChild(table);
  });
}

async function loadTeacherResults() {
  var historyWrap = document.getElementById("teacherHistoryWrap");
  var rankingWrap = document.getElementById("teacherRankingWrap");
  rankingWrap.innerHTML = "";
  historyWrap.textContent = "Đang tải...";

  var fromStr = document.getElementById("teacherFromDate").value;
  var toStr = document.getElementById("teacherToDate").value;
  var fromIso = fromStr ? new Date(fromStr + "T00:00:00").toISOString() : null;
  var toIso = toStr ? new Date(toStr + "T23:59:59.999").toISOString() : null;

  var attemptsQuery = supabaseClient
    .from("game_quiz_attempts")
    .select("*, game_students!inner(full_name, group_id)")
    .eq("game_students.group_id", teacherGroup.id)
    .order("submitted_at", { ascending: false })
    .limit(500);
  var opensQuery = supabaseClient
    .from("game_wordwall_opens")
    .select("*, game_students!inner(full_name, group_id)")
    .eq("game_students.group_id", teacherGroup.id)
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
    historyWrap.textContent = "Lỗi tải dữ liệu: " + attemptsResult.error.message;
    return;
  }
  if (opensResult.error) {
    historyWrap.textContent = "Lỗi tải dữ liệu: " + opensResult.error.message;
    return;
  }

  renderTeacherResults(attemptsResult.data || [], opensResult.data || []);
}

function showTeacherMain() {
  document.getElementById("teacherLoginOverlay").style.display = "none";
  document.getElementById("teacherMain").style.display = "block";
  document.getElementById("teacherLogoutBtn").style.display = "inline-block";
  document.getElementById("teacherGroupNameLabel").textContent = "Nhóm: " + teacherGroup.name;
  setTeacherDateRange(7);
  loadTeacherResults();
}

async function handleTeacherLogin() {
  var username = document.getElementById("teacherLoginUsername").value.trim();
  var password = document.getElementById("teacherLoginPassword").value;
  var statusEl = document.getElementById("teacherLoginStatus");

  if (!username || !password) {
    statusEl.textContent = "Nhập đủ tài khoản và mật khẩu.";
    return;
  }

  statusEl.textContent = "Đang đăng nhập...";
  var result = await supabaseClient
    .from("game_teaching_groups")
    .select("id, name")
    .eq("teacher_username", username)
    .eq("teacher_password", password)
    .maybeSingle();

  if (result.error || !result.data) {
    statusEl.textContent = "Sai tài khoản hoặc mật khẩu.";
    return;
  }

  teacherGroup = result.data;
  sessionStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify(teacherGroup));
  showTeacherMain();
}

function handleTeacherLogout() {
  sessionStorage.removeItem(TEACHER_SESSION_KEY);
  teacherGroup = null;
  document.getElementById("teacherMain").style.display = "none";
  document.getElementById("teacherLogoutBtn").style.display = "none";
  document.getElementById("teacherGroupNameLabel").textContent = "Đăng nhập để xem kết quả nhóm của bạn";
  document.getElementById("teacherLoginOverlay").style.display = "flex";
  document.getElementById("teacherLoginUsername").value = "";
  document.getElementById("teacherLoginPassword").value = "";
}

document.addEventListener("DOMContentLoaded", async function () {
  document.getElementById("teacherLoginSubmitBtn").addEventListener("click", handleTeacherLogin);
  document.getElementById("teacherLoginPassword").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      handleTeacherLogin();
    }
  });
  document.getElementById("teacherLogoutBtn").addEventListener("click", handleTeacherLogout);
  document.getElementById("teacherRange7Btn").addEventListener("click", function () {
    setTeacherDateRange(7);
    loadTeacherResults();
  });
  document.getElementById("teacherRange30Btn").addEventListener("click", function () {
    setTeacherDateRange(30);
    loadTeacherResults();
  });
  document.getElementById("teacherLoadBtn").addEventListener("click", loadTeacherResults);

  await loadCurriculumData();

  var saved = sessionStorage.getItem(TEACHER_SESSION_KEY);
  if (saved) {
    try {
      teacherGroup = JSON.parse(saved);
      showTeacherMain();
    } catch (e) {
      sessionStorage.removeItem(TEACHER_SESSION_KEY);
    }
  }
});
