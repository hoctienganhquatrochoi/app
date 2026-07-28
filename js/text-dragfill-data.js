async function loadTextDragfillForUnit(unitId, setName) {
  var query = supabaseClient.from("game_text_dragfill").select("*").eq("unit_id", unitId);
  if (setName) {
    query = query.eq("set_name", setName);
  }
  var result = await query.order("sort_order", { ascending: true });
  if (result.error) {
    return [];
  }
  return result.data;
}
