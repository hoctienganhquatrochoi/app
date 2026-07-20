async function loadPhotoQuizSet(unitId, setName) {
  var setResult = await supabaseClient.from("game_photo_quiz_sets").select("image_url").eq("unit_id", unitId).eq("set_name", setName).maybeSingle();
  var questionsResult = await supabaseClient.from("game_photo_quiz_questions").select("*").eq("unit_id", unitId).eq("set_name", setName).order("sort_order", { ascending: true });
  return {
    imageUrl: setResult.data ? setResult.data.image_url : null,
    questions: questionsResult.data || []
  };
}
