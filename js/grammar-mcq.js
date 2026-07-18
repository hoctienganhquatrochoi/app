var GRAMMAR_MCQ_ADVANCE_DELAY_MS = 1200;

function renderGrammarMcq(container, breadcrumbText, items, unitId) {
  var questions = shuffleArray(items);
  var qIndex = 0;
  var score = 0;
  var answered = false;
  var selectedOption = null;
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

    var keys = ["A", "B", "C", "D"];
    var fields = { A: "option_a", B: "option_b", C: "option_c", D: "option_d" };
    keys.forEach(function (key) {
      optionsEl.appendChild(buildOption(q, key, q[fields[key]]));
    });
    body.appendChild(optionsEl);

    wrap.appendChild(body);
    wrap.appendChild(buildProgressFooter(qIndex + 1, questions.length));
    container.appendChild(wrap);
  }

  function buildOption(q, key, text) {
    var btn = document.createElement("button");
    btn.className = "quiz-option grammar-mcq-option";
    btn.type = "button";

    var label = document.createElement("span");
    appendTextWithUnderline(label, text);
    btn.appendChild(label);

    if (answered) {
      btn.disabled = true;
      btn.className += " disabled";
      if (key === q.correct_option) {
        btn.className += " correct";
        btn.appendChild(buildResultIcon(true));
      } else if (key === selectedOption) {
        btn.className += " wrong";
        btn.appendChild(buildResultIcon(false));
      }
    }

    btn.addEventListener("click", function () {
      if (answered) {
        return;
      }
      answered = true;
      selectedOption = key;
      var isCorrect = key === q.correct_option;
      if (isCorrect) {
        score++;
      }
      answersLog.push({
        vocab_id: q.id,
        word_en: q.question || (q.option_a + " / " + q.option_b + " / " + q.option_c + " / " + q.option_d),
        selected_label: text,
        is_correct: isCorrect
      });
      draw();

      setTimeout(function () {
        if (qIndex < questions.length - 1) {
          qIndex++;
          answered = false;
          selectedOption = null;
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
    submitQuizAttempt(unitId, "grammar-mcq", score, questions.length, startedAt, answersLog);

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
      questions = shuffleArray(items);
      qIndex = 0;
      score = 0;
      answered = false;
      selectedOption = null;
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
