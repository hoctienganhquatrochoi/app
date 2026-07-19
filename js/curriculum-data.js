var VOCAB_ACTIVITY_TEMPLATE = [
  { id: "a1", name: "Thẻ đọc", type: "flashcard", locked: false },
  { id: "a14", name: "Thẻ lật", type: "flip-card", locked: false },
  { id: "a2a", name: "Nghe từ, chọn hình", type: "quiz", format: "word-to-image", locked: false },
  { id: "a2b", name: "Nhìn hình, chọn từ", type: "quiz", format: "image-to-word", locked: false },
  { id: "a2d", name: "Chỉ nhìn hình, đoán từ", type: "quiz", format: "image-only-to-word", locked: false },
  { id: "a2e", name: "Nghe - Dịch", type: "quiz", format: "word-to-meaning", locked: false },
  { id: "a3", name: "Đánh máy có gợi ý", type: "typing", mode: "hint", locked: false },
  { id: "a4", name: "Đánh máy không gợi ý", type: "typing", mode: "blank", locked: false },
  { id: "a16", name: "Nghe - Đánh máy (key)", type: "free-typing", mode: "hint", locked: false },
  { id: "a17", name: "Nghe đánh máy không key", type: "free-typing", mode: "blank", locked: false },
  { id: "a18", name: "Nghe - Đánh máy", type: "free-typing", mode: "audio", locked: false },
  { id: "a12", name: "Khuyết chữ cái", type: "missing-letter", locked: false },
  { id: "a13", name: "Kiểm tra nói", type: "speaking", locked: false }
];

var SENTENCE_ACTIVITY_TEMPLATE = [
  { id: "s1", name: "Thẻ đọc (câu)", type: "flashcard", locked: false },
  { id: "s14", name: "Thẻ lật (câu)", type: "flip-card", locked: false },
  { id: "s2e", name: "Nghe - Dịch (câu)", type: "quiz", format: "word-to-meaning", locked: false },
  { id: "s3", name: "Đánh máy có gợi ý (câu)", type: "free-typing", mode: "hint", locked: false },
  { id: "s4", name: "Đánh máy không gợi ý (câu)", type: "free-typing", mode: "blank", locked: false },
  { id: "s18", name: "Nghe - Đánh máy (câu)", type: "free-typing", mode: "audio", locked: false }
];

function buildNamedSetActivities(rows, idPrefix, type) {
  var byUnit = {};
  var seen = {};
  rows.forEach(function (row) {
    var key = row.unit_id + "||" + row.set_name;
    if (seen[key]) {
      return;
    }
    seen[key] = true;
    if (!byUnit[row.unit_id]) {
      byUnit[row.unit_id] = [];
    }
    byUnit[row.unit_id].push({
      id: idPrefix + row.set_name,
      name: row.set_name,
      type: type,
      setName: row.set_name,
      locked: false
    });
  });
  return byUnit;
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
  var sentenceUnitsResult = await supabaseClient.from("game_sentences").select("unit_id");
  var unitsWithSentences = {};
  (sentenceUnitsResult.data || []).forEach(function (row) {
    unitsWithSentences[row.unit_id] = true;
  });
  var grammarMcqUnitsResult = await supabaseClient.from("game_grammar_mcq").select("unit_id, set_name").order("sort_order", { ascending: true });
  var grammarMcqByUnit = buildNamedSetActivities(grammarMcqUnitsResult.data || [], "gm_", "grammar-mcq");
  var grammarTypingUnitsResult = await supabaseClient.from("game_grammar_typing").select("unit_id, set_name").order("sort_order", { ascending: true });
  var grammarTypingByUnit = buildNamedSetActivities(grammarTypingUnitsResult.data || [], "gt_", "grammar-typing");
  var grammarMatchingUnitsResult = await supabaseClient.from("game_grammar_matching").select("unit_id, set_name").order("sort_order", { ascending: true });
  var grammarMatchingByUnit = buildNamedSetActivities(grammarMatchingUnitsResult.data || [], "gx_", "grammar-matching");
  var grammarDragfillUnitsResult = await supabaseClient.from("game_grammar_dragfill").select("unit_id, set_name").order("sort_order", { ascending: true });
  var grammarDragfillByUnit = buildNamedSetActivities(grammarDragfillUnitsResult.data || [], "gd_", "grammar-dragfill");
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
    unit.activities = VOCAB_ACTIVITY_TEMPLATE
      .concat(unitsWithSentences[urow.id] ? SENTENCE_ACTIVITY_TEMPLATE : [])
      .concat(grammarMcqByUnit[urow.id] || [])
      .concat(grammarTypingByUnit[urow.id] || [])
      .concat(grammarMatchingByUnit[urow.id] || [])
      .concat(grammarDragfillByUnit[urow.id] || [])
      .concat(wordwallByUnit[urow.id] || []);
    subj.units.push(unit);
  }

  DATA.classes = classes;
  DATA.subjectsByClass = subjectsByClass;
}
