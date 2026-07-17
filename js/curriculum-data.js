var VOCAB_ACTIVITY_TEMPLATE = [
  { id: "a1", name: "Thẻ đọc", type: "flashcard", locked: false },
  { id: "a14", name: "Thẻ lật", type: "flip-card", locked: false },
  { id: "a2a", name: "Nghe từ, chọn hình", type: "quiz", format: "word-to-image", locked: false },
  { id: "a2b", name: "Nhìn hình, chọn từ", type: "quiz", format: "image-to-word", locked: false },
  { id: "a2d", name: "Chỉ nhìn hình, đoán từ", type: "quiz", format: "image-only-to-word", locked: false },
  { id: "a2e", name: "Nghe - Dịch", type: "quiz", format: "word-to-meaning", locked: false },
  { id: "a3", name: "Đánh máy có gợi ý", type: "typing", mode: "hint", locked: false },
  { id: "a4", name: "Đánh máy không gợi ý", type: "typing", mode: "blank", locked: false },
  { id: "a12", name: "Khuyết chữ cái", type: "missing-letter", locked: false },
  { id: "a13", name: "Kiểm tra nói", type: "speaking", locked: false }
];

function buildActivitiesForUnit(unit) {
  return VOCAB_ACTIVITY_TEMPLATE;
}

function buildWordwallActivities(rows) {
  var byUnit = {};
  rows.forEach(function (row) {
    if (!row.embed_url) {
      return;
    }
    if (!byUnit[row.unit_id]) {
      byUnit[row.unit_id] = [];
    }
    byUnit[row.unit_id].push({
      id: "ww_" + row.id,
      name: row.name,
      type: "wordwall",
      locked: false,
      embedUrl: row.embed_url
    });
  });
  return byUnit;
}

async function loadCurriculumData() {
  var classesResult = await supabaseClient.from("game_classes").select("*").order("sort_order", { ascending: true });
  var subjectsResult = await supabaseClient.from("game_subjects").select("*").order("sort_order", { ascending: true });
  var unitsResult = await supabaseClient.from("game_units").select("*").order("sort_order", { ascending: true });
  var wordwallResult = await supabaseClient.from("game_wordwall_activities").select("*").order("sort_order", { ascending: true });
  var wordwallByUnit = buildWordwallActivities(wordwallResult.data || []);

  var classes = (classesResult.data || []).map(function (row) {
    return { id: row.id, name: row.name, level: row.level, sort_order: row.sort_order };
  });

  var subjectsByClass = {};
  var subjectById = {};
  var i;

  var subjectRows = subjectsResult.data || [];
  for (i = 0; i < subjectRows.length; i++) {
    var srow = subjectRows[i];
    var subject = { id: srow.id, class_id: srow.class_id, name: srow.name, color: srow.color, sort_order: srow.sort_order, units: [] };
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
    var unit = { id: urow.id, subject_id: urow.subject_id, class_id: subj.class_id, name: urow.name, content_type: urow.content_type, is_demo: !!urow.is_demo, sort_order: urow.sort_order, progress: "" };
    unit.activities = buildActivitiesForUnit(unit).concat(wordwallByUnit[urow.id] || []);
    subj.units.push(unit);
  }

  DATA.classes = classes;
  DATA.subjectsByClass = subjectsByClass;
}
