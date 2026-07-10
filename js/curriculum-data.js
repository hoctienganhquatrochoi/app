var VOCAB_ACTIVITY_TEMPLATE = [
  { id: "a1", name: "Thẻ đọc", type: "flashcard", locked: false },
  { id: "a2a", name: "Nghe từ, chọn hình", type: "quiz", format: "word-to-image", locked: false, maxQuestions: 30 },
  { id: "a2b", name: "Nhìn hình, chọn từ", type: "quiz", format: "image-to-word", locked: false, maxQuestions: 30 },
  { id: "a2d", name: "Chỉ nhìn hình, đoán từ", type: "quiz", format: "image-only-to-word", locked: false, maxQuestions: 30 },
  { id: "a2e", name: "Nghe từ, chọn nghĩa", type: "quiz", format: "word-to-meaning", locked: false, maxQuestions: 30 },
  { id: "a3", name: "Đánh máy có gợi ý", type: "typing", mode: "hint", locked: false, maxQuestions: 30 },
  { id: "a4", name: "Đánh máy không gợi ý", type: "typing", mode: "blank", locked: false, maxQuestions: 30 },
  { id: "a6", name: "Sắp xếp câu song ngữ", type: "sentence-order", locked: true },
  { id: "a12", name: "Khuyết chữ cái", type: "missing-letter", locked: false, maxQuestions: 30 }
];

var PLACEHOLDER_ACTIVITY = [
  { id: "placeholder", name: "Ngữ pháp (sắp ra mắt)", type: "placeholder", locked: true }
];

function buildActivitiesForUnit(unit) {
  return unit.content_type === "vocab" ? VOCAB_ACTIVITY_TEMPLATE : PLACEHOLDER_ACTIVITY;
}

async function loadCurriculumData() {
  var classesResult = await supabaseClient.from("game_classes").select("*").order("sort_order", { ascending: true });
  var subjectsResult = await supabaseClient.from("game_subjects").select("*").order("created_at", { ascending: true });
  var unitsResult = await supabaseClient.from("game_units").select("*").order("created_at", { ascending: true });

  var classes = (classesResult.data || []).map(function (row) {
    return { id: row.id, name: row.name, level: row.level, sort_order: row.sort_order };
  });

  var subjectsByClass = {};
  var subjectById = {};
  var i;

  var subjectRows = subjectsResult.data || [];
  for (i = 0; i < subjectRows.length; i++) {
    var srow = subjectRows[i];
    var subject = { id: srow.id, class_id: srow.class_id, name: srow.name, color: srow.color, units: [] };
    subjectById[srow.id] = subject;
    if (!subjectsByClass[srow.class_id]) {
      subjectsByClass[srow.class_id] = [];
    }
    subjectsByClass[srow.class_id].push(subject);
  }

  var unitRows = unitsResult.data || [];
  for (i = 0; i < unitRows.length; i++) {
    var urow = unitRows[i];
    var subj = subjectById[urow.subject_id];
    if (!subj) {
      continue;
    }
    var unit = { id: urow.id, subject_id: urow.subject_id, name: urow.name, content_type: urow.content_type, progress: "" };
    unit.activities = buildActivitiesForUnit(unit);
    subj.units.push(unit);
  }

  DATA.classes = classes;
  DATA.subjectsByClass = subjectsByClass;
}
