var QUIZ_FORMAT_CONFIG = {
  "word-to-image": { showWord: true, showPhonetic: true, showImage: false, showMeaning: false, answerType: "image" },
  "image-to-word": { showWord: true, showPhonetic: true, showImage: true, showMeaning: true, answerType: "word" },
  "text-to-word": { showWord: false, showPhonetic: true, showImage: false, showMeaning: true, answerType: "word" },
  "image-only-to-word": { showWord: false, showPhonetic: false, showImage: true, showMeaning: false, answerType: "word" },
  "word-to-meaning": { showWord: true, showPhonetic: true, showImage: false, showMeaning: false, answerType: "meaning" }
};

var QUIZ_FORMAT_KEYS = Object.keys(QUIZ_FORMAT_CONFIG);

function buildQuizQuestion(item, pool, fixedFormat) {
  var format = fixedFormat || QUIZ_FORMAT_KEYS[Math.floor(Math.random() * QUIZ_FORMAT_KEYS.length)];
  var distractors = pickRandomDistractors(pool, item, 3);
  var options = shuffleArray([item].concat(distractors));
  return { item: item, format: format, options: options };
}

function buildQuizQuestions(items, maxQuestions, fixedFormat) {
  var pool = pickQuestionPool(items, maxQuestions);
  var questions = [];
  var i;
  for (i = 0; i < pool.length; i++) {
    questions.push(buildQuizQuestion(pool[i], items, fixedFormat));
  }
  return questions;
}

var QUIZ_ADVANCE_DELAY_MS = 1200;

function renderQuiz(container, breadcrumbText, items, unitId, maxQuestions, format) {
  var questions = buildQuizQuestions(items, maxQuestions, format);
  var qIndex = 0;
  var score = 0;
  var answered = false;
  var selectedWrongId = null;
  var answersLog = [];
  var startedAt = new Date();
  var timerIntervalId = startActivityTimer(startedAt);
  var tabTracker = startTabSwitchTracker();

  function showQuestion() {
    draw();
    var q = questions[qIndex];
    playAudioUrlOrSpeak(q.item.audioEnUrl, q.item.en, "en-US");
  }

  function draw() {
    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "quiz-wrap";

    wrap.appendChild(buildActivityHeader(startedAt, score));

    var q = questions[qIndex];
    var config = QUIZ_FORMAT_CONFIG[q.format];

    var body = document.createElement("div");
    body.className = "quiz-body";

    body.appendChild(buildPrompt(q, config));

    var optionsEl = document.createElement("div");
    optionsEl.className = "quiz-options" + (config.answerType === "image" ? " quiz-options-image" : "");

    var i;
    for (i = 0; i < q.options.length; i++) {
      optionsEl.appendChild(buildOption(q, config, q.options[i]));
    }
    body.appendChild(optionsEl);

    wrap.appendChild(body);
    wrap.appendChild(buildProgressFooter(qIndex + 1, questions.length));
    container.appendChild(wrap);
  }

  function buildPrompt(q, config) {
    var prompt = document.createElement("div");
    prompt.className = "quiz-prompt";

    var audioBtn = document.createElement("button");
    audioBtn.className = "audio-btn quiz-prompt-audio";
    audioBtn.type = "button";
    audioBtn.textContent = "▶";
    audioBtn.addEventListener("click", function () {
      playAudioUrlOrSpeak(q.item.audioEnUrl, q.item.en, "en-US");
    });
    prompt.appendChild(audioBtn);

    var hasVisual = config.showImage && !!(q.item.imageUrl || q.item.emoji);
    if (hasVisual) {
      prompt.appendChild(buildVisualElement(q.item, "quiz-emoji"));
    }

    var parts = [];
    if (config.showWord) {
      parts.push(q.item.en);
    }
    if (config.showPhonetic && q.item.phonetic) {
      parts.push(q.item.phonetic);
    }
    var line = parts.join(" ");
    if (config.showMeaning) {
      line = line ? line + " - " + capitalizeFirst(q.item.vi) : capitalizeFirst(q.item.vi);
    }

    if (line) {
      var lineEl = document.createElement("div");
      lineEl.className = "quiz-question-word" + (hasVisual ? "" : " no-visual");
      lineEl.textContent = line;
      prompt.appendChild(lineEl);
    }

    return prompt;
  }

  function buildOption(q, config, option) {
    var btn = document.createElement("button");
    btn.className = "quiz-option" + (config.answerType === "image" ? " quiz-option-image" : "");
    btn.type = "button";

    if (config.answerType === "image") {
      btn.appendChild(buildVisualElement(option, "quiz-option-visual"));
    } else {
      var label = document.createElement("span");
      label.textContent = config.answerType === "meaning" ? capitalizeFirst(option.vi) : option.en;
      btn.appendChild(label);
    }

    if (answered) {
      btn.disabled = true;
      btn.className += " disabled";
      if (option.id === q.item.id) {
        btn.className += " correct";
        btn.appendChild(buildResultIcon(true));
      } else if (option.id === selectedWrongId) {
        btn.className += " wrong";
        btn.appendChild(buildResultIcon(false));
      }
    }

    btn.addEventListener("click", function () {
      if (answered) {
        return;
      }
      answered = true;
      var isCorrect = option.id === q.item.id;
      if (isCorrect) {
        score++;
      } else {
        selectedWrongId = option.id;
      }
      answersLog.push({
        vocab_id: q.item.id,
        word_en: q.item.en,
        selected_label: option.en,
        is_correct: isCorrect
      });
      draw();

      setTimeout(function () {
        if (qIndex < questions.length - 1) {
          qIndex++;
          answered = false;
          selectedWrongId = null;
          showQuestion();
        } else {
          showResult();
        }
      }, QUIZ_ADVANCE_DELAY_MS);
    });

    return btn;
  }

  function showResult() {
    clearInterval(timerIntervalId);
    tabTracker.stop();
    submitQuizAttempt(unitId, "quiz", score, questions.length, startedAt, answersLog);

    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "quiz-wrap quiz-result";

    var title = document.createElement("h2");
    title.textContent = "Kết quả";
    wrap.appendChild(title);
    wrap.appendChild(buildResultMeta(breadcrumbText));

    var scoreBig = document.createElement("div");
    scoreBig.className = "score-big";
    scoreBig.textContent = score + " / " + questions.length;
    wrap.appendChild(scoreBig);

    var p = document.createElement("p");
    p.textContent = score === questions.length ? "Xuất sắc! Bé trả lời đúng hết!" : "Cố lên, làm lại để nhớ thêm nhé!";
    wrap.appendChild(p);

    wrap.appendChild(buildDurationLine(startedAt));
    wrap.appendChild(buildTabSwitchLine(tabTracker.getCount()));
    wrap.appendChild(buildAnswerBreakdown(answersLog));

    var retryBtn = document.createElement("button");
    retryBtn.className = "quiz-continue-btn";
    retryBtn.type = "button";
    retryBtn.textContent = "Làm lại";
    retryBtn.addEventListener("click", function () {
      questions = buildQuizQuestions(items, maxQuestions, format);
      qIndex = 0;
      score = 0;
      answered = false;
      selectedWrongId = null;
      answersLog = [];
      startedAt = new Date();
      timerIntervalId = startActivityTimer(startedAt);
      tabTracker = startTabSwitchTracker();
      showQuestion();
    });
    wrap.appendChild(retryBtn);

    container.appendChild(wrap);
  }

  showQuestion();
}
