function buildPhotoQuizData(questions) {
  return questions.map(function (row) {
    var wrongOptions = (row.wrong_answers || []).map(function (text) {
      return { text: text, isCorrect: false };
    });
    var isMcq = wrongOptions.length > 0;
    return {
      id: row.id,
      question: row.question,
      correctAnswer: row.correct_answer,
      isMcq: isMcq,
      options: isMcq ? shuffleArray([{ text: row.correct_answer, isCorrect: true }].concat(wrongOptions)) : null
    };
  });
}

function renderPhotoQuiz(container, breadcrumbText, imageUrl, questions, unitId, setName) {
  var qData = buildPhotoQuizData(questions);
  var answers = new Array(qData.length).fill(null);
  var startedAt = new Date();
  var timerIntervalId = startActivityTimer(startedAt);
  var tabTracker = startTabSwitchTracker();

  function buildQuestionEl(q, idx) {
    var qEl = document.createElement("div");
    qEl.className = "pq-question";

    var qText = document.createElement("div");
    qText.className = "pq-question-text";
    qText.textContent = (idx + 1) + ". " + q.question;
    qEl.appendChild(qText);

    if (q.isMcq) {
      var optionsEl = document.createElement("div");
      optionsEl.className = "pq-options";
      q.options.forEach(function (option) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pq-option";
        btn.textContent = option.text;
        btn.addEventListener("click", function () {
          Array.prototype.forEach.call(optionsEl.children, function (b) {
            b.classList.remove("selected");
          });
          btn.classList.add("selected");
          answers[idx] = option.text;
        });
        optionsEl.appendChild(btn);
      });
      qEl.appendChild(optionsEl);
    } else {
      var input = document.createElement("input");
      input.type = "text";
      input.className = "pq-input";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.placeholder = "Gõ câu trả lời...";
      input.addEventListener("input", function () {
        answers[idx] = input.value;
      });
      qEl.appendChild(input);
    }

    return qEl;
  }

  function draw() {
    container.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "pq-wrap";
    wrap.appendChild(buildActivityHeader(startedAt, 0));

    if (imageUrl) {
      var img = document.createElement("img");
      img.className = "pq-image";
      img.src = imageUrl;
      wrap.appendChild(img);
    }

    var questionsWrap = document.createElement("div");
    questionsWrap.className = "pq-questions";
    qData.forEach(function (q, idx) {
      questionsWrap.appendChild(buildQuestionEl(q, idx));
    });
    wrap.appendChild(questionsWrap);

    var submitBtn = document.createElement("button");
    submitBtn.className = "quiz-continue-btn";
    submitBtn.type = "button";
    submitBtn.textContent = "Nộp bài";
    submitBtn.addEventListener("click", handleSubmit);
    wrap.appendChild(submitBtn);

    container.appendChild(wrap);
  }

  function handleSubmit() {
    clearInterval(timerIntervalId);
    tabTracker.stop();

    var score = 0;
    var answersLog = [];
    qData.forEach(function (q, idx) {
      var given = (answers[idx] || "").toString();
      var isCorrect = normalizeGrammarTypingAnswer(given) === normalizeGrammarTypingAnswer(q.correctAnswer);
      if (isCorrect) {
        score++;
      }
      answersLog.push({
        vocab_id: q.id,
        word_en: q.question,
        selected_label: given || "(bỏ trống)",
        is_correct: isCorrect
      });
    });

    submitQuizAttempt(unitId, "photo-quiz", score, qData.length, startedAt, answersLog, setName);
    showResult(score, answersLog);
  }

  function showResult(score, answersLog) {
    container.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "quiz-wrap quiz-result";

    var title = document.createElement("h2");
    title.textContent = "Kết quả";
    wrap.appendChild(title);
    wrap.appendChild(buildResultMeta(breadcrumbText));

    var scoreBig = document.createElement("div");
    scoreBig.className = "score-big";
    scoreBig.textContent = score + " / " + qData.length;
    wrap.appendChild(scoreBig);

    var p = document.createElement("p");
    p.textContent = score === qData.length ? "Xuất sắc! Bạn trả lời đúng hết!" : "Cố lên, làm lại để nhớ thêm nhé!";
    wrap.appendChild(p);

    wrap.appendChild(buildDurationLine(startedAt));
    wrap.appendChild(buildTabSwitchLine(tabTracker.getCount()));
    wrap.appendChild(buildAnswerBreakdown(answersLog));

    var retryBtn = document.createElement("button");
    retryBtn.className = "quiz-continue-btn";
    retryBtn.type = "button";
    retryBtn.textContent = "Làm lại";
    retryBtn.addEventListener("click", function () {
      renderPhotoQuiz(container, breadcrumbText, imageUrl, questions, unitId, setName);
    });
    wrap.appendChild(retryBtn);

    container.appendChild(wrap);
  }

  draw();
}
