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

var DIALOGUE_SPEAKER_COLORS = ["#1D6FB8", "#D6336C", "#E8590C", "#7048E8", "#0CA678"];

function detectDialogueSpeakerColors(passage) {
  var names = [];
  (passage || "").split("\n").forEach(function (line) {
    var m = line.match(/^([A-Za-zÀ-ỹ0-9 .'-]{1,30}):\s?/);
    if (m && names.indexOf(m[1]) === -1) {
      names.push(m[1]);
    }
  });
  if (names.length < 2) {
    return null;
  }
  var map = {};
  names.forEach(function (name, i) {
    map[name] = DIALOGUE_SPEAKER_COLORS[i % DIALOGUE_SPEAKER_COLORS.length];
  });
  return map;
}

function isBlankAtSentenceStart(tokens, blankTokenIdx) {
  var acc = "";
  for (var i = blankTokenIdx - 1; i >= 0; i--) {
    if (tokens[i].type === "blank") {
      break;
    }
    acc = tokens[i].value + acc;
  }
  var lastLine = acc.split("\n").pop();
  var stripped = lastLine.replace(/^[A-Za-zÀ-ỹ0-9 .'-]{1,30}:\s?/, "");
  return stripped.trim() === "";
}

function appendPassageTextWithSpeakerColors(parent, text, speakerColors) {
  if (!speakerColors) {
    parent.appendChild(document.createTextNode(text));
    return;
  }
  var lines = text.split("\n");
  lines.forEach(function (line, i) {
    if (i > 0) {
      parent.appendChild(document.createElement("br"));
    }
    var m = line.match(/^([A-Za-zÀ-ỹ0-9 .'-]{1,30}):(\s?)/);
    if (m && speakerColors[m[1]]) {
      var nameSpan = document.createElement("span");
      nameSpan.style.color = speakerColors[m[1]];
      nameSpan.textContent = m[1] + ":";
      parent.appendChild(nameSpan);
      parent.appendChild(document.createTextNode(m[2] + line.slice(m[0].length)));
    } else {
      parent.appendChild(document.createTextNode(line));
    }
  });
}

function buildMathDragfillQuestions(items, activityType) {
  return shuffleArray(items).map(function (row) {
    var split = splitMathPassageAroundBlanks(row.passage);
    var wrongAnswers = row.wrong_answers || [];
    var options = shuffleArray(split.answers.concat(wrongAnswers)).map(function (text) {
      return { text: text, used: false };
    });
    return {
      id: row.id,
      passage: row.passage,
      speakerColors: activityType === "text-dragfill" ? detectDialogueSpeakerColors(row.passage) : null,
      tokens: split.tokens,
      answers: split.answers,
      options: options,
      filledByBlank: split.answers.map(function () { return null; }),
      selectedBlankIndex: null,
      answered: false,
      lastCorrect: false,
      firstAttemptScored: false
    };
  });
}

function renderMathDragfill(container, breadcrumbText, items, unitId, setName, activityType, onTestComplete, progressOffset, progressTotal, scoreOffset) {
  activityType = activityType || "math-dragfill";
  var questions, qIndex, score, totalBlanks, answersLog, startedAt, timerIntervalId, tabTracker, currentWrap, advanceTimeoutId;
  var freeNav = !!onTestComplete;

  function resetState() {
    questions = buildMathDragfillQuestions(items, activityType);
    totalBlanks = questions.reduce(function (sum, q) { return sum + q.answers.length; }, 0);
    qIndex = 0;
    score = 0;
    answersLog = [];
    startedAt = new Date();
    timerIntervalId = startActivityTimer(startedAt);
    tabTracker = startTabSwitchTracker();
  }

  function resetQuestionState(q) {
    q.filledByBlank = q.answers.map(function () { return null; });
    q.selectedBlankIndex = null;
    q.options.forEach(function (o) { o.used = false; });
    q.answered = false;
    q.lastCorrect = false;
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
    } else if (allBlanksFilled(q)) {
      submitAnswer();
    }
  }
  document.addEventListener("keydown", handleGlobalKeydown);

  function allBlanksFilled(q) {
    return q.filledByBlank.every(function (o) { return o !== null; });
  }

  function handleTileClick(q, option) {
    if (q.answered || option.used) {
      return;
    }
    var targetIndex = (q.selectedBlankIndex !== null && q.selectedBlankIndex !== undefined && q.filledByBlank[q.selectedBlankIndex] === null)
      ? q.selectedBlankIndex
      : q.filledByBlank.indexOf(null);
    if (targetIndex === -1) {
      return;
    }
    option.used = true;
    q.filledByBlank[targetIndex] = option;
    q.selectedBlankIndex = null;
    draw();
  }

  function handleBlankClick(q, blankIndex) {
    if (q.answered) {
      return;
    }
    if (q.filledByBlank[blankIndex]) {
      q.filledByBlank[blankIndex].used = false;
      q.filledByBlank[blankIndex] = null;
      q.selectedBlankIndex = null;
    } else {
      q.selectedBlankIndex = (q.selectedBlankIndex === blankIndex) ? null : blankIndex;
    }
    draw();
  }

  function draw() {
    container.innerHTML = "";
    var q = questions[qIndex];

    var wrap = document.createElement("div");
    wrap.className = "dragfill-wrap dragfill-wrap-wide";
    wrap.appendChild(buildActivityHeader(startedAt, (scoreOffset || 0) + score));
    if (!onTestComplete && setName) {
      wrap.appendChild(buildSetNameBanner(setName));
    }

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

    var passageEl = document.createElement("div");
    passageEl.className = "dragfill-question mathfill-passage";
    q.tokens.forEach(function (token, tokenIdx) {
      if (token.type === "text") {
        appendPassageTextWithSpeakerColors(passageEl, token.value, q.speakerColors);
        return;
      }
      var filled = q.filledByBlank[token.index];
      var blank = document.createElement("span");
      blank.className = "dragfill-blank" + (filled ? " filled" : "") + (!filled && q.selectedBlankIndex === token.index ? " targeted" : "");
      if (q.answered) {
        var isBlankCorrect = filled && filled.text === q.answers[token.index];
        blank.className += isBlankCorrect ? " correct" : " wrong";
      }
      if (filled) {
        blank.textContent = isBlankAtSentenceStart(q.tokens, tokenIdx) ? capitalizeFirst(filled.text) : filled.text;
      } else {
        blank.textContent = "______";
      }
      if (!q.answered) {
        blank.addEventListener("click", function () {
          handleBlankClick(q, token.index);
        });
      }
      passageEl.appendChild(blank);
    });
    wrap.appendChild(passageEl);

    if (q.answered) {
      var icon = document.createElement("div");
      icon.className = "dragfill-feedback-icon " + (q.lastCorrect ? "dragfill-correct-icon" : "dragfill-wrong-icon");
      icon.textContent = q.lastCorrect ? "✓" : "✗";
      wrap.appendChild(icon);

      if (!q.lastCorrect) {
        var hint = document.createElement("div");
        hint.className = "dragfill-hint";
        hint.textContent = "Đáp án đúng: " + q.answers.join(", ") + (freeNav ? "" : " — thử lại nhé!");
        wrap.appendChild(hint);
      }
    }

    if (!q.answered) {
      var checkBtn = document.createElement("button");
      checkBtn.className = "quiz-continue-btn";
      checkBtn.type = "button";
      checkBtn.textContent = "Kiểm tra";
      checkBtn.disabled = !allBlanksFilled(q);
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

  function submitAnswer() {
    var q = questions[qIndex];
    if (q.answered || !allBlanksFilled(q)) {
      return;
    }
    q.answered = true;
    var correctCount = q.filledByBlank.filter(function (option, idx) {
      return option.text === q.answers[idx];
    }).length;
    q.lastCorrect = correctCount === q.answers.length;
    if (!q.firstAttemptScored) {
      q.firstAttemptScored = true;
      score += correctCount;
      answersLog.push({
        vocab_id: q.id,
        word_en: q.passage,
        selected_label: q.filledByBlank.map(function (o) { return o.text; }).join(", "),
        is_correct: q.lastCorrect
      });
    }
    draw();

    if (freeNav) {
      advanceTimeoutId = setTimeout(goNext, MATH_DRAGFILL_CORRECT_DELAY_MS);
    } else if (q.lastCorrect) {
      advanceTimeoutId = setTimeout(goNext, MATH_DRAGFILL_CORRECT_DELAY_MS);
    } else {
      advanceTimeoutId = setTimeout(function () { resetQuestionState(q); draw(); }, MATH_DRAGFILL_CORRECT_DELAY_MS);
    }
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
      onTestComplete(score, totalBlanks, answersLog, tabTracker.getCount());
      return;
    }
    submitQuizAttempt(unitId, activityType, score, totalBlanks, startedAt, answersLog, setName, tabTracker.getCount());

    container.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "quiz-wrap quiz-result";

    var title = document.createElement("h2");
    title.textContent = "Kết quả";
    wrap.appendChild(title);
    wrap.appendChild(buildResultMeta(breadcrumbText));

    var scoreBig = document.createElement("div");
    scoreBig.className = "score-big";
    scoreBig.textContent = score + " / " + totalBlanks;
    wrap.appendChild(scoreBig);

    var p = document.createElement("p");
    p.textContent = score === totalBlanks ? "Xuất sắc! Bạn trả lời đúng hết!" : "Cố lên, làm lại để nhớ thêm nhé!";
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
