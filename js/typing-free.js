function normalizeFreeTypingAnswer(str) {
  return (str || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function renderFreeTyping(container, items, unitId, maxQuestions, mode) {
  var pool = pickQuestionPool(items, maxQuestions);
  var qIndex = 0;
  var score = 0;
  var answersLog = [];
  var startedAt = new Date();
  var activityType = mode === "hint" ? "free-typing-hint" : "free-typing-blank";
  var answered = false;
  var lastCorrect = false;
  var lastAnswerValue = "";
  var timerIntervalId = startActivityTimer(startedAt);
  var currentWrap = null;

  function handleGlobalKeydown(e) {
    if (!currentWrap || !currentWrap.isConnected) {
      document.removeEventListener("keydown", handleGlobalKeydown);
      return;
    }
    if (e.key !== "Enter") {
      return;
    }
    if (answered) {
      goNext();
    } else {
      var inputEl = container.querySelector(".ft-input");
      checkAnswer(inputEl ? inputEl.value : "");
    }
  }
  document.addEventListener("keydown", handleGlobalKeydown);

  function showQuestion() {
    answered = false;
    draw();
    var item = pool[qIndex];
    playAudioUrlOrSpeak(item.audioEnUrl, item.en, "en-US");
  }

  function draw() {
    container.innerHTML = "";
    var item = pool[qIndex];

    var wrap = document.createElement("div");
    wrap.className = "ty-wrap";

    wrap.appendChild(buildActivityHeader(startedAt, score));

    var audioBtn = document.createElement("button");
    audioBtn.className = "audio-btn";
    audioBtn.type = "button";
    audioBtn.textContent = "▶";
    audioBtn.addEventListener("click", function () {
      playAudioUrlOrSpeak(item.audioEnUrl, item.en, "en-US");
    });
    wrap.appendChild(audioBtn);

    var hasVisual = !!(item.imageUrl || item.emoji);
    if (hasVisual) {
      wrap.appendChild(buildVisualElement(item, "ty-emoji"));
    }

    var line = document.createElement("div");
    line.className = "ty-meaning" + (hasVisual ? "" : " no-visual");
    line.textContent = mode === "hint" ? (item.en + " " + (item.phonetic || "") + " - " + capitalizeFirst(item.vi)) : capitalizeFirst(item.vi);
    wrap.appendChild(line);

    var input = document.createElement("input");
    input.type = "text";
    input.className = "ft-input";
    input.autocapitalize = "off";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.placeholder = "Gõ câu trả lời...";
    input.disabled = answered;
    wrap.appendChild(input);

    if (!answered) {
      var submitBtn = document.createElement("button");
      submitBtn.className = "quiz-continue-btn";
      submitBtn.type = "button";
      submitBtn.textContent = "Nộp bài";
      submitBtn.addEventListener("click", function () {
        checkAnswer(input.value);
      });
      wrap.appendChild(submitBtn);
    } else {
      input.value = lastAnswerValue;

      var feedback = document.createElement("div");
      feedback.className = "ft-feedback " + (lastCorrect ? "ft-correct" : "ft-wrong");
      feedback.textContent = lastCorrect ? "✓ Chính xác!" : ("✗ Đáp án đúng: " + stripParentheticalForSpeech(item.en));
      wrap.appendChild(feedback);

      var nextBtn = document.createElement("button");
      nextBtn.className = "quiz-continue-btn";
      nextBtn.type = "button";
      nextBtn.textContent = qIndex < pool.length - 1 ? "Câu tiếp theo" : "Xem kết quả";
      nextBtn.addEventListener("click", goNext);
      wrap.appendChild(nextBtn);
    }

    wrap.appendChild(buildProgressFooter(qIndex + 1, pool.length));
    container.appendChild(wrap);
    currentWrap = wrap;
    if (!answered) {
      input.focus();
    }
  }

  function checkAnswer(value) {
    if (answered) {
      return;
    }
    var item = pool[qIndex];
    var isCorrect = normalizeFreeTypingAnswer(value) === normalizeFreeTypingAnswer(stripParentheticalForSpeech(item.en));
    lastCorrect = isCorrect;
    lastAnswerValue = value;
    answered = true;
    if (isCorrect) {
      score++;
    }
    answersLog.push({
      vocab_id: item.id,
      word_en: item.en,
      selected_label: value,
      is_correct: isCorrect
    });
    draw();
  }

  function goNext() {
    if (qIndex < pool.length - 1) {
      qIndex++;
      showQuestion();
    } else {
      showResult();
    }
  }

  function showResult() {
    clearInterval(timerIntervalId);
    document.removeEventListener("keydown", handleGlobalKeydown);
    submitQuizAttempt(unitId, activityType, score, pool.length, startedAt, answersLog);

    container.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "quiz-wrap quiz-result";

    var title = document.createElement("h2");
    title.textContent = "Kết quả";
    wrap.appendChild(title);
    wrap.appendChild(buildResultMeta());

    var scoreBig = document.createElement("div");
    scoreBig.className = "score-big";
    scoreBig.textContent = score + " / " + pool.length;
    wrap.appendChild(scoreBig);

    var p = document.createElement("p");
    p.textContent = "Bé đã gõ đúng " + score + " / " + pool.length + " từ!";
    wrap.appendChild(p);

    var retryBtn = document.createElement("button");
    retryBtn.className = "quiz-continue-btn";
    retryBtn.type = "button";
    retryBtn.textContent = "Làm lại";
    retryBtn.addEventListener("click", function () {
      pool = pickQuestionPool(items, maxQuestions);
      qIndex = 0;
      score = 0;
      answersLog = [];
      startedAt = new Date();
      timerIntervalId = startActivityTimer(startedAt);
      document.addEventListener("keydown", handleGlobalKeydown);
      showQuestion();
    });
    wrap.appendChild(retryBtn);

    container.appendChild(wrap);
  }

  showQuestion();
}
