var VOCAB_ACTIVITY_TEMPLATE = [
  { id: "a1", name: "Thẻ đọc", type: "flashcard", locked: false },
  { id: "a14", name: "Thẻ lật", type: "flip-card", locked: false },
  { id: "a2e", name: "Dịch Anh - Việt", type: "quiz", format: "word-to-meaning", locked: false },
  { id: "a2f", name: "Dịch Việt - Anh", type: "quiz", format: "text-to-word", locked: false },
  { id: "a2a", name: "Nghe từ, chọn hình", type: "quiz", format: "word-to-image", locked: false },
  { id: "a2b", name: "Nhìn hình, chọn từ", type: "quiz", format: "image-to-word", locked: false },
  { id: "a2d", name: "Chỉ nhìn hình, đoán từ", type: "quiz", format: "image-only-to-word", locked: false },
  { id: "a3", name: "Đánh máy có gợi ý", type: "typing", mode: "hint", locked: false },
  { id: "a4", name: "Đánh máy không gợi ý", type: "typing", mode: "blank", locked: false },
  { id: "a18", name: "Nghe - Đánh máy", type: "free-typing", mode: "audio", locked: false },
  { id: "a12", name: "Khuyết chữ cái", type: "missing-letter", locked: false },
  { id: "a13", name: "Kiểm tra nói", type: "speaking", locked: false }
];

var IMAGE_DEPENDENT_ACTIVITY_IDS = ["a2a", "a2b", "a2d"];

function vocabActivitiesForUnit(unitId, unitsWithVocab, unitsWithImages, unitsWithSpeaking) {
  if (!unitsWithVocab[unitId]) {
    return [];
  }
  return VOCAB_ACTIVITY_TEMPLATE.filter(function (a) {
    if (IMAGE_DEPENDENT_ACTIVITY_IDS.indexOf(a.id) !== -1 && !unitsWithImages[unitId]) {
      return false;
    }
    if (a.id === "a13" && !unitsWithSpeaking[unitId]) {
      return false;
    }
    return true;
  });
}

var SENTENCE_ACTIVITY_TEMPLATE = [
  { id: "s1", name: "Thẻ đọc (câu)", type: "flashcard", locked: false },
  { id: "s14", name: "Thẻ lật (câu)", type: "flip-card", locked: false },
  { id: "s2e", name: "Dịch Anh - Việt (câu)", type: "quiz", format: "word-to-meaning", locked: false },
  { id: "s2f", name: "Dịch Việt - Anh (câu)", type: "quiz", format: "text-to-word", locked: false },
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
  // All of these reads are independent of one another, so fire them concurrently
  // instead of one-by-one - with 18 separate queries, awaiting them in sequence
  // added up to several seconds of pure round-trip latency as the content grew.
  var allResults = await Promise.all([
    supabaseClient.from("game_classes").select("*").order("sort_order", { ascending: true }),
    supabaseClient.from("game_subjects").select("*").order("sort_order", { ascending: true }),
    supabaseClient.from("game_chapters").select("*").order("sort_order", { ascending: true }),
    supabaseClient.from("game_units").select("*").order("sort_order", { ascending: true }),
    supabaseClient.from("game_wordwall_activities").select("*").order("sort_order", { ascending: true }),
    fetchAllRows(function () {
      return supabaseClient.from("game_sentences").select("unit_id");
    }),
    fetchAllRows(function () {
      return supabaseClient.from("game_vocab").select("unit_id");
    }),
    fetchAllRows(function () {
      return supabaseClient.from("game_vocab").select("unit_id").or("image_url.not.is.null,emoji.not.is.null");
    }),
    fetchAllRows(function () {
      return supabaseClient.from("game_speaking_questions").select("unit_id");
    }),
    supabaseClient.from("game_grammar_mcq").select("unit_id, set_name").order("sort_order", { ascending: true }),
    supabaseClient.from("game_grammar_typing").select("unit_id, set_name").order("sort_order", { ascending: true }),
    supabaseClient.from("game_grammar_matching").select("unit_id, set_name").order("sort_order", { ascending: true }),
    supabaseClient.from("game_grammar_dragfill").select("unit_id, set_name").order("sort_order", { ascending: true }),
    supabaseClient.from("game_photo_quiz_questions").select("unit_id, set_name").order("sort_order", { ascending: true }),
    supabaseClient.from("game_math_dragfill").select("unit_id, set_name").order("sort_order", { ascending: true }),
    supabaseClient.from("game_text_dragfill").select("unit_id, set_name").order("sort_order", { ascending: true }),
    supabaseClient.from("game_tests").select("*").order("sort_order", { ascending: true }),
    supabaseClient.from("game_test_sections").select("*").order("sort_order", { ascending: true })
  ]);
  var classesResult = allResults[0];
  var subjectsResult = allResults[1];
  var chaptersResult = allResults[2];
  var unitsResult = allResults[3];
  var wordwallResult = allResults[4];
  var sentenceUnitsResult = allResults[5];
  var vocabUnitsResult = allResults[6];
  var vocabImagesResult = allResults[7];
  var speakingUnitsResult = allResults[8];
  var grammarMcqUnitsResult = allResults[9];
  var grammarTypingUnitsResult = allResults[10];
  var grammarMatchingUnitsResult = allResults[11];
  var grammarDragfillUnitsResult = allResults[12];
  var photoQuizUnitsResult = allResults[13];
  var mathDragfillUnitsResult = allResults[14];
  var textDragfillUnitsResult = allResults[15];
  var testsResult = allResults[16];
  var testSectionsResult = allResults[17];

  var wordwallByUnit = buildWordwallActivities(wordwallResult.data || []);
  var unitsWithSentences = {};
  (sentenceUnitsResult.data || []).forEach(function (row) {
    unitsWithSentences[row.unit_id] = true;
  });
  var unitsWithVocab = {};
  (vocabUnitsResult.data || []).forEach(function (row) {
    unitsWithVocab[row.unit_id] = true;
  });
  var unitsWithImages = {};
  (vocabImagesResult.data || []).forEach(function (row) {
    unitsWithImages[row.unit_id] = true;
  });
  var unitsWithSpeaking = {};
  (speakingUnitsResult.data || []).forEach(function (row) {
    unitsWithSpeaking[row.unit_id] = true;
  });
  var grammarMcqByUnit = buildNamedSetActivities(grammarMcqUnitsResult.data || [], "gm_", "grammar-mcq");
  var grammarTypingByUnit = buildNamedSetActivities(grammarTypingUnitsResult.data || [], "gt_", "grammar-typing");
  var grammarMatchingByUnit = buildNamedSetActivities(grammarMatchingUnitsResult.data || [], "gx_", "grammar-matching");
  var grammarDragfillByUnit = buildNamedSetActivities(grammarDragfillUnitsResult.data || [], "gd_", "grammar-dragfill");
  var photoQuizByUnit = buildNamedSetActivities(photoQuizUnitsResult.data || [], "pq_", "photo-quiz");
  var mathDragfillByUnit = buildNamedSetActivities(mathDragfillUnitsResult.data || [], "md_", "math-dragfill");
  var textDragfillByUnit = buildNamedSetActivities(textDragfillUnitsResult.data || [], "td_", "text-dragfill");
  var sectionsByTestId = {};
  var claimedTestSetKeys = {};
  (testSectionsResult.data || []).forEach(function (row) {
    if (!sectionsByTestId[row.test_id]) {
      sectionsByTestId[row.test_id] = [];
    }
    sectionsByTestId[row.test_id].push(row);
    claimedTestSetKeys[row.unit_id + "||" + row.section_type + "||" + row.source_set_name] = true;
  });
  var testsByUnit = {};
  (testsResult.data || []).forEach(function (row) {
    if (!testsByUnit[row.unit_id]) {
      testsByUnit[row.unit_id] = [];
    }
    testsByUnit[row.unit_id].push({
      id: row.id,
      name: row.name,
      sort_order: row.sort_order,
      sections: sectionsByTestId[row.id] || []
    });
  });

  function excludeClaimedSets(list, unitId, sectionType) {
    return (list || []).filter(function (item) {
      return !claimedTestSetKeys[unitId + "||" + sectionType + "||" + item.setName];
    });
  }
  var classes = (classesResult.data || []).map(function (row) {
    return { id: row.id, name: row.name, level: row.level, sort_order: row.sort_order, demo_until: row.demo_until || null };
  });

  var subjectsByClass = {};
  var subjectById = {};
  var chapterById = {};
  var i;

  var subjectRows = subjectsResult.data || [];
  for (i = 0; i < subjectRows.length; i++) {
    var srow = subjectRows[i];
    var subject = { id: srow.id, class_id: srow.class_id, name: srow.name, color: srow.color, sort_order: srow.sort_order, units: [], chapters: [] };
    subjectById[srow.id] = subject;
    if (!subjectsByClass[srow.class_id]) {
      subjectsByClass[srow.class_id] = [];
    }
    subjectsByClass[srow.class_id].push(subject);
  }

  var chapterRows = chaptersResult.data || [];
  for (i = 0; i < chapterRows.length; i++) {
    var chrow = chapterRows[i];
    var chapterSubj = subjectById[chrow.subject_id];
    if (!chapterSubj) {
      continue;
    }
    var chapter = { id: chrow.id, subject_id: chrow.subject_id, name: chrow.name, sort_order: chrow.sort_order, units: [] };
    chapterById[chrow.id] = chapter;
    chapterSubj.chapters.push(chapter);
  }

  var unitRows = unitsResult.data || [];
  for (i = 0; i < unitRows.length; i++) {
    var urow = unitRows[i];
    var subj = subjectById[urow.subject_id];
    if (!subj) {
      continue;
    }
    var unit = { id: urow.id, subject_id: urow.subject_id, class_id: subj.class_id, chapter_id: urow.chapter_id || null, name: urow.name, content_type: urow.content_type, is_demo: !!urow.is_demo, sort_order: urow.sort_order, progress: "" };
    var unitTests = testsByUnit[urow.id] || [];
    unit.tests = unitTests;
    var testActivities = unitTests.map(function (t) {
      return { id: "run_" + t.id, name: t.name, type: "test", testSections: t.sections, locked: false };
    });
    if (urow.content_type === "test") {
      unit.activities = vocabActivitiesForUnit(urow.id, unitsWithVocab, unitsWithImages, unitsWithSpeaking).concat(testActivities);
    } else {
      unit.activities = vocabActivitiesForUnit(urow.id, unitsWithVocab, unitsWithImages, unitsWithSpeaking)
        .concat(unitsWithSentences[urow.id] ? SENTENCE_ACTIVITY_TEMPLATE : [])
        .concat(photoQuizByUnit[urow.id] || [])
        .concat(excludeClaimedSets(mathDragfillByUnit[urow.id], urow.id, "math-dragfill"))
        .concat(excludeClaimedSets(textDragfillByUnit[urow.id], urow.id, "text-dragfill"))
        .concat(wordwallByUnit[urow.id] || [])
        .concat(excludeClaimedSets(grammarMcqByUnit[urow.id], urow.id, "grammar-mcq"))
        .concat(excludeClaimedSets(grammarTypingByUnit[urow.id], urow.id, "grammar-typing"))
        .concat(excludeClaimedSets(grammarMatchingByUnit[urow.id], urow.id, "grammar-matching"))
        .concat(excludeClaimedSets(grammarDragfillByUnit[urow.id], urow.id, "grammar-dragfill"))
        .concat(testActivities);
    }
    subj.units.push(unit);
    var unitChapter = unit.chapter_id ? chapterById[unit.chapter_id] : null;
    if (unitChapter) {
      unitChapter.units.push(unit);
    }
  }

  DATA.classes = classes;
  DATA.subjectsByClass = subjectsByClass;
}
