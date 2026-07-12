async function loadSpeakingTestNames(unitId) {
  var result = await supabaseClient
    .from("game_speaking_questions")
    .select("test_name")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true });

  if (result.error) {
    return [];
  }

  var seen = {};
  var names = [];
  result.data.forEach(function (row) {
    if (!seen[row.test_name]) {
      seen[row.test_name] = true;
      names.push(row.test_name);
    }
  });
  return names;
}

async function loadSpeakingForUnit(unitId, testName) {
  var query = supabaseClient
    .from("game_speaking_questions")
    .select("*")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true });

  if (testName) {
    query = query.eq("test_name", testName);
  }

  var result = await query;

  if (result.error) {
    return [];
  }

  return result.data.map(function (row) {
    return {
      id: row.id,
      question: row.question_en,
      answer: row.answer_en,
      imageUrl: row.image_url,
      audioQuestionUrl: row.audio_question_url
    };
  });
}
