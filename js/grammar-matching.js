var GRAMMAR_MATCHING_WRONG_FLASH_MS = 500;
var GRAMMAR_MATCHING_ADVANCE_DELAY_MS = 1000;
var MATCHING_COLOR_COUNT = 6;

function renderGrammarMatching(container, breadcrumbText, items, unitId, setName) {
  var pairs, leftOrder, rightOrder, selectedId, selectedSide, score, solvedCount, answersLog, startedAt, timerIntervalId, tabTracker;

  function resetState() {
    pairs = shuffleArray(items).map(function (row) {
      return { id: row.id, left: row.left_text, right: row.right_text, solved: false, hadWrongAttempt: false, solvedOrder: -1 };
    });
    leftOrder = shuffleArray(pairs);
    rightOrder = shuffleArray(pairs);
    selectedId = null;
    selectedSide = null;
    score = 0;
    solvedCount = 0;
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

  function draw() {
    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "matching-wrap";
    wrap.appendChild(buildActivityHeader(startedAt, score));

    var progress = document.createElement("div");
    progress.className = "quiz-progress-footer";
    progress.textContent = "Đã nối " + solvedCount + " / " + pairs.length;
    wrap.appendChild(progress);

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

    wrap.appendChild(columns);
    container.appendChild(wrap);
  }

  function buildCard(pair, text, side) {
    var card = document.createElement("button");
    card.type = "button";
    card.className = "matching-item";
    card.setAttribute("data-pair-id", pair.id);
    card.setAttribute("data-side", side);
    if (pair.solved) {
      card.className += " solved matching-color-" + (pair.solvedOrder % MATCHING_COLOR_COUNT);
      card.disabled = true;
    } else if (pair.id === selectedId && side === selectedSide) {
      card.className += " selected";
    }

    var label = document.createElement("span");
    label.textContent = text;
    card.appendChild(label);

    card.addEventListener("click", function () {
      handleCardClick(pair, side);
    });

    return card;
  }

  function handleCardClick(pair, side) {
    if (pair.solved) {
      return;
    }
    if (selectedId === null) {
      selectedId = pair.id;
      selectedSide = side;
      draw();
      return;
    }
    if (selectedSide === side) {
      selectedId = (selectedId === pair.id) ? null : pair.id;
      draw();
      return;
    }

    var otherId = selectedId;
    if (otherId === pair.id) {
      var solvedPair = findPair(pair.id);
      solvedPair.solved = true;
      solvedPair.solvedOrder = solvedCount;
      solvedCount++;
      if (!solvedPair.hadWrongAttempt) {
        score++;
      }
      answersLog.push({
        vocab_id: solvedPair.id,
        word_en: solvedPair.left + " — " + solvedPair.right,
        selected_label: solvedPair.right,
        is_correct: !solvedPair.hadWrongAttempt
      });
      selectedId = null;
      selectedSide = null;
      draw();
      if (solvedCount === pairs.length) {
        setTimeout(showResult, GRAMMAR_MATCHING_ADVANCE_DELAY_MS);
      }
    } else {
      findPair(otherId).hadWrongAttempt = true;
      findPair(pair.id).hadWrongAttempt = true;
      flashWrong(otherId, pair.id);
    }
  }

  function flashWrong(idA, idB) {
    var cards = container.querySelectorAll(".matching-item");
    cards.forEach(function (card) {
      var id = card.getAttribute("data-pair-id");
      if (id === idA || id === idB) {
        card.classList.add("wrong-flash");
      }
    });
    setTimeout(function () {
      selectedId = null;
      selectedSide = null;
      draw();
    }, GRAMMAR_MATCHING_WRONG_FLASH_MS);
  }

  function showResult() {
    clearInterval(timerIntervalId);
    tabTracker.stop();
    submitQuizAttempt(unitId, "grammar-matching", score, pairs.length, startedAt, answersLog, setName);

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
    p.textContent = score === pairs.length ? "Xuất sắc! Bạn nối đúng hết ngay lần đầu!" : "Cố lên, làm lại để nhớ thêm nhé!";
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
      draw();
    });
    wrap.appendChild(retryBtn);

    container.appendChild(wrap);
  }

  resetState();
  draw();
}
