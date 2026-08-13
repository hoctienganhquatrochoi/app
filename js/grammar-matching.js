var GRAMMAR_MATCHING_ADVANCE_DELAY_MS = 1200;

function renderGrammarMatching(container, breadcrumbText, items, unitId, setName, onTestComplete, progressOffset, progressTotal, scoreOffset) {
  var pairs, leftOrder, rightOrder, activeLeftId, assignments, submitted, score, answersLog, startedAt, timerIntervalId, tabTracker;

  function resetState() {
    pairs = shuffleArray(items).map(function (row) {
      return { id: row.id, left: row.left_text, right: row.right_text };
    });
    leftOrder = shuffleArray(pairs);
    rightOrder = shuffleArray(pairs);
    activeLeftId = null;
    assignments = {};
    submitted = false;
    score = 0;
    answersLog = [];
    startedAt = new Date();
    timerIntervalId = startActivityTimer(startedAt);
    tabTracker = startTabSwitchTracker();
  }

  function findPair(id) {
    var i;
    for (i = 0; i < pairs.length; i++) {
      if (pairs[i].id === id) {
        return pairs[i];
      }
    }
    return null;
  }

  function findLeftOwnerOfRight(rightId) {
    var keys = Object.keys(assignments);
    var i;
    for (i = 0; i < keys.length; i++) {
      if (assignments[keys[i]] === rightId) {
        return keys[i];
      }
    }
    return null;
  }

  function draw() {
    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "matching-wrap";
    wrap.appendChild(buildActivityHeader(startedAt, (scoreOffset || 0) + score));
    if (!onTestComplete && setName) {
      wrap.appendChild(buildSetNameBanner(setName));
    }

    var doneCount = Object.keys(assignments).length;
    var progress = document.createElement("div");
    progress.className = "quiz-progress-footer";
    progress.textContent = "Đã nối " + doneCount + " / " + pairs.length;
    wrap.appendChild(progress);

    var stage = document.createElement("div");
    stage.className = "matching-stage";

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "matching-lines");
    stage.appendChild(svg);

    var columns = document.createElement("div");
    columns.className = "matching-columns";

    var leftCol = document.createElement("div");
    leftCol.className = "matching-col";
    leftOrder.forEach(function (pair) {
      leftCol.appendChild(buildCard(pair, pair.left, "left"));
    });
    columns.appendChild(leftCol);

    var rightCol = document.createElement("div");
    rightCol.className = "matching-col";
    rightOrder.forEach(function (pair) {
      rightCol.appendChild(buildCard(pair, pair.right, "right"));
    });
    columns.appendChild(rightCol);

    stage.appendChild(columns);
    wrap.appendChild(stage);

    if (!submitted) {
      var submitBtn = document.createElement("button");
      submitBtn.type = "button";
      submitBtn.className = "quiz-continue-btn";
      submitBtn.textContent = "Nộp bài";
      submitBtn.disabled = doneCount < pairs.length;
      submitBtn.addEventListener("click", handleSubmit);
      wrap.appendChild(submitBtn);
    }

    container.appendChild(wrap);
    drawLines();
  }

  function buildCard(pair, text, side) {
    var card = document.createElement("button");
    card.type = "button";
    card.className = "matching-item";
    card.setAttribute("data-pair-id", pair.id);
    card.setAttribute("data-side", side);
    card.disabled = submitted;

    var isActive = side === "left" && pair.id === activeLeftId;
    var isLinked = side === "left" ? assignments[pair.id] !== undefined : findLeftOwnerOfRight(pair.id) !== null;

    if (submitted) {
      var isCorrect;
      if (side === "left") {
        isCorrect = assignments[pair.id] === pair.id;
      } else {
        var owner = findLeftOwnerOfRight(pair.id);
        isCorrect = owner === pair.id;
      }
      card.className += isCorrect ? " correct" : " wrong";
    } else if (isActive) {
      card.className += " active";
    } else if (isLinked) {
      card.className += " linked";
    }

    var label = document.createElement("span");
    label.textContent = text;
    card.appendChild(label);

    if (submitted) {
      var correctForIcon = side === "left" ? assignments[pair.id] === pair.id : findLeftOwnerOfRight(pair.id) === pair.id;
      card.appendChild(buildResultIcon(correctForIcon));
    }

    card.addEventListener("click", function () {
      handleCardClick(pair, side);
    });

    return card;
  }

  function handleCardClick(pair, side) {
    if (submitted) {
      return;
    }
    if (side === "left") {
      activeLeftId = activeLeftId === pair.id ? null : pair.id;
      draw();
      return;
    }
    if (activeLeftId === null) {
      var owner = findLeftOwnerOfRight(pair.id);
      if (owner) {
        delete assignments[owner];
      }
      draw();
      return;
    }
    Object.keys(assignments).forEach(function (leftId) {
      if (assignments[leftId] === pair.id) {
        delete assignments[leftId];
      }
    });
    assignments[activeLeftId] = pair.id;
    activeLeftId = null;
    draw();
  }

  function drawLines() {
    var stage = container.querySelector(".matching-stage");
    var svg = container.querySelector(".matching-lines");
    if (!stage || !svg) {
      return;
    }
    var stageRect = stage.getBoundingClientRect();
    svg.setAttribute("width", stageRect.width);
    svg.setAttribute("height", stageRect.height);
    svg.innerHTML = "";

    Object.keys(assignments).forEach(function (leftId) {
      var rightId = assignments[leftId];
      var leftEl = stage.querySelector('.matching-item[data-side="left"][data-pair-id="' + leftId + '"]');
      var rightEl = stage.querySelector('.matching-item[data-side="right"][data-pair-id="' + rightId + '"]');
      if (!leftEl || !rightEl) {
        return;
      }
      var lr = leftEl.getBoundingClientRect();
      var rr = rightEl.getBoundingClientRect();
      var x1 = lr.right - stageRect.left;
      var y1 = lr.top + lr.height / 2 - stageRect.top;
      var x2 = rr.left - stageRect.left;
      var y2 = rr.top + rr.height / 2 - stageRect.top;

      var color = "#4A90D2";
      if (submitted) {
        color = leftId === rightId ? "#2D6A4F" : "#E63946";
      }

      var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      line.setAttribute("stroke", color);
      line.setAttribute("stroke-width", "3");
      line.setAttribute("stroke-linecap", "round");
      svg.appendChild(line);
    });
  }

  function handleSubmit() {
    submitted = true;
    score = 0;
    answersLog = [];
    pairs.forEach(function (p) {
      var chosenRightId = assignments[p.id];
      var isCorrect = chosenRightId === p.id;
      if (isCorrect) {
        score++;
      }
      var chosenPair = findPair(chosenRightId);
      answersLog.push({
        vocab_id: p.id,
        word_en: p.left + " — " + p.right,
        selected_label: chosenPair ? chosenPair.right : "",
        is_correct: isCorrect
      });
    });
    draw();
    setTimeout(showResult, GRAMMAR_MATCHING_ADVANCE_DELAY_MS);
  }

  function onResize() {
    drawLines();
  }

  function showResult() {
    clearInterval(timerIntervalId);
    tabTracker.stop();
    window.removeEventListener("resize", onResize);
    if (onTestComplete) {
      onTestComplete(score, pairs.length, answersLog, tabTracker.getCount());
      return;
    }
    submitQuizAttempt(unitId, "grammar-matching", score, pairs.length, startedAt, answersLog, setName, tabTracker.getCount());

    container.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "quiz-wrap quiz-result";

    var title = document.createElement("h2");
    title.textContent = "Kết quả";
    wrap.appendChild(title);
    wrap.appendChild(buildResultMeta(breadcrumbText));

    var scoreBig = document.createElement("div");
    scoreBig.className = "score-big";
    scoreBig.textContent = score + " / " + pairs.length;
    wrap.appendChild(scoreBig);

    var p = document.createElement("p");
    p.textContent = score === pairs.length ? "Xuất sắc! Bạn nối đúng hết!" : "Cố lên, làm lại để nhớ thêm nhé!";
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
      window.addEventListener("resize", onResize);
      draw();
    });
    wrap.appendChild(retryBtn);

    container.appendChild(wrap);
  }

  resetState();
  window.addEventListener("resize", onResize);
  draw();
}
