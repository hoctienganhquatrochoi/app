var GRAMMAR_DRAGFILL_CORRECT_DELAY_MS = 1200;

function splitQuestionAroundBlank(questionEn) {
  var match = questionEn.match(/_+/);
  if (!match) {
    return { before: questionEn, after: "" };
  }
  return {
    before: questionEn.slice(0, match.index),
    after: questionEn.slice(match.index + match[0].length)
  };
}

function buildGrammarDragfillQuestions(items) {
  return shuffleArray(items).map(function (row) {
    var wrongOptions = (row.wrong_answers || []).map(function (text) {
      return { text: text, isCorrect: false, used: false };
    });
    var options = shuffleArray([{ text: row.correct_answer, isCorrect: true, used: false }].concat(wrongOptions));
    var split = splitQuestionAroundBlank(row.question_en);
    return {
      id: row.id,
      before: split.before,
      after: split.after,
      questionVi: row.question_vi,
      options: options,
      filledOption: null,
      answered: false,
      lastCorrect: false
    };
  });
}

function renderGrammarDragfill(container, breadcrumbText, items, unitId, setName, onTestComplete, progressOffset, progressTotal, scoreOffset) {
  var questions, qIndex, score, answersLog, startedAt, timerIntervalId, tabTracker, currentWrap, advanceTimeoutId;
  var freeNav = !!onTestComplete;

  function resetState() {
    questions = buildGrammarDragfillQuestions(items);
    qIndex = 0;
    score = 0;
    answersLog = [];
    startedAt = new Date();
    timerIntervalId = startActivityTimer(startedAt);
    tabTracker = startTabSwitchTracker();
  }

  function handleGlobalKeydown(e) {
    if (!currentWrap || !currentWrap.isConnected) {
      document.removeEventListener("keydown", handleGlobalKeydown);
      return;
    }
    if (e.key !== "Enter") {
      return;
    }
    var q = questions[qIndex];
    if (q.answered) {
      if (freeNav || q.lastCorrect) {
        clearTimeout(advanceTimeoutId);
        goNext();
      }
    } else if (q.filledOption) {
      submitAnswer();
    }
  }
  document.addEventListener("keydown", handleGlobalKeydown);

  function draw() {
    container.innerHTML = "";
    var q = questions[qIndex];

    var wrap = document.createElement("div");
    wrap.className = "dragfill-wrap";
    wrap.appendChild(buildActivityHeader(startedAt, (scoreOffset || 0) + score));

    var tilesEl = document.createElement("div");
    tilesEl.className = "dragfill-tiles";
    q.options.forEach(function (option) {
      if (option.used) {
        return;
      }
      var tile = document.createElement("button");
      tile.type = "button";
      tile.className = "dragfill-tile";
      tile.textContent = option.text;
      tile.disabled = q.answered;
      tile.addEventListener("click", function () {
        handleTileClick(q, option);
      });
      tilesEl.appendChild(tile);
    });
    wrap.appendChild(tilesEl);

    var questionEl = document.createElement("div");
    questionEl.className = "dragfill-question";

    questionEl.appendChild(document.createTextNode(q.before));

    var blank = document.createElement("span");
    blank.className = "dragfill-blank" + (q.filledOption ? " filled" : "");
    if (q.answered) {
      blank.className += q.lastCorrect ? " correct" : " wrong";
    }
    if (q.filledOption) {
      blank.textContent = q.filledOption.text;
      if (!q.answered) {
        blank.addEventListener("click", function () {
          handleBlankClick(q);
        });
      }
    }
    questionEl.appendChild(blank);

    questionEl.appendChild(document.createTextNode(q.after));
    wrap.appendChild(questionEl);

    if (q.answered) {
      var icon = document.createElement("div");
      icon.className = "dragfill-feedback-icon " + (q.lastCorrect ? "dragfill-correct-icon" : "dragfill-wrong-icon");
      icon.textContent = q.lastCorrect ? "✓" : "✗";
      wrap.appendChild(icon);

      if (!q.lastCorrect) {
        var hint = document.createElement("div");
        hint.className = "dragfill-hint";
        hint.textContent = "Đáp án đúng: " + q.options.filter(function (o) { return o.isCorrect; })[0].text + (freeNav ? "" : " — thử lại nhé!");
        wrap.appendChild(hint);
      }
    }

    if (q.questionVi) {
      var viEl = document.createElement("div");
      viEl.className = "dragfill-vi";
      viEl.textContent = q.questionVi;
      wrap.appendChild(viEl);
    }

    if (!q.answered) {
      var checkBtn = document.createElement("button");
      checkBtn.className = "quiz-continue-btn";
      checkBtn.type = "button";
      checkBtn.textContent = "Kiểm tra";
      checkBtn.disabled = !q.filledOption;
      checkBtn.addEventListener("click", function () {
        submitAnswer();
      });
      wrap.appendChild(checkBtn);
    } else if (freeNav || q.lastCorrect) {
      var nextBtn = document.createElement("button");
      nextBtn.className = "quiz-continue-btn";
      nextBtn.type = "button";
      nextBtn.textContent = "Câu tiếp theo →";
      nextBtn.addEventListener("click", function () {
        clearTimeout(advanceTimeoutId);
        goNext();
      });
      wrap.appendChild(nextBtn);
    }

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
    currentWrap = wrap;
  }

  function goToIndex(i) {
    if (i < 0 || i >= questions.length) {
      return;
    }
    clearTimeout(advanceTimeoutId);
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

  function handleTileClick(q, option) {
    if (q.answered) {
      return;
    }
    if (q.filledOption) {
      q.filledOption.used = false;
    }
    option.used = true;
    q.filledOption = option;
    draw();
  }

  function handleBlankClick(q) {
    if (q.answered || !q.filledOption) {
      return;
    }
    q.filledOption.used = false;
    q.filledOption = null;
    draw();
  }

  function submitAnswer() {
    var q = questions[qIndex];
    if (q.answered || !q.filledOption) {
      return;
    }
    q.answered = true;
    q.lastCorrect = q.filledOption.isCorrect;
    if (q.lastCorrect) {
      score++;
    }
    answersLog.push({
      vocab_id: q.id,
      word_en: q.before + "___" + q.after,
      selected_label: q.filledOption.text,
      is_correct: q.lastCorrect
    });
    draw();

    if (freeNav) {
      advanceTimeoutId = setTimeout(goNext, GRAMMAR_DRAGFILL_CORRECT_DELAY_MS);
    } else if (q.lastCorrect) {
      advanceTimeoutId = setTimeout(goNext, GRAMMAR_DRAGFILL_CORRECT_DELAY_MS);
    } else {
      advanceTimeoutId = setTimeout(function () { retry(q); }, GRAMMAR_DRAGFILL_CORRECT_DELAY_MS);
    }
  }

  function retry(q) {
    if (q.filledOption) {
      q.filledOption.used = false;
      q.filledOption = null;
    }
    q.answered = false;
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
    } else if (qIndex < questions.length - 1) {
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
      onTestComplete(score, questions.length, answersLog, tabTracker.getCount());
      return;
    }
    submitQuizAttempt(unitId, "grammar-dragfill", score, questions.length, startedAt, answersLog, setName, tabTracker.getCount());

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
      resetState();
      document.addEventListener("keydown", handleGlobalKeydown);
      draw();
    });
    wrap.appendChild(retryBtn);

    container.appendChild(wrap);
  }

  resetState();
  draw();
}
