async function loadGrammarMcqForUnit(unitId) {
  var result = await supabaseClient
    .from("game_grammar_mcq")
    .select("*")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true });
  if (result.error) {
    return [];
  }
  return result.data;
}

async function loadGrammarTypingForUnit(unitId) {
  var result = await supabaseClient
    .from("game_grammar_typing")
    .select("*")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true });
  if (result.error) {
    return [];
  }
  return result.data;
}
