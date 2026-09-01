var SPEAK_ADMIN_ALL_STUDENTS = [];
var SPEAK_ADMIN_GROUPS = [];

var SPEAK_EVENT_LABELS = {
  translation_created: "Dịch câu mới",
  voice_input_started: "Bắt đầu nói (mic tiếng Việt)",
  voice_input_completed: "Nói xong (mic tiếng Việt)",
  voice_input_failed: "Nói lỗi (mic tiếng Việt)",
  speaking_started: "Bắt đầu luyện nói",
  speaking_completed: "Luyện nói xong (chấm điểm)",
  sentence_review_started: "Bắt đầu ôn câu đã lưu",
  sentence_review_completed: "Ôn câu đã lưu xong (chấm điểm)",
  sentence_saved: "Lưu câu",
  vocabulary_opened: "Xem 1 từ",
  vocabulary_saved: "Học 1 từ",
  content_blocked: "Nội dung bị chặn"
};

function formatSpeakEventDetail(type, detail) {
  detail = detail || {};
  if (type === "translation_created") {
    return (detail.vietnamese || "") + " → " + (detail.english || "");
  }
  if (type === "voice_input_completed") {
    return detail.transcript || "";
  }
  if (type === "speaking_completed" || type === "sentence_review_completed") {
    var scoreText = typeof detail.score === "number" ? detail.score.toFixed(1) + "/10" : "?";
    return "Mục tiêu: " + (detail.target || "") + " | Điểm: " + scoreText + " (" + (detail.verdict || "") + ")";
  }
  if (type === "vocabulary_saved" || type === "vocabulary_opened") {
    return detail.word || detail.lemma || "";
  }
  if (type === "content_blocked") {
    return detail.text || "";
  }
  return "";
}

async function loadSpeakAdminGroups() {
  var result = await supabaseClient
    .from("game_teaching_groups")
    .select("id, name")
    .order("created_at", { ascending: true });
  SPEAK_ADMIN_GROUPS = result.data || [];
  populateSpeakAdminGroupSelect();
}

function populateSpeakAdminGroupSelect() {
  var select = document.getElementById("speakAdminGroupSelect");
  var previous = select.value;
  select.innerHTML = "";

  var placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.text = "-- Chọn Nhóm --";
  select.appendChild(placeholder);

  SPEAK_ADMIN_GROUPS.forEach(function (g) {
    var opt = document.createElement("option");
    opt.value = g.id;
    opt.text = g.name;
    select.appendChild(opt);
  });

  if (previous) {
    select.value = previous;
  }
}

async function loadSpeakAdminStudents() {
  var result = await supabaseClient
    .from("game_students")
    .select("id, full_name, username, group_id")
    .order("full_name", { ascending: true });
  SPEAK_ADMIN_ALL_STUDENTS = result.data || [];
  populateSpeakAdminStudentSelect();
}

function populateSpeakAdminStudentSelect() {
  var groupId = document.getElementById("speakAdminGroupSelect").value;
  var select = document.getElementById("speakAdminStudentSelect");
  var previous = select.value;
  select.innerHTML = "";

  var placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.text = "-- Chọn học sinh --";
  select.appendChild(placeholder);

  var scoped = groupId
    ? SPEAK_ADMIN_ALL_STUDENTS.filter(function (s) { return s.group_id === groupId; })
    : SPEAK_ADMIN_ALL_STUDENTS;

  scoped.forEach(function (s) {
    var opt = document.createElement("option");
    opt.value = s.id;
    opt.text = s.full_name + " (" + s.username + ")";
    select.appendChild(opt);
  });

  if (previous && Array.prototype.some.call(select.options, function (o) { return o.value === previous; })) {
    select.value = previous;
  }
}

async function loadSpeakAdminDetail() {
  var studentId = document.getElementById("speakAdminStudentSelect").value;
  var summaryEl = document.getElementById("speakAdminSummary");
  var historyEl = document.getElementById("speakAdminHistory");

  summaryEl.innerHTML = "";
  historyEl.innerHTML = "";

  if (!studentId) {
    return;
  }

  summaryEl.textContent = "Đang tải...";

  var todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  var fromIso = todayStart.toISOString();

  var eventsResult = await supabaseClient
    .from("game_speak_events")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(200);

  var sentencesResult = await supabaseClient
    .from("game_own_sentences")
    .select("id")
    .eq("student_id", studentId)
    .eq("is_saved", true);

  var vocabResult = await supabaseClient
    .from("game_vocab")
    .select("id")
    .eq("owner_student_id", studentId);

  var events = eventsResult.data || [];
  var sentenceCount = (sentencesResult.data || []).length;
  var vocabCount = (vocabResult.data || []).length;

  var todayEvents = events.filter(function (e) { return e.created_at >= fromIso; });
  function countByType(type) {
    return todayEvents.filter(function (e) { return e.event_type === type; }).length;
  }

  summaryEl.innerHTML = "";
  var summaryGrid = document.createElement("div");
  summaryGrid.className = "speak-admin-summary-grid";

  var stats = [
    ["Câu mới hôm nay", countByType("translation_created")],
    ["Từ mới tự chọn hôm nay", countByType("vocabulary_saved")],
    ["Luyện nói hôm nay", countByType("speaking_completed") + countByType("sentence_review_completed")],
    ["Tổng câu đã lưu", sentenceCount],
    ["Tổng từ đã học", vocabCount]
  ];
  stats.forEach(function (pair) {
    var box = document.createElement("div");
    box.className = "speak-admin-stat-box";

    var num = document.createElement("div");
    num.className = "speak-admin-stat-num";
    num.textContent = pair[1];
    box.appendChild(num);

    var label = document.createElement("div");
    label.className = "speak-admin-stat-label";
    label.textContent = pair[0];
    box.appendChild(label);

    summaryGrid.appendChild(box);
  });
  summaryEl.appendChild(summaryGrid);

  historyEl.innerHTML = "";
  if (!events.length) {
    historyEl.innerHTML = "<p class=\"admin-hint\">Chưa có lịch sử nào.</p>";
    return;
  }

  var table = document.createElement("table");
  table.className = "ranking-table";

  var thead = document.createElement("thead");
  var headRow = document.createElement("tr");
  ["Thời gian", "Sự kiện", "Chi tiết"].forEach(function (text) {
    var th = document.createElement("th");
    th.textContent = text;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  events.forEach(function (row) {
    var tr = document.createElement("tr");

    var timeTd = document.createElement("td");
    timeTd.textContent = new Date(row.created_at).toLocaleString("vi-VN");
    tr.appendChild(timeTd);

    var typeTd = document.createElement("td");
    typeTd.textContent = SPEAK_EVENT_LABELS[row.event_type] || row.event_type;
    tr.appendChild(typeTd);

    var detailTd = document.createElement("td");
    detailTd.textContent = formatSpeakEventDetail(row.event_type, row.detail);
    tr.appendChild(detailTd);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  historyEl.appendChild(table);
}

document.addEventListener("DOMContentLoaded", function () {
  loadSpeakAdminGroups();
  loadSpeakAdminStudents();
  document.getElementById("speakAdminGroupSelect").addEventListener("change", function () {
    populateSpeakAdminStudentSelect();
    document.getElementById("speakAdminSummary").innerHTML = "";
    document.getElementById("speakAdminHistory").innerHTML = "";
  });
  document.getElementById("speakAdminStudentSelect").addEventListener("change", loadSpeakAdminDetail);
});
