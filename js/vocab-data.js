async function loadVocabForUnit(unitId) {
  var result = await supabaseClient
    .from("game_vocab")
    .select("*")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true });

  if (result.error) {
    return [];
  }

  return result.data.map(function (row) {
    return {
      id: row.id,
      emoji: row.emoji,
      imageUrl: row.image_url,
      en: row.word_en,
      phonetic: row.phonetic,
      vi: row.meaning_vi,
      audioEnUrl: row.audio_en_url,
      audioViUrl: row.audio_vi_url
    };
  });
}

async function loadSentencesForUnit(unitId) {
  var result = await supabaseClient
    .from("game_sentences")
    .select("*")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true });

  if (result.error) {
    return [];
  }

  return result.data.map(function (row) {
    return {
      id: row.id,
      emoji: null,
      imageUrl: null,
      en: row.sentence_en,
      phonetic: row.phonetic,
      vi: row.meaning_vi,
      audioEnUrl: row.audio_en_url,
      audioViUrl: null
    };
  });
}
