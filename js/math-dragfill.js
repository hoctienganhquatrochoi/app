var MATH_DRAGFILL_CORRECT_DELAY_MS = 1200;

function splitMathPassageAroundBlanks(rawPassage) {
  var tokens = [];
  var answers = [];
  var re = /⟦([^⟦⟧]+)⟧|\[([^\[\]]+)\]/g;
  var lastIndex = 0;
  var match;
  var blankIndex = 0;
  while ((match = re.exec(rawPassage)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: rawPassage.slice(lastIndex, match.index) });
    }
    tokens.push({ type: "blank", index: blankIndex });
    answers.push((match[1] || match[2]).trim());
    blankIndex++;
    lastIndex = re.lastIndex;
  }
  if (lastIndex < rawPassage.length) {
    tokens.push({ type: "text", value: rawPassage.slice(lastIndex) });
  }
  return { tokens: tokens, answers: answers };
}

function buildMathDragfillQuestions(items) {
  return shuffleArray(items).map(function (row) {
    var split = splitMathPassageAroundBlanks(row.passage);
    var wrongAnswers = row.wrong_answers || [];
    var options = shuffleArray(split.answers.concat(wrongAnswers)).map(function (text) {
      return { text: text, used: false };
    });
    return {
      id: row.id,
      passage: row.passage,
      tokens: split.tokens,
      answers: split.answers,
      options: options
    };
  });
}

function renderMathDragfill(container, breadcrumbText, items, unitId, setName, activityType, onTestComplete) {
  activityType = activityType || "math-dragfill";
  var questions, qIndex, score, filledByBlank, answered, lastCorrect, firstAttemptDone, answersLog, startedAt, timerIntervalId, tabTracker, currentWrap, advanceTimeoutId;

  function resetState() {
    questions = buildMathDragfillQuestions(items);
    qIndex = 0;
    score = 0;
    resetQuestionState();
    answersLog = [];
    startedAt = new Date();
    timerIntervalId = startActivityTimer(startedAt);
    tabTracker = startTabSwitchTracker();
  }

  function resetQuestionState() {
    var q = questions[qIndex];
    filledByBlank = q.answers.map(function () { return null; });
    q.options.forEach(function (o) { o.used = false; });
    answered = false;
    lastCorrect = false;
    firstAttemptDone = false;
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
        clearTimeout(advanceTimeoutId);
        goNext();
      }
    } else if (allBlanksFilled()) {
      submitAnswer();
    }
  }
  document.addEventListener("keydown", handleGlobalKeydown);

  function allBlanksFilled() {
    return filledByBlank.every(function (o) { return o !== null; });
  }

  function handleTileClick(option) {
    if (answered || option.used) {
      return;
    }
    var nextEmptyIndex = filledByBlank.indexOf(null);
    if (nextEmptyIndex === -1) {
      return;
    }
    option.used = true;
    filledByBlank[nextEmptyIndex] = option;
    draw();
  }

  function handleBlankClick(blankIndex) {
    if (answered || !filledByBlank[blankIndex]) {
      return;
    }
    filledByBlank[blankIndex].used = false;
    filledByBlank[blankIndex] = null;
    draw();
  }

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

    var passageEl = document.createElement("div");
    passageEl.className = "dragfill-question mathfill-passage";
    q.tokens.forEach(function (token) {
      if (token.type === "text") {
        passageEl.appendChild(document.createTextNode(token.value));
        return;
      }
      var filled = filledByBlank[token.index];
      var blank = document.createElement("span");
      blank.className = "dragfill-blank" + (filled ? " filled" : "");
      if (answered) {
        var isBlankCorrect = filled && filled.text === q.answers[token.index];
        blank.className += isBlankCorrect ? " correct" : " wrong";
      }
      blank.textContent = filled ? filled.text : "___";
      if (filled && !answered) {
        blank.addEventListener("click", function () {
          handleBlankClick(token.index);
        });
      }
      passageEl.appendChild(blank);
    });
    wrap.appendChild(passageEl);

    if (answered) {
      var icon = document.createElement("div");
      icon.className = "dragfill-feedback-icon " + (lastCorrect ? "dragfill-correct-icon" : "dragfill-wrong-icon");
      icon.textContent = lastCorrect ? "✓" : "✗";
      wrap.appendChild(icon);

      if (!lastCorrect) {
        var hint = document.createElement("div");
        hint.className = "dragfill-hint";
        hint.textContent = "Đáp án đúng: " + q.answers.join(", ") + " — thử lại nhé!";
        wrap.appendChild(hint);
      }
    }

    if (!answered) {
      var checkBtn = document.createElement("button");
      checkBtn.className = "quiz-continue-btn";
      checkBtn.type = "button";
      checkBtn.textContent = "Kiểm tra";
      checkBtn.disabled = !allBlanksFilled();
      checkBtn.addEventListener("click", function () {
        submitAnswer();
      });
      wrap.appendChild(checkBtn);
    } else if (lastCorrect) {
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

    wrap.appendChild(buildProgressFooter(qIndex + 1, questions.length));
    container.appendChild(wrap);
    currentWrap = wrap;
  }

  function submitAnswer() {
    if (answered || !allBlanksFilled()) {
      return;
    }
    var q = questions[qIndex];
    answered = true;
    lastCorrect = filledByBlank.every(function (option, idx) {
      return option.text === q.answers[idx];
    });
    if (!firstAttemptDone) {
      firstAttemptDone = true;
      if (lastCorrect) {
        score++;
      }
      answersLog.push({
        vocab_id: q.id,
        word_en: q.passage,
        selected_label: filledByBlank.map(function (o) { return o.text; }).join(", "),
        is_correct: lastCorrect
      });
    }
    draw();

    if (lastCorrect) {
      advanceTimeoutId = setTimeout(goNext, MATH_DRAGFILL_CORRECT_DELAY_MS);
    } else {
      advanceTimeoutId = setTimeout(retry, MATH_DRAGFILL_CORRECT_DELAY_MS);
    }
  }

  function retry() {
    resetQuestionState();
    draw();
  }

  function goNext() {
    if (qIndex < questions.length - 1) {
      qIndex++;
      resetQuestionState();
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
      onTestComplete(score, questions.length, answersLog);
      return;
    }
    submitQuizAttempt(unitId, activityType, score, questions.length, startedAt, answersLog, setName, tabTracker.getCount());

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
