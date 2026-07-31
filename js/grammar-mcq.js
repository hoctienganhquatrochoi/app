var GRAMMAR_MCQ_ADVANCE_DELAY_MS = 1200;

function buildGrammarMcqQuestions(items) {
  return shuffleArray(items).map(function (row) {
    var wrongOptions = (row.wrong_answers || []).map(function (text) {
      return { text: text, isCorrect: false };
    });
    var options = shuffleArray([{ text: row.correct_answer, isCorrect: true }].concat(wrongOptions));
    return { id: row.id, question: row.question, passage: row.passage, options: options, answered: false, selectedIndex: null };
  });
}

function renderGrammarMcq(container, breadcrumbText, items, unitId, setName, onTestComplete, progressOffset, progressTotal, scoreOffset) {
  var questions = buildGrammarMcqQuestions(items);
  var qIndex = 0;
  var score = 0;
  var answersLog = [];
  var startedAt = new Date();
  var timerIntervalId = startActivityTimer(startedAt);
  var tabTracker = startTabSwitchTracker();
  var freeNav = !!onTestComplete;

  function draw() {
    container.innerHTML = "";
    var q = questions[qIndex];

    var wrap = document.createElement("div");
    wrap.className = "quiz-wrap";
    wrap.appendChild(buildActivityHeader(startedAt, (scoreOffset || 0) + score, breadcrumbText));

    var body = document.createElement("div");
    body.className = "quiz-body";

    if (q.passage) {
      var passageEl = document.createElement("div");
      passageEl.className = "grammar-mcq-passage";
      passageEl.textContent = q.passage;
      body.appendChild(passageEl);
    }

    if (q.question) {
      var prompt = document.createElement("div");
      prompt.className = "quiz-prompt grammar-mcq-question";
      appendTextWithUnderline(prompt, q.question);
      body.appendChild(prompt);
    }

    var optionsEl = document.createElement("div");
    optionsEl.className = "quiz-options";

    q.options.forEach(function (option, idx) {
      optionsEl.appendChild(buildOption(q, option, idx));
    });
    body.appendChild(optionsEl);

    wrap.appendChild(body);
    wrap.appendChild(buildProgressFooter((progressOffset || 0) + qIndex + 1, progressTotal || questions.length));
    if (isAdminPreview() || freeNav) {
      wrap.appendChild(buildDevNavButtons(
        function () { goToIndex(qIndex - 1); },
        function () { goToIndex(qIndex + 1); },
        qIndex > 0,
        qIndex < questions.length - 1
      ));
    }
    container.appendChild(wrap);
  }

  function goToIndex(i) {
    if (i < 0 || i >= questions.length) {
      return;
    }
    qIndex = i;
    draw();
  }

  function findNextUnanswered() {
    var i;
    for (i = qIndex + 1; i < questions.length; i++) {
      if (!questions[i].answered) {
        return i;
      }
    }
    for (i = 0; i < questions.length; i++) {
      if (!questions[i].answered) {
        return i;
      }
    }
    return -1;
  }

  function buildOption(q, option, idx) {
    var btn = document.createElement("button");
    btn.className = "quiz-option grammar-mcq-option";
    btn.type = "button";

    var label = document.createElement("span");
    appendTextWithUnderline(label, option.text);
    btn.appendChild(label);

    if (q.answered) {
      btn.disabled = true;
      btn.className += " disabled";
      if (option.isCorrect) {
        btn.className += " correct";
        btn.appendChild(buildResultIcon(true));
      } else if (idx === q.selectedIndex) {
        btn.className += " wrong";
        btn.appendChild(buildResultIcon(false));
      }
    }

    btn.addEventListener("click", function () {
      if (q.answered) {
        return;
      }
      q.answered = true;
      q.selectedIndex = idx;
      if (option.isCorrect) {
        score++;
      }
      answersLog.push({
        vocab_id: q.id,
        word_en: q.question || q.options.map(function (o) { return o.text; }).join(" / "),
        selected_label: option.text,
        is_correct: option.isCorrect
      });
      draw();

      setTimeout(function () {
        if (freeNav) {
          var nextIdx = findNextUnanswered();
          if (nextIdx === -1) {
            showResult();
          } else {
            qIndex = nextIdx;
            draw();
          }
        } else if (qIndex < questions.length - 1) {
          qIndex++;
          draw();
        } else {
          showResult();
        }
      }, GRAMMAR_MCQ_ADVANCE_DELAY_MS);
    });

    return btn;
  }

  function showResult() {
    clearInterval(timerIntervalId);
    tabTracker.stop();
    if (onTestComplete) {
      onTestComplete(score, questions.length, answersLog, tabTracker.getCount());
      return;
    }
    submitQuizAttempt(unitId, "grammar-mcq", score, questions.length, startedAt, answersLog, setName, tabTracker.getCount());

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
    p.textContent = score === questions.length ? "Xuất sắc! Bạn trả lời đúng hết!" : "Cố lên, làm lại để nhớ thêm nhé!";
    wrap.appendChild(p);

    wrap.appendChild(buildDurationLine(startedAt));
    wrap.appendChild(buildTabSwitchLine(tabTracker.getCount()));
    wrap.appendChild(buildAnswerBreakdown(answersLog));

    var retryBtn = document.createElement("button");
    retryBtn.className = "quiz-continue-btn";
    retryBtn.type = "button";
    retryBtn.textContent = "Làm lại";
    retryBtn.addEventListener("click", function () {
      questions = buildGrammarMcqQuestions(items);
      qIndex = 0;
      score = 0;
      answersLog = [];
      startedAt = new Date();
      timerIntervalId = startActivityTimer(startedAt);
      tabTracker = startTabSwitchTracker();
      draw();
    });
    wrap.appendChild(retryBtn);

    container.appendChild(wrap);
  }

  draw();
}
