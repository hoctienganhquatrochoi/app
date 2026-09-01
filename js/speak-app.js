var currentSentenceVietnamese = "";
var currentSentenceEnglish = "";
var currentInterestTags = [];
var currentSavedSentenceId = null;
var currentSentenceAudioEnUrl = null;
var sentenceSayFailCount = 0;
var currentWordCardData = null;
var currentWordCardSentence = "";
var currentWordCardAudioUrl = null;
var wordCardSayFailCount = 0;
var speakDebounceTimer = null;
var wordCardAnalysisCache = {};

var SAY_AGAIN_FAIL_LIMIT = 3;

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
  document.getElementById("speakHeading").textContent = name + " ơi, bạn muốn nói gì bằng tiếng Anh?";

  refreshSentencesList();
  refreshWordsList();
  refreshDailyProgress();
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

async function hashTextForPath(text) {
  var enc = new TextEncoder().encode(text);
  var digest = await crypto.subtle.digest("SHA-1", enc);
  var bytes = new Uint8Array(digest);
  var hex = "";
  var i;
  for (i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

// Câu/từ do học sinh tự tạo là duy nhất, không dùng lại được cache theo unit như game_vocab thường —
// path đặt theo hash nội dung để cùng 1 câu/từ (kể cả của học sinh khác) không tạo âm thanh lại nhiều lần.
async function generateSpeakAudio(text, lang) {
  if (!text) {
    return null;
  }
  var path;
  try {
    path = "speak/" + (await hashTextForPath(lang + "|" + text)) + ".mp3";
    var resp = await fetch(GENERATE_AUDIO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ text: text, lang: lang, path: path })
    });
    var data = await resp.json().catch(function () { return null; });
    if (!resp.ok || !data || !data.url) {
      return null;
    }
    return data.url;
  } catch (err) {
    return null;
  }
}

// iOS Safari chỉ cho play() ngay trong lúc xử lý sự kiện bấm (gesture), không cho phép sau 1 await —
// nên bấm 🔊/🐢 chỉ dùng URL đã có sẵn (tạo ngầm từ trước), không await fetch rồi mới play().
function playSpeakUrlNormal(url, fallbackText) {
  if (url) {
    playAudioUrlOrSpeak(url, fallbackText, "en-US");
    return;
  }
  speak(fallbackText, "en-US");
}

function playSpeakUrlSlow(url, fallbackText) {
  if (url) {
    var audio = new Audio(url);
    audio.playbackRate = 0.6;
    audio.play().catch(function () {});
    return;
  }
  speakSlow(fallbackText);
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
  return "🔁 Bạn thử nói lại nhé!";
}

function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

// ---------- Ghi âm + chấm bài nói bằng AI (câu, không dùng cho từ vựng) ----------

function getSupportedAudioMimeType() {
  var candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac", "audio/ogg"];
  var i;
  for (i = 0; i < candidates.length; i++) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(candidates[i])) {
      return candidates[i];
    }
  }
  return "";
}

function blobToBase64(blob) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onloadend = function () {
      resolve(reader.result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function gradeSpeakingAudio(targetText, kind, audioBlob, mimeType) {
  var audioBase64 = await blobToBase64(audioBlob);
  var resp;
  try {
    resp = await fetch(SPEAK_GRADE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ targetText: targetText, kind: kind, audioBase64: audioBase64, mimeType: mimeType })
    });
  } catch (err) {
    return null;
  }
  var data = await resp.json().catch(function () { return null; });
  if (!resp.ok || !data || data.error) {
    return null;
  }
  return data;
}

function appendGradeLine(resultEl, className, text) {
  var line = document.createElement("div");
  line.className = className;
  line.textContent = text;
  resultEl.appendChild(line);
  return line;
}

function renderGradeFeedback(resultEl, graded) {
  resultEl.innerHTML = "";
  appendGradeLine(resultEl, "speak-grade-score", "📊 " + (typeof graded.score === "number" ? graded.score.toFixed(1) : "?") + "/10");
  if (graded.pronunciation_feedback) {
    appendGradeLine(resultEl, "speak-grade-line", "🗣️ " + graded.pronunciation_feedback);
  }
  if (graded.fluency_feedback) {
    appendGradeLine(resultEl, "speak-grade-line", "🌊 " + graded.fluency_feedback);
  }
  if (graded.praise) {
    appendGradeLine(resultEl, "speak-grade-line", "🌟 " + graded.praise);
  }
}

// Gắn ghi âm + chấm điểm AI vào 1 nút bấm cụ thể — dùng chung cho nút "Bạn nói lại" ở tab Nói
// và cho từng câu trong "Câu cần học". options: { idleLabel, getTargetText, startedEvent, completedEvent, onGraded }
function createRecordGradeController(btn, resultEl, kind, options) {
  var recorder = null;
  var chunks = [];
  var idleLabel = options.idleLabel;

  btn.addEventListener("click", function () {
    if (recorder && recorder.state === "recording") {
      recorder.stop();
      return;
    }
    startRecording();
  });

  async function startRecording() {
    var targetText = options.getTargetText();
    if (!targetText) {
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      resultEl.textContent = "Trình duyệt này chưa hỗ trợ ghi âm.";
      return;
    }

    var mimeType = getSupportedAudioMimeType();
    var stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      resultEl.textContent = "Cần cho phép dùng micro để luyện nói nhé.";
      return;
    }

    chunks = [];
    recorder = mimeType ? new MediaRecorder(stream, { mimeType: mimeType }) : new MediaRecorder(stream);
    var usedMimeType = recorder.mimeType || mimeType || "audio/webm";

    recorder.ondataavailable = function (e) {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    recorder.onstop = function () {
      stream.getTracks().forEach(function (t) { t.stop(); });
      btn.textContent = idleLabel;
      btn.classList.remove("recording");
      var blob = new Blob(chunks, { type: usedMimeType });
      handleDone(blob, usedMimeType, targetText);
    };

    recorder.start();
    btn.textContent = "⏹";
    btn.classList.add("recording");
    resultEl.innerHTML = "";
    resultEl.textContent = "Đang ghi âm... bấm lại để dừng.";
  }

  async function handleDone(blob, mimeType, targetText) {
    resultEl.textContent = "Đang chấm...";
    logSpeakEvent(options.startedEvent, { target: targetText });

    var graded = await gradeSpeakingAudio(targetText, kind, blob, mimeType);
    if (!graded) {
      resultEl.textContent = "Chưa chấm được, thử lại nhé.";
      return;
    }

    logSpeakEvent(options.completedEvent, { target: targetText, verdict: graded.verdict, score: graded.score });
    options.onGraded(graded, targetText);
  }
}

// Đếm số câu KHÁC NHAU đã nói đạt (verdict "pass") hôm nay, dựa vào log game_speak_events —
// không cần thêm bảng/cột riêng cho quota "10 câu/ngày".
async function checkAndCountDailySentence(englishText) {
  var todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  var fromIso = todayStart.toISOString();

  var result = await supabaseClient
    .from("game_speak_events")
    .select("detail")
    .eq("student_id", currentStudent.id)
    .eq("event_type", "speaking_completed")
    .gte("created_at", fromIso);

  var counts = {};
  (result.data || []).forEach(function (row) {
    var d = row.detail || {};
    if (d.verdict === "pass" && d.target) {
      var key = normalizeForCompare(d.target);
      counts[key] = (counts[key] || 0) + 1;
    }
  });

  var normalized = normalizeForCompare(englishText);
  return {
    distinctCount: Object.keys(counts).length,
    thisSentenceCount: counts[normalized] || 0
  };
}

async function refreshDailyProgress(knownDistinctCount) {
  var el = document.getElementById("speakDailyProgress");
  if (!el || !currentStudent) {
    return;
  }
  if (typeof knownDistinctCount === "number") {
    el.textContent = "🎯 Hôm nay: " + knownDistinctCount + "/10 câu tiếng Anh";
    return;
  }
  var info = await checkAndCountDailySentence("");
  el.textContent = "🎯 Hôm nay: " + info.distinctCount + "/10 câu tiếng Anh";
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
    playSpeakUrlNormal(currentSentenceAudioEnUrl, currentSentenceEnglish);
  });
  document.getElementById("speakListenSlow").addEventListener("click", function () {
    playSpeakUrlSlow(currentSentenceAudioEnUrl, currentSentenceEnglish);
  });
  createRecordGradeController(
    document.getElementById("speakSayAgainBtn"),
    document.getElementById("speakSayAgainResult"),
    "sentence",
    {
      idleLabel: "🎤 Bạn nói lại",
      getTargetText: function () { return currentSentenceEnglish; },
      startedEvent: "speaking_started",
      completedEvent: "speaking_completed",
      onGraded: handleMainSentenceGraded
    }
  );
  document.getElementById("speakSaveSentenceBtn").addEventListener("click", saveSentence);
}

async function handleMainSentenceGraded(graded, targetText) {
  var resultEl = document.getElementById("speakSayAgainResult");
  renderGradeFeedback(resultEl, graded);

  if (graded.verdict === "pass") {
    sentenceSayFailCount = 0;
    var dailyInfo = await checkAndCountDailySentence(targetText);
    if (dailyInfo.thisSentenceCount > 1) {
      appendGradeLine(resultEl, "speak-grade-progress", "🔁 Bạn hãy học câu mới vì câu \"" + targetText + "\" bạn nói tốt rồi!");
    } else {
      appendGradeLine(resultEl, "speak-grade-progress", "🎯 Hôm nay: " + dailyInfo.distinctCount + "/10 câu");
    }
    refreshDailyProgress(dailyInfo.distinctCount);
    return;
  }

  sentenceSayFailCount++;
  if (sentenceSayFailCount > SAY_AGAIN_FAIL_LIMIT && currentStudent) {
    appendGradeLine(resultEl, "speak-grade-line", "— Câu này bạn cần luyện thêm, mình tự lưu vào ❤️ Câu cần học để ôn lại nhé!");
    saveSentence();
  }
}

function startViMic() {
  var Recognition = getSpeechRecognitionCtor();
  var input = document.getElementById("speakInput");
  var statusEl = document.getElementById("speakStatus");

  if (!Recognition) {
    statusEl.textContent = "Trình duyệt này chưa hỗ trợ nhận diện giọng nói, bạn gõ chữ nhé.";
    return;
  }

  var recognizer = new Recognition();
  recognizer.lang = "vi-VN";
  recognizer.maxAlternatives = 1;
  statusEl.textContent = "Đang nghe bạn nói...";
  logSpeakEvent("voice_input_started", {});

  recognizer.onresult = function (e) {
    var transcript = e.results[0][0].transcript;
    input.value = transcript;
    statusEl.textContent = "";
    logSpeakEvent("voice_input_completed", { transcript: transcript });
    runTranslate(transcript);
  };
  recognizer.onerror = function () {
    statusEl.textContent = "Không nghe rõ, bạn thử lại nhé.";
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
    statusEl.textContent = "Câu này không phù hợp để luyện tiếng Anh. Bạn hãy thử một câu khác nhé. 😊";
    logSpeakEvent("content_blocked", { text: text });
    return;
  }
  if (data.status === "unclear") {
    statusEl.textContent = "Mình chưa hiểu câu này. Bạn hãy nói hoặc viết lại rõ hơn nhé. 😊";
    return;
  }

  statusEl.textContent = "";
  currentSentenceVietnamese = text;
  currentSentenceEnglish = data.english;
  currentInterestTags = data.interest_tags || [];
  currentSavedSentenceId = null;
  currentSentenceAudioEnUrl = null;
  sentenceSayFailCount = 0;

  document.getElementById("speakViText").textContent = text;
  renderEnglishSentenceTokens(data.english);
  document.getElementById("speakSayAgainResult").textContent = "";

  var saveBtn = document.getElementById("speakSaveSentenceBtn");
  saveBtn.textContent = "❤️ Lưu câu";
  saveBtn.disabled = false;

  resultEl.style.display = "block";

  var inputEl = document.getElementById("speakInput");
  inputEl.value = "";

  generateSpeakAudio(data.english, "en").then(function (url) {
    if (currentSentenceEnglish === data.english) {
      currentSentenceAudioEnUrl = url;
    }
  });

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
    interest_tags: currentInterestTags,
    audio_en_url: currentSentenceAudioEnUrl
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
      playSpeakUrlNormal(currentWordCardAudioUrl, currentWordCardData.lemma);
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
      var verdict = compareSpokenText(spoken, currentWordCardData.lemma);
      resultEl.textContent = verdict;

      if (verdict.indexOf("✅") === 0) {
        wordCardSayFailCount = 0;
        return;
      }
      wordCardSayFailCount++;
      if (wordCardSayFailCount > SAY_AGAIN_FAIL_LIMIT && currentStudent) {
        resultEl.textContent += " — Từ này bạn cần luyện thêm, mình tự thêm vào ⭐ Từ vựng để ôn lại nhé!";
        saveWordToVocab();
      }
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
  currentWordCardAudioUrl = null;
  wordCardSayFailCount = 0;

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
    return;
  }

  generateSpeakAudio(data.lemma, "en").then(function (url) {
    if (currentWordCardData === data) {
      currentWordCardAudioUrl = url;
    }
  });
}

// Trả về "saved" / "duplicate" / "error" — dùng chung cho nút bấm thủ công và cho auto-save khi nói sai quá nhiều lần.
async function saveWordToVocab() {
  if (!currentStudent || !currentWordCardData) {
    return "error";
  }
  var lemma = currentWordCardData.lemma;

  var existing = await supabaseClient
    .from("game_vocab")
    .select("id")
    .eq("owner_student_id", currentStudent.id)
    .eq("lemma", lemma)
    .maybeSingle();

  if (existing.data) {
    return "duplicate";
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
    example_sentence_vi: currentSentenceVietnamese,
    audio_en_url: currentWordCardAudioUrl
  });

  if (insertResult.error) {
    return "error";
  }

  logSpeakEvent("vocabulary_saved", { lemma: lemma });
  refreshWordsList();
  return "saved";
}

async function saveWord() {
  var statusEl = document.getElementById("wordCardStatus");
  var outcome = await saveWordToVocab();

  if (outcome === "duplicate") {
    statusEl.textContent = "Từ này đã có trong Từ vựng rồi!";
    return;
  }
  if (outcome === "error") {
    statusEl.textContent = "Lưu chưa được, thử lại nhé.";
    return;
  }

  document.getElementById("wordCardOverlay").style.display = "none";
  switchSpeakView("words");
}

// ---------- Câu cần học / Từ vựng ----------

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
    listEl.innerHTML = "<div class=\"speak-list-empty\">Bạn chưa lưu câu nào cả. Sang tab 💬 Nói để bắt đầu nhé!</div>";
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
      playSpeakUrlNormal(row.audio_en_url, row.english);
      supabaseClient.from("game_own_sentences")
        .update({ listen_count: (row.listen_count || 0) + 1 })
        .eq("id", row.id).then(function () {});
      if (!row.audio_en_url) {
        generateSpeakAudio(row.english, "en").then(function (url) {
          if (url) {
            row.audio_en_url = url;
            supabaseClient.from("game_own_sentences").update({ audio_en_url: url }).eq("id", row.id).then(function () {});
          }
        });
      }
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

    var micBtn = document.createElement("button");
    micBtn.type = "button";
    micBtn.className = "speak-icon-btn";
    micBtn.textContent = "🎤";
    micBtn.title = "Luyện nói câu này";
    actions.appendChild(micBtn);

    card.appendChild(actions);

    var gradeResultEl = document.createElement("div");
    gradeResultEl.className = "speak-say-again-result speak-list-grade-result";
    card.appendChild(gradeResultEl);

    createRecordGradeController(micBtn, gradeResultEl, "sentence", {
      idleLabel: "🎤",
      getTargetText: function () { return row.english; },
      startedEvent: "sentence_review_started",
      completedEvent: "sentence_review_completed",
      onGraded: function (graded) {
        renderGradeFeedback(gradeResultEl, graded);
        updateSentenceReviewStats(row, graded.verdict === "pass");
      }
    });

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
    listEl.innerHTML = "<div class=\"speak-list-empty\">Bạn chưa học từ nào cả. Bấm vào từ trong câu tiếng Anh ở tab 💬 Nói để học nhé!</div>";
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
      playSpeakUrlNormal(row.audio_en_url, row.word_en);
      if (!row.audio_en_url) {
        generateSpeakAudio(row.word_en, "en").then(function (url) {
          if (url) {
            row.audio_en_url = url;
            supabaseClient.from("game_vocab").update({ audio_en_url: url }).eq("id", row.id).then(function () {});
          }
        });
      }
    });
    actions.appendChild(listenBtn);

    var removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "speak-icon-btn";
    removeBtn.title = "Xóa từ này";
    removeBtn.textContent = "🗑";
    removeBtn.addEventListener("click", function () {
      if (!window.confirm("Xóa từ \"" + row.word_en + "\" khỏi Từ vựng?")) {
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
  var views = ["speak", "sentences", "words"];
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
}

// ---------- Từ vựng: các dạng ôn tập ----------

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
      audioEnUrl: row.audio_en_url,
      audioViUrl: null
    };
  });
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

function runWordReviewActivity(minItems, drawFn) {
  loadPersonalVocabItems().then(function (items) {
    var area = document.getElementById("reviewPlayArea");
    if (items.length < minItems) {
      area.innerHTML = minItems > 1
        ? "<div class=\"speak-list-empty\">Bạn cần học ít nhất " + minItems + " từ để chơi cái này nhé.</div>"
        : "<div class=\"speak-list-empty\">Bạn chưa có từ nào để ôn cả.</div>";
      return;
    }
    var breadcrumb = "Từ vựng của " + currentStudent.full_name;
    var unitId = speakUnitId(currentStudent.id);
    drawFn(area, breadcrumb, items, unitId);
  });
}

function wireVocabActivityButtons() {
  document.getElementById("reviewWordsFlashcardBtn").addEventListener("click", function () {
    runWordReviewActivity(1, function (area, breadcrumb, items, unitId) {
      renderFlashcard(area, breadcrumb, items, unitId);
    });
  });

  document.getElementById("reviewWordsFlipCardBtn").addEventListener("click", function () {
    runWordReviewActivity(1, function (area, breadcrumb, items, unitId) {
      renderFlipCard(area, breadcrumb, items, unitId);
    });
  });

  document.getElementById("reviewWordsEnToViBtn").addEventListener("click", function () {
    runWordReviewActivity(4, function (area, breadcrumb, items, unitId) {
      renderQuiz(area, breadcrumb, items, unitId, 10, "word-to-meaning", true);
    });
  });

  document.getElementById("reviewWordsViToEnBtn").addEventListener("click", function () {
    runWordReviewActivity(4, function (area, breadcrumb, items, unitId) {
      renderQuiz(area, breadcrumb, items, unitId, 10, "text-to-word", true);
    });
  });

  document.getElementById("reviewWordsTypingHintBtn").addEventListener("click", function () {
    runWordReviewActivity(1, function (area, breadcrumb, items, unitId) {
      renderTyping(area, breadcrumb, items, unitId, 10, "hint");
    });
  });

  document.getElementById("reviewWordsTypingBlankBtn").addEventListener("click", function () {
    runWordReviewActivity(1, function (area, breadcrumb, items, unitId) {
      renderTyping(area, breadcrumb, items, unitId, 10, "blank");
    });
  });

  document.getElementById("reviewWordsListenTypeBtn").addEventListener("click", function () {
    runWordReviewActivity(1, function (area, breadcrumb, items, unitId) {
      renderFreeTyping(area, breadcrumb, items, unitId, 10, "audio");
    });
  });

}

document.addEventListener("DOMContentLoaded", function () {
  updateSpeakAuthUI();
  wireSpeakNav();
  wireSpeakInput();
  wireWordCard();
  wireVocabActivityButtons();
});
