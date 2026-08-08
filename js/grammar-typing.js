var GRAMMAR_TYPING_CORRECT_DELAY_MS = 1200;
var GRAMMAR_TYPING_WRONG_DELAY_MS = 2000;

function normalizeGrammarTypingAnswer(str) {
  return normalizeQuoteChars(str || "").trim().replace(/\s+/g, " ");
}

function buildGrammarTypingPool(items) {
  return shuffleArray(items).map(function (item) {
    return { item: item, answered: false, lastCorrect: false, lastAnswerValue: "" };
  });
}

function renderGrammarTyping(container, breadcrumbText, items, unitId, setName, onTestComplete, progressOffset, progressTotal, scoreOffset) {
  var pool = buildGrammarTypingPool(items);
  var qIndex = 0;
  var score = 0;
  var answersLog = [];
  var startedAt = new Date();
  var timerIntervalId = startActivityTimer(startedAt);
  var tabTracker = startTabSwitchTracker();
  var currentWrap = null;
  var advanceTimeoutId = null;
  var freeNav = !!onTestComplete;

  function handleGlobalKeydown(e) {
    if (!currentWrap || !currentWrap.isConnected) {
      document.removeEventListener("keydown", handleGlobalKeydown);
      return;
    }
    if (e.key !== "Enter") {
      return;
    }
    var entry = pool[qIndex];
    if (entry.answered) {
      clearTimeout(advanceTimeoutId);
      if (freeNav || entry.lastCorrect) {
        goNext();
      } else {
        retry();
      }
    } else {
      var inputEl = container.querySelector(".ft-input");
      checkAnswer(inputEl ? inputEl.value : "");
    }
  }
  document.addEventListener("keydown", handleGlobalKeydown);

  function draw() {
    container.innerHTML = "";
    var entry = pool[qIndex];
    var item = entry.item;

    var wrap = document.createElement("div");
    wrap.className = "ty-wrap";
    wrap.appendChild(buildActivityHeader(startedAt, (scoreOffset || 0) + score));
    if (!onTestComplete && setName) {
      wrap.appendChild(buildSetNameBanner(setName));
    }

    var line = document.createElement("div");
    line.className = "ty-meaning no-visual";
    line.textContent = item.prompt;
    wrap.appendChild(line);

    var input = document.createElement("input");
    input.type = "text";
    input.className = "ft-input";
    input.autocapitalize = "off";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.placeholder = "Gõ câu trả lời...";
    input.disabled = entry.answered;
    wrap.appendChild(input);

    if (!entry.answered) {
      var submitBtn = document.createElement("button");
      submitBtn.className = "quiz-continue-btn";
      submitBtn.type = "button";
      submitBtn.textContent = "Nộp bài";
      submitBtn.addEventListener("click", function () {
        checkAnswer(input.value);
      });
      wrap.appendChild(submitBtn);
    } else {
      input.value = entry.lastAnswerValue;

      var feedback = document.createElement("div");
      feedback.className = "ft-feedback " + (entry.lastCorrect ? "ft-correct" : "ft-wrong");
      feedback.textContent = entry.lastCorrect ? "✓ Chính xác!" : ("✗ Đáp án đúng: " + item.answer + (freeNav ? "" : " — thử gõ lại nhé!"));
      wrap.appendChild(feedback);
    }

    wrap.appendChild(buildProgressFooter((progressOffset || 0) + qIndex + 1, progressTotal || pool.length));
    if (isAdminPreview() || freeNav) {
      wrap.appendChild(buildDevNavButtons(
        function () { goToIndex(qIndex - 1); },
        function () { goToIndex(qIndex + 1); },
        qIndex > 0,
        qIndex < pool.length - 1
      ));
    }
    container.appendChild(wrap);
    currentWrap = wrap;
    if (!entry.answered) {
      input.focus();
    }
  }

  function goToIndex(i) {
    if (i < 0 || i >= pool.length) {
      return;
    }
    qIndex = i;
    draw();
  }

  function findNextUnanswered() {
    var i;
    for (i = qIndex + 1; i < pool.length; i++) {
      if (!pool[i].answered) {
        return i;
      }
    }
    for (i = 0; i < pool.length; i++) {
      if (!pool[i].answered) {
        return i;
      }
    }
    return -1;
  }

  function checkAnswer(value) {
    var entry = pool[qIndex];
    if (entry.answered) {
      return;
    }
    var item = entry.item;
    var isCorrect = normalizeGrammarTypingAnswer(value) === normalizeGrammarTypingAnswer(item.answer);
    entry.lastCorrect = isCorrect;
    entry.lastAnswerValue = value;
    entry.answered = true;

    if (isCorrect) {
      score++;
    }
    var existingEntry = answersLog.filter(function (a) { return a.vocab_id === item.id; })[0];
    if (existingEntry) {
      existingEntry.selected_label = value;
      existingEntry.is_correct = isCorrect;
    } else {
      answersLog.push({
        vocab_id: item.id,
        word_en: item.answer,
        selected_label: value,
        is_correct: isCorrect
      });
    }

    draw();

    advanceTimeoutId = setTimeout(function () {
      if (freeNav) {
        goNext();
      } else if (isCorrect) {
        goNext();
      } else {
        retry();
      }
    }, isCorrect ? GRAMMAR_TYPING_CORRECT_DELAY_MS : GRAMMAR_TYPING_WRONG_DELAY_MS);
  }

  function retry() {
    var entry = pool[qIndex];
    entry.answered = false;
    entry.lastAnswerValue = "";
    draw();
  }

  function goNext() {
    if (freeNav) {
      var nextIdx = findNextUnanswered();
      if (nextIdx === -1) {
        showResult();
      } else {
        qIndex = nextIdx;
        draw();
      }
    } else if (qIndex < pool.length - 1) {
      qIndex++;
      draw();
    } else {
      showResult();
    }
  }

  function showResult() {
    clearInterval(timerIntervalId);
    tabTracker.stop();
    document.removeEventListener("keydown", handleGlobalKeydown);
    if (onTestComplete) {
      onTestComplete(score, pool.length, answersLog, tabTracker.getCount());
      return;
    }
    submitQuizAttempt(unitId, "grammar-typing", score, pool.length, startedAt, answersLog, setName, tabTracker.getCount());

    container.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "quiz-wrap quiz-result";

    var title = document.createElement("h2");
    title.textContent = "Kết quả";
    wrap.appendChild(title);
    wrap.appendChild(buildResultMeta(breadcrumbText));

    var scoreBig = document.createElement("div");
    scoreBig.className = "score-big";
    scoreBig.textContent = score + " / " + pool.length;
    wrap.appendChild(scoreBig);

    var p = document.createElement("p");
    p.textContent = "Bạn đã gõ đúng " + score + " / " + pool.length + " câu!";
    wrap.appendChild(p);

    wrap.appendChild(buildDurationLine(startedAt));
    wrap.appendChild(buildTabSwitchLine(tabTracker.getCount()));
    wrap.appendChild(buildAnswerBreakdown(answersLog));

    var retryBtn = document.createElement("button");
    retryBtn.className = "quiz-continue-btn";
    retryBtn.type = "button";
    retryBtn.textContent = "Làm lại";
    retryBtn.addEventListener("click", function () {
      pool = buildGrammarTypingPool(items);
      qIndex = 0;
      score = 0;
      answersLog = [];
      startedAt = new Date();
      timerIntervalId = startActivityTimer(startedAt);
      tabTracker = startTabSwitchTracker();
      document.addEventListener("keydown", handleGlobalKeydown);
      draw();
    });
    wrap.appendChild(retryBtn);

    container.appendChild(wrap);
  }

  draw();
}
