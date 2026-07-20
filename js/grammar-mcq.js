var GRAMMAR_MCQ_ADVANCE_DELAY_MS = 1200;

function buildGrammarMcqQuestions(items) {
  return shuffleArray(items).map(function (row) {
    var wrongOptions = (row.wrong_answers || []).map(function (text) {
      return { text: text, isCorrect: false };
    });
    var options = shuffleArray([{ text: row.correct_answer, isCorrect: true }].concat(wrongOptions));
    return { id: row.id, question: row.question, options: options };
  });
}

function renderGrammarMcq(container, breadcrumbText, items, unitId, setName) {
  var questions = buildGrammarMcqQuestions(items);
  var qIndex = 0;
  var score = 0;
  var answered = false;
  var selectedIndex = null;
  var answersLog = [];
  var startedAt = new Date();
  var timerIntervalId = startActivityTimer(startedAt);
  var tabTracker = startTabSwitchTracker();

  function draw() {
    container.innerHTML = "";
    var q = questions[qIndex];

    var wrap = document.createElement("div");
    wrap.className = "quiz-wrap";
    wrap.appendChild(buildActivityHeader(startedAt, score));

    var body = document.createElement("div");
    body.className = "quiz-body";

    if (q.question) {
      var prompt = document.createElement("div");
      prompt.className = "quiz-prompt grammar-mcq-question";
      prompt.textContent = q.question;
      body.appendChild(prompt);
    }

    var optionsEl = document.createElement("div");
    optionsEl.className = "quiz-options";

    q.options.forEach(function (option, idx) {
      optionsEl.appendChild(buildOption(q, option, idx));
    });
    body.appendChild(optionsEl);

    wrap.appendChild(body);
    wrap.appendChild(buildProgressFooter(qIndex + 1, questions.length));
    container.appendChild(wrap);
  }

  function buildOption(q, option, idx) {
    var btn = document.createElement("button");
    btn.className = "quiz-option grammar-mcq-option";
    btn.type = "button";

    var label = document.createElement("span");
    appendTextWithUnderline(label, option.text);
    btn.appendChild(label);

    if (answered) {
      btn.disabled = true;
      btn.className += " disabled";
      if (option.isCorrect) {
        btn.className += " correct";
        btn.appendChild(buildResultIcon(true));
      } else if (idx === selectedIndex) {
        btn.className += " wrong";
        btn.appendChild(buildResultIcon(false));
      }
    }

    btn.addEventListener("click", function () {
      if (answered) {
        return;
      }
      answered = true;
      selectedIndex = idx;
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
        if (qIndex < questions.length - 1) {
          qIndex++;
          answered = false;
          selectedIndex = null;
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
    submitQuizAttempt(unitId, "grammar-mcq", score, questions.length, startedAt, answersLog, setName);

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
      answered = false;
      selectedIndex = null;
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
