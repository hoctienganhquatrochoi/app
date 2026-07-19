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
      options: options
    };
  });
}

function renderGrammarDragfill(container, breadcrumbText, items, unitId) {
  var questions, qIndex, score, filledOption, answered, lastCorrect, answersLog, startedAt, timerIntervalId, tabTracker, currentWrap;

  function resetState() {
    questions = buildGrammarDragfillQuestions(items);
    qIndex = 0;
    score = 0;
    filledOption = null;
    answered = false;
    lastCorrect = false;
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
    if (answered) {
      if (lastCorrect) {
        goNext();
      }
    } else if (filledOption) {
      submitAnswer();
    }
  }
  document.addEventListener("keydown", handleGlobalKeydown);

  function draw() {
    container.innerHTML = "";
    var q = questions[qIndex];

    var wrap = document.createElement("div");
    wrap.className = "dragfill-wrap";
    wrap.appendChild(buildActivityHeader(startedAt, score));

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
      tile.disabled = answered;
      tile.addEventListener("click", function () {
        handleTileClick(option);
      });
      tilesEl.appendChild(tile);
    });
    wrap.appendChild(tilesEl);

    var questionEl = document.createElement("div");
    questionEl.className = "dragfill-question";

    questionEl.appendChild(document.createTextNode(q.before));

    var blank = document.createElement("span");
    blank.className = "dragfill-blank" + (filledOption ? " filled" : "");
    if (answered) {
      blank.className += lastCorrect ? " correct" : " wrong";
    }
    if (filledOption) {
      blank.textContent = filledOption.text;
      if (!answered) {
        blank.addEventListener("click", function () {
          handleBlankClick();
        });
      }
    }
    questionEl.appendChild(blank);

    questionEl.appendChild(document.createTextNode(q.after));
    wrap.appendChild(questionEl);

    if (answered) {
      var icon = document.createElement("div");
      icon.className = "dragfill-feedback-icon " + (lastCorrect ? "dragfill-correct-icon" : "dragfill-wrong-icon");
      icon.textContent = lastCorrect ? "✓" : "✗";
      wrap.appendChild(icon);

      if (!lastCorrect) {
        var hint = document.createElement("div");
        hint.className = "dragfill-hint";
        hint.textContent = "Đáp án đúng: " + q.options.filter(function (o) { return o.isCorrect; })[0].text + " — thử lại nhé!";
        wrap.appendChild(hint);
      }
    }

    if (q.questionVi) {
      var viEl = document.createElement("div");
      viEl.className = "dragfill-vi";
      viEl.textContent = q.questionVi;
      wrap.appendChild(viEl);
    }

    wrap.appendChild(buildProgressFooter(qIndex + 1, questions.length));
    container.appendChild(wrap);
    currentWrap = wrap;
  }

  function handleTileClick(option) {
    if (answered) {
      return;
    }
    if (filledOption) {
      filledOption.used = false;
    }
    option.used = true;
    filledOption = option;
    draw();
  }

  function handleBlankClick() {
    if (answered || !filledOption) {
      return;
    }
    filledOption.used = false;
    filledOption = null;
    draw();
  }

  function submitAnswer() {
    if (answered || !filledOption) {
      return;
    }
    var q = questions[qIndex];
    answered = true;
    lastCorrect = filledOption.isCorrect;
    if (lastCorrect) {
      score++;
    }
    answersLog.push({
      vocab_id: q.id,
      word_en: q.before + "___" + q.after,
      selected_label: filledOption.text,
      is_correct: lastCorrect
    });
    draw();

    if (lastCorrect) {
      setTimeout(goNext, GRAMMAR_DRAGFILL_CORRECT_DELAY_MS);
    } else {
      setTimeout(retry, GRAMMAR_DRAGFILL_CORRECT_DELAY_MS);
    }
  }

  function retry() {
    if (filledOption) {
      filledOption.used = false;
      filledOption = null;
    }
    answered = false;
    draw();
  }

  function goNext() {
    if (qIndex < questions.length - 1) {
      qIndex++;
      filledOption = null;
      answered = false;
      draw();
    } else {
      showResult();
    }
  }

  function showResult() {
    clearInterval(timerIntervalId);
    tabTracker.stop();
    document.removeEventListener("keydown", handleGlobalKeydown);
    submitQuizAttempt(unitId, "grammar-dragfill", score, questions.length, startedAt, answersLog);

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
