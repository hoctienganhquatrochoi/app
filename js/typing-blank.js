function normalizeTypedAnswer(text) {
  return text.trim().toLowerCase();
}

function renderTypingBlank(container, items, unitId, maxQuestions, direction) {
  var pool = pickQuestionPool(items, maxQuestions);
  var qIndex = 0;
  var score = 0;
  var answered = false;
  var answersLog = [];
  var startedAt = new Date();
  var activityType = direction === "en" ? "typing-blank" : "typing-vi";

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

    var header = document.createElement("div");
    header.className = "quiz-header";
    var counter = document.createElement("span");
    counter.textContent = "Câu " + (qIndex + 1) + " / " + pool.length;
    header.appendChild(counter);
    var scoreEl = document.createElement("span");
    scoreEl.textContent = "Đúng: " + score;
    header.appendChild(scoreEl);
    wrap.appendChild(header);

    if (direction === "en") {
      wrap.appendChild(buildVisualElement(item, "ty-emoji"));
      var meaning = document.createElement("div");
      meaning.className = "ty-meaning";
      meaning.textContent = item.vi;
      wrap.appendChild(meaning);
    } else {
      var wordEl = document.createElement("div");
      wordEl.className = "quiz-question-word";
      wordEl.textContent = item.en + " " + (item.phonetic || "");
      wrap.appendChild(wordEl);
    }

    var audioBtn = document.createElement("button");
    audioBtn.className = "audio-btn";
    audioBtn.type = "button";
    audioBtn.textContent = "▶";
    audioBtn.addEventListener("click", function () {
      playAudioUrlOrSpeak(item.audioEnUrl, item.en, "en-US");
    });
    wrap.appendChild(audioBtn);

    var input = document.createElement("input");
    input.type = "text";
    input.className = "ty-input";
    input.placeholder = direction === "en" ? "Gõ từ tiếng Anh..." : "Gõ nghĩa tiếng Việt...";
    input.disabled = answered;
    wrap.appendChild(input);

    if (answered) {
      var correctAnswer = direction === "en" ? item.en : item.vi;
      var feedback = document.createElement("div");
      feedback.className = "ty-feedback";
      feedback.textContent = "Đáp án đúng: " + correctAnswer;
      wrap.appendChild(feedback);
    } else {
      var checkBtn = document.createElement("button");
      checkBtn.className = "quiz-continue-btn";
      checkBtn.type = "button";
      checkBtn.textContent = "Kiểm tra";
      checkBtn.addEventListener("click", function () {
        checkAnswer(input.value);
      });
      wrap.appendChild(checkBtn);

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          checkAnswer(input.value);
        }
      });
    }

    container.appendChild(wrap);

    if (!answered) {
      input.focus();
    }
  }

  function checkAnswer(rawValue) {
    if (answered) {
      return;
    }
    answered = true;

    var item = pool[qIndex];
    var correctAnswer = direction === "en" ? item.en : item.vi;
    var isCorrect = normalizeTypedAnswer(rawValue) === normalizeTypedAnswer(correctAnswer);

    if (isCorrect) {
      score++;
    }
    answersLog.push({
      vocab_id: item.id,
      word_en: item.en,
      selected_label: rawValue,
      is_correct: isCorrect
    });

    draw();

    setTimeout(function () {
      if (qIndex < pool.length - 1) {
        qIndex++;
        showQuestion();
      } else {
        showResult();
      }
    }, 1500);
  }

  function showResult() {
    submitQuizAttempt(unitId, activityType, score, pool.length, startedAt, answersLog);

    container.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "quiz-wrap quiz-result";

    var title = document.createElement("h2");
    title.textContent = "Kết quả";
    wrap.appendChild(title);

    var scoreBig = document.createElement("div");
    scoreBig.className = "score-big";
    scoreBig.textContent = score + " / " + pool.length;
    wrap.appendChild(scoreBig);

    var p = document.createElement("p");
    p.textContent = score === pool.length ? "Xuất sắc! Bé trả lời đúng hết!" : "Cố lên, làm lại để nhớ thêm nhé!";
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
      showQuestion();
    });
    wrap.appendChild(retryBtn);

    container.appendChild(wrap);
  }

  showQuestion();
}
