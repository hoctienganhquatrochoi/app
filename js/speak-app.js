var currentSentenceVietnamese = "";
var currentSentenceEnglish = "";
var currentInterestTags = [];
var currentSavedSentenceId = null;
var currentWordCardData = null;
var currentWordCardSentence = "";
var speakDebounceTimer = null;
var wordCardAnalysisCache = {};

function speakUnitId(studentId) {
  return "stu_" + studentId;
}

// Reused as the "student login state changed" hook: auth.js calls renderSidebar()
// after every login/logout, but this page has no curriculum sidebar to draw.
function renderSidebar() {
  updateSpeakAuthUI();
}

function updateSpeakAuthUI() {
  var hasStudent = !!currentStudent;
  document.getElementById("speakLoginHint").style.display = hasStudent ? "none" : "block";
  document.getElementById("speakViews").style.display = hasStudent ? "block" : "none";
  document.getElementById("speakBottomNav").style.display = hasStudent ? "flex" : "none";

  if (!hasStudent) {
    return;
  }

  var name = currentStudent.full_name;
  document.getElementById("speakHeading").textContent = name + " ơi, con muốn nói gì bằng tiếng Anh?";
  document.getElementById("sentencesHeading").textContent = "Câu của " + name;
  document.getElementById("wordsHeading").textContent = "Từ của " + name;
  document.getElementById("reviewHeading").textContent = "Ôn của " + name;

  refreshSentencesList();
  refreshWordsList();
}

function speakSlow(text) {
  if (!("speechSynthesis" in window) || !text) {
    return;
  }
  window.speechSynthesis.cancel();
  var utter = new SpeechSynthesisUtterance(stripParentheticalForSpeech(text));
  utter.lang = "en-US";
  utter.rate = 0.6;
  window.speechSynthesis.speak(utter);
}

function logSpeakEvent(eventType, detail) {
  if (!currentStudent) {
    return;
  }
  supabaseClient.from("game_speak_events").insert({
    student_id: currentStudent.id,
    event_type: eventType,
    detail: detail || {}
  });
}

function normalizeForCompare(text) {
  return (text || "").toLowerCase().replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim();
}

function compareSpokenText(spoken, target) {
  if (normalizeForCompare(spoken) === normalizeForCompare(target)) {
    return "✅ Đúng rồi, giỏi quá!";
  }
  var a = normalizeForCompare(spoken).split(" ");
  var b = normalizeForCompare(target).split(" ");
  var bCopy = b.slice();
  var matchCount = 0;
  a.forEach(function (word) {
    var idx = bCopy.indexOf(word);
    if (idx !== -1) {
      matchCount++;
      bCopy.splice(idx, 1);
    }
  });
  var ratio = b.length ? matchCount / b.length : 0;
  if (ratio >= 0.6) {
    return "🟡 Gần đúng rồi, thử lại cho chuẩn hơn nhé!";
  }
  return "🔁 Con thử nói lại nhé!";
}

function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

// ---------- Khu vực "Nói" ----------

function wireSpeakInput() {
  var input = document.getElementById("speakInput");

  input.addEventListener("input", function () {
    clearTimeout(speakDebounceTimer);
    var text = input.value.trim();
    if (text.length < 2) {
      return;
    }
    speakDebounceTimer = setTimeout(function () {
      runTranslate(text);
    }, 900);
  });

  document.getElementById("speakMicVi").addEventListener("click", startViMic);
  document.getElementById("speakListenNormal").addEventListener("click", function () {
    speak(currentSentenceEnglish, "en-US");
  });
  document.getElementById("speakListenSlow").addEventListener("click", function () {
    speakSlow(currentSentenceEnglish);
  });
  document.getElementById("speakSayAgainBtn").addEventListener("click", startSayAgainMic);
  document.getElementById("speakSaveSentenceBtn").addEventListener("click", saveSentence);
}

function startViMic() {
  var Recognition = getSpeechRecognitionCtor();
  var input = document.getElementById("speakInput");
  var statusEl = document.getElementById("speakStatus");

  if (!Recognition) {
    statusEl.textContent = "Trình duyệt này chưa hỗ trợ nhận diện giọng nói, con gõ chữ nhé.";
    return;
  }

  var recognizer = new Recognition();
  recognizer.lang = "vi-VN";
  recognizer.maxAlternatives = 1;
  statusEl.textContent = "Đang nghe con nói...";
  logSpeakEvent("voice_input_started", {});

  recognizer.onresult = function (e) {
    var transcript = e.results[0][0].transcript;
    input.value = transcript;
    statusEl.textContent = "";
    logSpeakEvent("voice_input_completed", { transcript: transcript });
    runTranslate(transcript);
  };
  recognizer.onerror = function () {
    statusEl.textContent = "Không nghe rõ, con thử lại nhé.";
    logSpeakEvent("voice_input_failed", {});
  };
  recognizer.start();
}

async function runTranslate(text) {
  var statusEl = document.getElementById("speakStatus");
  var resultEl = document.getElementById("speakResult");

  statusEl.textContent = "Đang xử lý...";
  resultEl.style.display = "none";

  var resp;
  try {
    resp = await fetch(SPEAK_TRANSLATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ text: text })
    });
  } catch (err) {
    statusEl.textContent = "Không kết nối được, thử lại nhé.";
    return;
  }

  var data = await resp.json().catch(function () { return null; });
  if (!resp.ok || !data || data.error) {
    statusEl.textContent = "Có lỗi xảy ra, thử lại nhé.";
    return;
  }

  if (data.status === "blocked") {
    statusEl.textContent = "Câu này không phù hợp để luyện tiếng Anh. Con hãy thử một câu khác nhé. 😊";
    logSpeakEvent("content_blocked", { text: text });
    return;
  }
  if (data.status === "unclear") {
    statusEl.textContent = "Mình chưa hiểu câu này. Con hãy nói hoặc viết lại rõ hơn nhé. 😊";
    return;
  }

  statusEl.textContent = "";
  currentSentenceVietnamese = text;
  currentSentenceEnglish = data.english;
  currentInterestTags = data.interest_tags || [];
  currentSavedSentenceId = null;

  document.getElementById("speakViText").textContent = text;
  renderEnglishSentenceTokens(data.english);
  document.getElementById("speakSayAgainResult").textContent = "";

  var saveBtn = document.getElementById("speakSaveSentenceBtn");
  saveBtn.textContent = "❤️ Lưu câu";
  saveBtn.disabled = false;

  resultEl.style.display = "block";

  logSpeakEvent("translation_created", { vietnamese: text, english: data.english });
}

function renderEnglishSentenceTokens(text) {
  var container = document.getElementById("speakEnText");
  container.innerHTML = "";
  var regex = /[A-Za-z']+|[^A-Za-z']+/g;
  var match;
  while ((match = regex.exec(text)) !== null) {
    var piece = match[0];
    if (/[A-Za-z]/.test(piece)) {
      var span = document.createElement("span");
      span.className = "speak-word-token";
      span.textContent = piece;
      span.addEventListener("click", function () {
        openWordCard(this.textContent, text);
      });
      container.appendChild(span);
    } else {
      container.appendChild(document.createTextNode(piece));
    }
  }
}

function startSayAgainMic() {
  var Recognition = getSpeechRecognitionCtor();
  var resultEl = document.getElementById("speakSayAgainResult");

  if (!Recognition) {
    resultEl.textContent = "Trình duyệt này chưa hỗ trợ nhận diện giọng nói.";
    return;
  }
  if (!currentSentenceEnglish) {
    return;
  }

  var recognizer = new Recognition();
  recognizer.lang = "en-US";
  recognizer.maxAlternatives = 1;
  resultEl.textContent = "Đang nghe...";
  logSpeakEvent("speaking_started", { target: currentSentenceEnglish });

  recognizer.onresult = function (e) {
    var spoken = e.results[0][0].transcript;
    resultEl.textContent = compareSpokenText(spoken, currentSentenceEnglish) + " (\"" + spoken + "\")";
    logSpeakEvent("speaking_completed", { target: currentSentenceEnglish, spoken: spoken });
  };
  recognizer.onerror = function () {
    resultEl.textContent = "Không nghe rõ, con thử lại nhé.";
  };
  recognizer.start();
}

async function saveSentence() {
  if (!currentStudent || !currentSentenceEnglish) {
    return;
  }
  var btn = document.getElementById("speakSaveSentenceBtn");
  if (currentSavedSentenceId) {
    return;
  }

  btn.disabled = true;
  var insertResult = await supabaseClient.from("game_own_sentences").insert({
    student_id: currentStudent.id,
    vietnamese: currentSentenceVietnamese,
    english: currentSentenceEnglish,
    is_saved: true,
    interest_tags: currentInterestTags
  }).select().single();

  if (insertResult.error) {
    btn.disabled = false;
    return;
  }

  currentSavedSentenceId = insertResult.data.id;
  btn.textContent = "❤️ Đã lưu";
  logSpeakEvent("sentence_saved", { id: currentSavedSentenceId });
  refreshSentencesList();
}

// ---------- Thẻ từ (bấm 1 từ trong câu) ----------

function wireWordCard() {
  document.getElementById("wordCardListenBtn").addEventListener("click", function () {
    if (currentWordCardData) {
      speak(currentWordCardData.lemma, "en-US");
    }
  });

  document.getElementById("wordCardSayBtn").addEventListener("click", function () {
    if (!currentWordCardData) {
      return;
    }
    var Recognition = getSpeechRecognitionCtor();
    var resultEl = document.getElementById("wordCardSayResult");
    if (!Recognition) {
      resultEl.textContent = "Trình duyệt chưa hỗ trợ.";
      return;
    }
    var recognizer = new Recognition();
    recognizer.lang = "en-US";
    resultEl.textContent = "Đang nghe...";
    recognizer.onresult = function (e) {
      var spoken = e.results[0][0].transcript;
      resultEl.textContent = compareSpokenText(spoken, currentWordCardData.lemma);
    };
    recognizer.onerror = function () {
      resultEl.textContent = "Không nghe rõ, thử lại nhé.";
    };
    recognizer.start();
  });

  document.getElementById("wordCardLearnBtn").addEventListener("click", saveWord);
  document.getElementById("wordCardCloseBtn").addEventListener("click", function () {
    document.getElementById("wordCardOverlay").style.display = "none";
  });
  document.getElementById("wordCardOverlay").addEventListener("click", function (e) {
    if (e.target === this) {
      this.style.display = "none";
    }
  });
}

function openWordCard(surfaceWord, sentence) {
  document.getElementById("wordCardOverlay").style.display = "flex";
  document.getElementById("wordCardLemma").textContent = surfaceWord;
  document.getElementById("wordCardPronunciation").textContent = "";
  document.getElementById("wordCardMeaning").textContent = "Đang tra từ...";
  document.getElementById("wordCardSayResult").textContent = "";
  document.getElementById("wordCardStatus").textContent = "";
  document.getElementById("wordCardLearnBtn").disabled = true;
  currentWordCardData = null;

  logSpeakEvent("vocabulary_opened", { word: surfaceWord });

  analyzeWord(surfaceWord, sentence);
}

async function analyzeWord(surfaceWord, sentence) {
  var cacheKey = surfaceWord.toLowerCase();
  var data = wordCardAnalysisCache[cacheKey];

  if (!data) {
    var resp;
    try {
      resp = await fetch(SPEAK_VOCAB_ANALYZE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ word: surfaceWord, sentence: sentence })
      });
    } catch (err) {
      document.getElementById("wordCardMeaning").textContent = "Không tra được, thử lại nhé.";
      return;
    }
    data = await resp.json().catch(function () { return null; });
    if (!resp.ok || !data || data.error) {
      document.getElementById("wordCardMeaning").textContent = "Không tra được, thử lại nhé.";
      return;
    }
    wordCardAnalysisCache[cacheKey] = data;
  }

  currentWordCardData = data;
  currentWordCardSentence = sentence;
  document.getElementById("wordCardLemma").textContent = data.lemma;
  document.getElementById("wordCardPronunciation").textContent = data.pronunciation || "";
  document.getElementById("wordCardMeaning").textContent = data.meaning_vi;
  document.getElementById("wordCardLearnBtn").disabled = false;

  if (!data.suitable_for_child) {
    document.getElementById("wordCardMeaning").textContent = "Từ này chưa phù hợp để học nhé.";
    document.getElementById("wordCardLearnBtn").disabled = true;
  }
}

async function saveWord() {
  if (!currentStudent || !currentWordCardData) {
    return;
  }
  var statusEl = document.getElementById("wordCardStatus");
  var lemma = currentWordCardData.lemma;

  var existing = await supabaseClient
    .from("game_vocab")
    .select("id")
    .eq("owner_student_id", currentStudent.id)
    .eq("lemma", lemma)
    .maybeSingle();

  if (existing.data) {
    statusEl.textContent = "Từ này đã có trong Từ của con rồi!";
    return;
  }

  var countResult = await supabaseClient
    .from("game_vocab")
    .select("id", { count: "exact", head: true })
    .eq("owner_student_id", currentStudent.id);

  var insertResult = await supabaseClient.from("game_vocab").insert({
    unit_id: speakUnitId(currentStudent.id),
    owner_student_id: currentStudent.id,
    sort_order: (countResult.count || 0) + 1,
    word_en: lemma,
    lemma: lemma,
    phonetic: currentWordCardData.pronunciation || "",
    meaning_vi: currentWordCardData.meaning_vi,
    example_sentence_en: currentWordCardSentence,
    example_sentence_vi: currentSentenceVietnamese
  });

  if (insertResult.error) {
    statusEl.textContent = "Lưu chưa được, thử lại nhé.";
    return;
  }

  statusEl.textContent = "❤️ Đã học từ này!";
  logSpeakEvent("vocabulary_saved", { lemma: lemma });
  refreshWordsList();
}

// ---------- Câu của con / Từ của con ----------

async function refreshSentencesList() {
  if (!currentStudent) {
    return;
  }
  var listEl = document.getElementById("sentencesList");
  listEl.innerHTML = "<div class=\"speak-list-loading\">Đang tải...</div>";

  var result = await supabaseClient
    .from("game_own_sentences")
    .select("*")
    .eq("student_id", currentStudent.id)
    .eq("is_saved", true)
    .order("created_at", { ascending: false });

  listEl.innerHTML = "";
  if (result.error || !result.data || !result.data.length) {
    listEl.innerHTML = "<div class=\"speak-list-empty\">Con chưa lưu câu nào cả. Sang tab 💬 Nói để bắt đầu nhé!</div>";
    return;
  }

  result.data.forEach(function (row) {
    var card = document.createElement("div");
    card.className = "speak-list-card";

    var vi = document.createElement("div");
    vi.className = "speak-list-vi";
    vi.textContent = row.vietnamese;
    card.appendChild(vi);

    var en = document.createElement("div");
    en.className = "speak-list-en";
    en.textContent = row.english;
    card.appendChild(en);

    var actions = document.createElement("div");
    actions.className = "speak-list-actions";

    var listenBtn = document.createElement("button");
    listenBtn.type = "button";
    listenBtn.className = "speak-icon-btn";
    listenBtn.textContent = "🔊";
    listenBtn.addEventListener("click", function () {
      speak(row.english, "en-US");
      supabaseClient.from("game_own_sentences")
        .update({ listen_count: (row.listen_count || 0) + 1 })
        .eq("id", row.id).then(function () {});
    });
    actions.appendChild(listenBtn);

    var removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "speak-icon-btn";
    removeBtn.title = "Bỏ lưu";
    removeBtn.textContent = "🗑";
    removeBtn.addEventListener("click", function () {
      if (!window.confirm("Bỏ lưu câu này?")) {
        return;
      }
      supabaseClient.from("game_own_sentences").delete().eq("id", row.id).then(function () {
        refreshSentencesList();
      });
    });
    actions.appendChild(removeBtn);

    card.appendChild(actions);
    listEl.appendChild(card);
  });
}

async function refreshWordsList() {
  if (!currentStudent) {
    return;
  }
  var listEl = document.getElementById("wordsList");
  listEl.innerHTML = "<div class=\"speak-list-loading\">Đang tải...</div>";

  var result = await supabaseClient
    .from("game_vocab")
    .select("*")
    .eq("owner_student_id", currentStudent.id)
    .order("sort_order", { ascending: true });

  listEl.innerHTML = "";
  if (result.error || !result.data || !result.data.length) {
    listEl.innerHTML = "<div class=\"speak-list-empty\">Con chưa học từ nào cả. Bấm vào từ trong câu tiếng Anh ở tab 💬 Nói để học nhé!</div>";
    return;
  }

  result.data.forEach(function (row) {
    var card = document.createElement("div");
    card.className = "speak-list-card";

    var word = document.createElement("div");
    word.className = "speak-list-word";
    word.textContent = row.word_en + (row.phonetic ? "  " + row.phonetic : "");
    card.appendChild(word);

    var meaning = document.createElement("div");
    meaning.className = "speak-list-en";
    meaning.textContent = row.meaning_vi;
    card.appendChild(meaning);

    if (row.example_sentence_en) {
      var example = document.createElement("div");
      example.className = "speak-list-example";
      example.textContent = row.example_sentence_en;
      card.appendChild(example);
    }

    var actions = document.createElement("div");
    actions.className = "speak-list-actions";

    var listenBtn = document.createElement("button");
    listenBtn.type = "button";
    listenBtn.className = "speak-icon-btn";
    listenBtn.textContent = "🔊";
    listenBtn.addEventListener("click", function () {
      speak(row.word_en, "en-US");
    });
    actions.appendChild(listenBtn);

    var removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "speak-icon-btn";
    removeBtn.title = "Xóa từ này";
    removeBtn.textContent = "🗑";
    removeBtn.addEventListener("click", function () {
      if (!window.confirm("Xóa từ \"" + row.word_en + "\" khỏi Từ của con?")) {
        return;
      }
      supabaseClient.from("game_vocab").delete().eq("id", row.id).then(function () {
        refreshWordsList();
      });
    });
    actions.appendChild(removeBtn);

    card.appendChild(actions);
    listEl.appendChild(card);
  });
}

// ---------- Điều hướng dưới cùng ----------

function wireSpeakNav() {
  var btns = document.querySelectorAll(".speak-nav-btn");
  var i;
  for (i = 0; i < btns.length; i++) {
    btns[i].addEventListener("click", function () {
      switchSpeakView(this.getAttribute("data-view"));
    });
  }
}

function switchSpeakView(view) {
  var views = ["speak", "sentences", "words", "review"];
  views.forEach(function (v) {
    document.getElementById("view-" + v).style.display = v === view ? "block" : "none";
  });

  var btns = document.querySelectorAll(".speak-nav-btn");
  var i;
  for (i = 0; i < btns.length; i++) {
    var isActive = btns[i].getAttribute("data-view") === view;
    btns[i].classList.toggle("active", isActive);
  }

  if (view === "sentences") {
    refreshSentencesList();
  }
  if (view === "words") {
    refreshWordsList();
  }
  if (view === "review") {
    document.getElementById("reviewPlayArea").innerHTML = "";
  }
}

// ---------- Ôn của con ----------

async function loadPersonalVocabItems() {
  var result = await supabaseClient
    .from("game_vocab")
    .select("*")
    .eq("owner_student_id", currentStudent.id)
    .order("sort_order", { ascending: true });
  if (result.error) {
    return [];
  }
  return result.data.map(function (row) {
    return {
      id: row.id,
      emoji: null,
      imageUrl: null,
      en: row.word_en,
      phonetic: row.phonetic,
      vi: row.meaning_vi,
      audioEnUrl: null,
      audioViUrl: null
    };
  });
}

async function loadOwnSentenceItems() {
  var result = await supabaseClient
    .from("game_own_sentences")
    .select("*")
    .eq("student_id", currentStudent.id)
    .eq("is_saved", true)
    .order("created_at", { ascending: false });
  if (result.error) {
    return [];
  }
  return result.data;
}

function updateSentenceReviewStats(row, correct) {
  var updates = { review_count: (row.review_count || 0) + 1 };
  if (correct) {
    updates.correct_count = (row.correct_count || 0) + 1;
  } else {
    updates.incorrect_count = (row.incorrect_count || 0) + 1;
  }
  supabaseClient.from("game_own_sentences").update(updates).eq("id", row.id).then(function () {});
}

function renderOwnSentenceReview(container, items) {
  items = shuffleArray(items.slice());
  var index = 0;

  function draw() {
    container.innerHTML = "";
    var row = items[index];

    var wrap = document.createElement("div");
    wrap.className = "fc-wrap";

    var progress = document.createElement("div");
    progress.className = "fc-progress";
    progress.textContent = "Câu " + (index + 1) + " / " + items.length;
    wrap.appendChild(progress);

    var card = document.createElement("div");
    card.className = "fc-card";

    var vi = document.createElement("div");
    vi.className = "fc-word";
    vi.textContent = row.vietnamese;
    card.appendChild(vi);

    var hint = document.createElement("div");
    hint.className = "fc-hint";
    hint.textContent = "Con nói bằng tiếng Anh nhé!";
    card.appendChild(hint);

    var micBtn = document.createElement("button");
    micBtn.type = "button";
    micBtn.className = "speak-say-again-btn";
    micBtn.textContent = "🎤 Nói";
    card.appendChild(micBtn);

    var resultEl = document.createElement("div");
    resultEl.className = "speak-say-again-result";
    card.appendChild(resultEl);

    var revealEl = document.createElement("div");
    revealEl.className = "speak-review-reveal";
    card.appendChild(revealEl);

    micBtn.addEventListener("click", function () {
      var Recognition = getSpeechRecognitionCtor();
      if (!Recognition) {
        resultEl.textContent = "Trình duyệt chưa hỗ trợ.";
        return;
      }
      var recognizer = new Recognition();
      recognizer.lang = "en-US";
      resultEl.textContent = "Đang nghe...";
      recognizer.onresult = function (e) {
        var spoken = e.results[0][0].transcript;
        var verdict = compareSpokenText(spoken, row.english);
        resultEl.textContent = verdict + " (\"" + spoken + "\")";
        revealEl.textContent = "🇬🇧 " + row.english;
        updateSentenceReviewStats(row, verdict.indexOf("✅") === 0);
      };
      recognizer.onerror = function () {
        resultEl.textContent = "Không nghe rõ, thử lại nhé.";
      };
      recognizer.start();
    });

    wrap.appendChild(card);

    var nav = document.createElement("div");
    nav.className = "fc-nav";
    var nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "btn-next";
    nextBtn.textContent = index < items.length - 1 ? "Câu tiếp →" : "Hoàn thành";
    nextBtn.addEventListener("click", function () {
      if (index < items.length - 1) {
        index++;
        draw();
      } else {
        container.innerHTML = "<div class=\"speak-list-empty\">🎉 Con đã ôn xong " + items.length + " câu!</div>";
      }
    });
    nav.appendChild(nextBtn);
    wrap.appendChild(nav);

    container.appendChild(wrap);
  }

  draw();
}

function wireReviewButtons() {
  document.getElementById("reviewWordsFlashcardBtn").addEventListener("click", function () {
    loadPersonalVocabItems().then(function (items) {
      var area = document.getElementById("reviewPlayArea");
      if (!items.length) {
        area.innerHTML = "<div class=\"speak-list-empty\">Con chưa có từ nào để ôn cả.</div>";
        return;
      }
      renderFlashcard(area, "Từ của " + currentStudent.full_name, items, speakUnitId(currentStudent.id));
    });
  });

  document.getElementById("reviewWordsQuizBtn").addEventListener("click", function () {
    loadPersonalVocabItems().then(function (items) {
      var area = document.getElementById("reviewPlayArea");
      if (items.length < 4) {
        area.innerHTML = "<div class=\"speak-list-empty\">Con cần học ít nhất 4 từ để chơi Đố nghĩa nhé.</div>";
        return;
      }
      renderQuiz(area, "Từ của " + currentStudent.full_name, items, speakUnitId(currentStudent.id), 10, "word-to-meaning", true);
    });
  });

  document.getElementById("reviewSentencesBtn").addEventListener("click", function () {
    loadOwnSentenceItems().then(function (items) {
      var area = document.getElementById("reviewPlayArea");
      if (!items.length) {
        area.innerHTML = "<div class=\"speak-list-empty\">Con chưa lưu câu nào để ôn cả.</div>";
        return;
      }
      renderOwnSentenceReview(area, items);
    });
  });
}

document.addEventListener("DOMContentLoaded", function () {
  updateSpeakAuthUI();
  wireSpeakNav();
  wireSpeakInput();
  wireWordCard();
  wireReviewButtons();
});
