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

async function loadGrammarTypingForUnit(unitId, setName) {
  var query = supabaseClient.from("game_grammar_typing").select("*").eq("unit_id", unitId);
  if (setName) {
    query = query.eq("set_name", setName);
  }
  var result = await query.order("sort_order", { ascending: true });
  if (result.error) {
    return [];
  }
  return result.data;
}

async function loadGrammarMatchingForUnit(unitId) {
  var result = await supabaseClient
    .from("game_grammar_matching")
    .select("*")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true });
  if (result.error) {
    return [];
  }
  return result.data;
}

async function loadGrammarDragfillForUnit(unitId) {
  var result = await supabaseClient
    .from("game_grammar_dragfill")
    .select("*")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true });
  if (result.error) {
    return [];
  }
  return result.data;
}
