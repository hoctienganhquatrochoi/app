async function loadVietLiteracyForUnit(unitId, tier) {
  var result = await supabaseClient
    .from("game_viet_literacy")
    .select("*")
    .eq("unit_id", unitId)
    .eq("tier", tier)
    .order("sort_order", { ascending: true });

  if (result.error) {
    return [];
  }

  return result.data.map(function (row) {
    return {
      id: row.id,
      emoji: null,
      imageUrl: null,
      en: row.text_vi,
      phonetic: null,
      vi: null,
      audioEnUrl: row.audio_vi_url,
      audioViUrl: null,
      speechText: row.audio_override_text || row.text_vi,
      lang: "vi"
    };
  });
}
