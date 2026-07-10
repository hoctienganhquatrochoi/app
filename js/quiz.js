var QUIZ_FORMAT_CONFIG = {
  "word-to-image": { showWord: true, showPhonetic: true, showImage: false, showMeaning: false, answerType: "image" },
  "image-to-word": { showWord: false, showPhonetic: true, showImage: true, showMeaning: true, answerType: "word" },
  "text-to-word": { showWord: false, showPhonetic: true, showImage: false, showMeaning: true, answerType: "word" },
  "image-only-to-word": { showWord: false, showPhonetic: false, showImage: true, showMeaning: false, answerType: "word" },
  "word-to-meaning": { showWord: true, showPhonetic: true, showImage: false, showMeaning: false, answerType: "meaning" }
};

var QUIZ_FORMAT_KEYS = Object.keys(QUIZ_FORMAT_CONFIG);

function buildQuizQuestion(item, pool) {
  var format = QUIZ_FORMAT_KEYS[Math.floor(Math.random() * QUIZ_FORMAT_KEYS.length)];
  var distractors = pickRandomDistractors(pool, item, 3);
  var options = shuffleArray([item].concat(distractors));
  return { item: item, format: format, options: options };
}

function buildQuizQuestions(items, maxQuestions) {
  var pool = pickQuestionPool(items, maxQuestions);
  var questions = [];
  var i;
  for (i = 0; i < pool.length; i++) {
    questions.push(buildQuizQuestion(pool[i], items));
  }
  return questions;
}

function renderQuiz(container, breadcrumbText, items, unitId, maxQuestions) {
  var questions = buildQuizQuestions(items, maxQuestions);
  var qIndex = 0;
  var score = 0;
  var answered = false;
  var selectedWrongId = null;
  var answersLog = [];
  var startedAt = new Date();

  function draw() {
    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "quiz-wrap";

    var crumb = document.createElement("div");
    crumb.className = "breadcrumb";
    crumb.textContent = breadcrumbText;
    wrap.appendChild(crumb);

    var title = document.createElement("h2");
    title.textContent = "Quiz";
    wrap.appendChild(title);

    var header = document.createElement("div");
    header.className = "quiz-header";

    var counter = document.createElement("span");
    counter.textContent = "Câu " + (qIndex + 1) + " / " + questions.length;
    header.appendChild(counter);

    var scoreEl = document.createElement("span");
    scoreEl.textContent = "Đúng: " + score;
    header.appendChild(scoreEl);

    wrap.appendChild(header);

    var q = questions[qIndex];
    var config = QUIZ_FORMAT_CONFIG[q.format];

    var body = document.createElement("div");
    body.className = "quiz-body" + (config.showImage && config.answerType !== "image" ? " quiz-body-row" : "");

    body.appendChild(buildPrompt(q, config));

    var optionsEl = document.createElement("div");
    optionsEl.className = "quiz-options" + (config.answerType === "image" ? " quiz-options-image" : "");

    var i;
    for (i = 0; i < q.options.length; i++) {
      optionsEl.appendChild(buildOption(q, config, q.options[i]));
    }
    body.appendChild(optionsEl);

    wrap.appendChild(body);

    if (answered) {
      var continueWrap = document.createElement("div");
      continueWrap.className = "quiz-continue-wrap";

      var continueBtn = document.createElement("button");
      continueBtn.className = "quiz-continue-btn";
      continueBtn.type = "button";
      continueBtn.textContent = qIndex === questions.length - 1 ? "Xem kết quả" : "Câu tiếp theo →";
      continueBtn.addEventListener("click", function () {
        if (qIndex < questions.length - 1) {
          qIndex++;
          answered = false;
          selectedWrongId = null;
          draw();
        } else {
          showResult();
        }
      });
      continueWrap.appendChild(continueBtn);
      wrap.appendChild(continueWrap);
    }

    container.appendChild(wrap);
  }

  function buildPrompt(q, config) {
    var prompt = document.createElement("div");
    prompt.className = "quiz-prompt";

    if (config.showImage) {
      prompt.appendChild(buildVisualElement(q.item, "quiz-emoji"));
    }

    if (config.showWord) {
      var wordEl = document.createElement("div");
      wordEl.className = "quiz-question-word";
      wordEl.textContent = q.item.en + (config.showPhonetic ? " " + (q.item.phonetic || "") : "");
      prompt.appendChild(wordEl);
    } else if (config.showPhonetic && q.item.phonetic) {
      var phoneticEl = document.createElement("div");
      phoneticEl.className = "quiz-question-phonetic";
      phoneticEl.textContent = q.item.phonetic;
      prompt.appendChild(phoneticEl);
    }

    if (config.showMeaning) {
      var meaningEl = document.createElement("div");
      meaningEl.className = "quiz-question-text";
      meaningEl.textContent = q.item.vi;
      prompt.appendChild(meaningEl);
    }

    var audioBtn = document.createElement("button");
    audioBtn.className = "audio-btn quiz-prompt-audio";
    audioBtn.type = "button";
    audioBtn.textContent = "▶";
    audioBtn.addEventListener("click", function () {
      playAudioUrlOrSpeak(q.item.audioEnUrl, q.item.en, "en-US");
    });
    prompt.appendChild(audioBtn);

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
      label.textContent = config.answerType === "meaning" ? option.vi : option.en;
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
      playAudioUrlOrSpeak(q.item.audioEnUrl, q.item.en, "en-US");
      draw();
    });

    return btn;
  }

  function showResult() {
    submitQuizAttempt(unitId, "quiz", score, questions.length, startedAt, answersLog);

    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "quiz-wrap quiz-result";

    var crumb = document.createElement("div");
    crumb.className = "breadcrumb";
    crumb.textContent = breadcrumbText;
    wrap.appendChild(crumb);

    var title = document.createElement("h2");
    title.textContent = "Kết quả";
    wrap.appendChild(title);

    var scoreBig = document.createElement("div");
    scoreBig.className = "score-big";
    scoreBig.textContent = score + " / " + questions.length;
    wrap.appendChild(scoreBig);

    var p = document.createElement("p");
    p.textContent = score === questions.length ? "Xuất sắc! Bé trả lời đúng hết!" : "Cố lên, làm lại để nhớ thêm nhé!";
    wrap.appendChild(p);

    var retryBtn = document.createElement("button");
    retryBtn.className = "quiz-continue-btn";
    retryBtn.type = "button";
    retryBtn.textContent = "Làm lại";
    retryBtn.addEventListener("click", function () {
      questions = buildQuizQuestions(items, maxQuestions);
      qIndex = 0;
      score = 0;
      answered = false;
      selectedWrongId = null;
      answersLog = [];
      startedAt = new Date();
      draw();
    });
    wrap.appendChild(retryBtn);

    container.appendChild(wrap);
  }

  draw();
}
