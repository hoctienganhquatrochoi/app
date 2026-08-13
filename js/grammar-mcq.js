var GRAMMAR_MCQ_ADVANCE_DELAY_MS = 1200;

function splitGrammarMcqQuestionAroundBracket(question) {
  question = question || "";
  var bracketRegex = /⟦([^⟦⟧]+)⟧|\[([^\[\]]+)\]/;
  var m = question.match(bracketRegex);
  if (m) {
    var bracketContent = m[1] !== undefined ? m[1] : m[2];
    return {
      before: question.slice(0, m.index),
      after: question.slice(m.index + m[0].length),
      blankLength: bracketContent.length
    };
  }
  var underscoreRunRegex = /_{3,}/;
  var u = question.match(underscoreRunRegex);
  if (u) {
    return {
      before: question.slice(0, u.index),
      after: question.slice(u.index + u[0].length),
      blankLength: u[0].length
    };
  }
  return null;
}

function buildGrammarMcqQuestions(items) {
  var hasPassage = items.some(function (row) { return row.passage; });
  var ordered = hasPassage ? items.slice() : shuffleArray(items);
  return ordered.map(function (row) {
    var wrongOptions = (row.wrong_answers || []).map(function (text) {
      return { text: text, isCorrect: false };
    });
    var options = shuffleArray([{ text: row.correct_answer, isCorrect: true }].concat(wrongOptions));
    return {
      id: row.id,
      question: row.question,
      bracketSplit: splitGrammarMcqQuestionAroundBracket(row.question),
      passage: row.passage,
      imageUrl: row.image_url,
      explanation: row.explanation,
      options: options,
      answered: false,
      selectedIndex: null
    };
  });
}

function buildPassageFillMap(q, questions) {
  var map = {};
  questions.forEach(function (other) {
    if (other.passage !== q.passage || !other.answered) {
      return;
    }
    var m = (other.question || "").match(/\((\d+)\)/);
    if (!m) {
      return;
    }
    var correctOption = null;
    for (var i = 0; i < other.options.length; i++) {
      if (other.options[i].isCorrect) {
        correctOption = other.options[i].text;
        break;
      }
    }
    if (correctOption) {
      map[m[1]] = correctOption;
    }
  });
  return map;
}

function renderPassageWithFills(passageEl, passageText, fillMap, currentBlankNum) {
  var regex = /\((\d+)\)_+/g;
  var lastIndex = 0;
  var m;
  while ((m = regex.exec(passageText))) {
    if (m.index > lastIndex) {
      passageEl.appendChild(document.createTextNode(passageText.slice(lastIndex, m.index)));
    }
    var num = m[1];
    if (fillMap[num]) {
      var filled = document.createElement("span");
      filled.className = "grammar-mcq-passage-filled";
      filled.textContent = fillMap[num];
      passageEl.appendChild(filled);
    } else {
      var blankSpan = document.createElement("span");
      blankSpan.className = "grammar-mcq-passage-blank" + (num === currentBlankNum ? " current" : "");
      blankSpan.textContent = "(" + num + ")_______";
      passageEl.appendChild(blankSpan);
    }
    lastIndex = regex.lastIndex;
  }
  passageEl.appendChild(document.createTextNode(passageText.slice(lastIndex)));
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
    wrap.appendChild(buildActivityHeader(startedAt, (scoreOffset || 0) + score));
    if (!onTestComplete && setName) {
      wrap.appendChild(buildSetNameBanner(setName));
    }

    var body = document.createElement("div");
    body.className = "quiz-body";

    if (q.passage) {
      var passageEl = document.createElement("div");
      passageEl.className = "grammar-mcq-passage";
      var curBlankMatch = (q.question || "").match(/\((\d+)\)/);
      var curBlankNum = curBlankMatch ? curBlankMatch[1] : null;
      renderPassageWithFills(passageEl, q.passage, buildPassageFillMap(q, questions), curBlankNum);
      body.appendChild(passageEl);
    }

    if (q.imageUrl) {
      var img = document.createElement("img");
      img.className = "grammar-mcq-image";
      img.src = q.imageUrl;
      body.appendChild(img);
    }

    if (q.question) {
      var prompt = document.createElement("div");
      prompt.className = "quiz-prompt grammar-mcq-question";
      if (q.bracketSplit) {
        prompt.appendChild(document.createTextNode(q.bracketSplit.before));
        var blank = document.createElement("span");
        var selectedOption = q.answered ? q.options[q.selectedIndex] : null;
        blank.className = "dragfill-blank" + (selectedOption ? " filled " + (selectedOption.isCorrect ? "correct" : "wrong") : "");
        if (selectedOption) {
          blank.textContent = q.bracketSplit.before.trim() === "" ? capitalizeFirst(selectedOption.text) : selectedOption.text;
        } else {
          var blankLen = Math.max(2, Math.min(q.bracketSplit.blankLength || 6, 8));
          blank.textContent = new Array(blankLen + 1).join("_");
        }
        prompt.appendChild(blank);
        prompt.appendChild(document.createTextNode(q.bracketSplit.after));
      } else {
        appendTextWithUnderline(prompt, q.question);
      }
      body.appendChild(prompt);
    }

    var optionsEl = document.createElement("div");
    optionsEl.className = "quiz-options";

    q.options.forEach(function (option, idx) {
      optionsEl.appendChild(buildOption(q, option, idx));
    });
    body.appendChild(optionsEl);

    if (q.answered && q.explanation) {
      var explanationBox = document.createElement("div");
      explanationBox.className = "grammar-mcq-explanation";
      explanationBox.textContent = "💡 " + q.explanation;
      body.appendChild(explanationBox);

      var continueBtn = document.createElement("button");
      continueBtn.className = "quiz-continue-btn";
      continueBtn.type = "button";
      continueBtn.textContent = "Tiếp tục →";
      continueBtn.addEventListener("click", advance);
      body.appendChild(continueBtn);
    }

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

  function advance() {
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

      if (!q.explanation) {
        setTimeout(advance, GRAMMAR_MCQ_ADVANCE_DELAY_MS);
      }
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
