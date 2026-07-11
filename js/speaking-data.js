async function loadSpeakingForUnit(unitId) {
  var result = await supabaseClient
    .from("game_speaking_questions")
    .select("*")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true });

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
