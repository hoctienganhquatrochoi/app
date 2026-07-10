function pickRandomLetters(excludeLetter, count) {
  var alphabet = "abcdefghijklmnopqrstuvwxyz";
  var pool = [];
  var i;
  for (i = 0; i < alphabet.length; i++) {
    if (alphabet[i] !== excludeLetter) {
      pool.push(alphabet[i]);
    }
  }
  pool = shuffleArray(pool);
  return pool.slice(0, count);
}

function buildMissingLetterQuestion(item) {
  var word = item.en;
  var letterIndexes = [];
  var i;
  for (i = 0; i < word.length; i++) {
    if (/[a-zA-Z]/.test(word[i])) {
      letterIndexes.push(i);
    }
  }
  var hiddenIndex = letterIndexes[Math.floor(Math.random() * letterIndexes.length)];
  var correctLetter = word[hiddenIndex].toLowerCase();

  var maskedWord = "";
  for (i = 0; i < word.length; i++) {
    maskedWord += i === hiddenIndex ? "_" : word[i];
  }

  var distractors = pickRandomLetters(correctLetter, 3);
  var options = shuffleArray([correctLetter].concat(distractors));

  return { item: item, maskedWord: maskedWord, correctLetter: correctLetter, options: options };
}

function buildMissingLetterQuestions(items, maxQuestions) {
  var pool = pickQuestionPool(items, maxQuestions);
  var questions = [];
  var i;
  for (i = 0; i < pool.length; i++) {
    questions.push(buildMissingLetterQuestion(pool[i]));
  }
  return questions;
}

function renderMissingLetter(container, breadcrumbText, items, unitId, maxQuestions) {
  var questions = buildMissingLetterQuestions(items, maxQuestions);
  var qIndex = 0;
  var score = 0;
  var answered = false;
  var selectedWrongLetter = null;
  var answersLog = [];
  var startedAt = new Date();

  function draw() {
    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "ml-wrap";

    var crumb = document.createElement("div");
    crumb.className = "breadcrumb";
    crumb.textContent = breadcrumbText;
    wrap.appendChild(crumb);

    var title = document.createElement("h2");
    title.textContent = "Khuyết chữ cái";
    wrap.appendChild(title);

    var header = document.createElement("div");
    header.className = "quiz-header";

    var counter = document.createElement("span");
    counter.textContent = "Câu " + (qIndex + 1) + " / " + questions.length;
    header.appendChild(counter);

    var scoreEl = document.createElement("span");
    scoreEl.textContent = "Đúng: " + score;
    header.appendChild(scoreEl);

    wrap.appendChild(header);

    var q = questions[qIndex];

    var card = document.createElement("div");
    card.className = "ml-card";

    card.appendChild(buildVisualElement(q.item, "ml-emoji"));

    var meaning = document.createElement("div");
    meaning.className = "ml-meaning";
    meaning.textContent = q.item.vi;
    card.appendChild(meaning);

    var audioBtn = document.createElement("button");
    audioBtn.className = "audio-btn";
    audioBtn.type = "button";
    audioBtn.textContent = "▶";
    audioBtn.addEventListener("click", function () {
      playAudioUrlOrSpeak(q.item.audioEnUrl, q.item.en, "en-US");
    });
    card.appendChild(audioBtn);

    var maskedEl = document.createElement("div");
    maskedEl.className = "ml-masked-word";
    maskedEl.textContent = q.maskedWord.toLowerCase();
    card.appendChild(maskedEl);

    wrap.appendChild(card);

    var optionsEl = document.createElement("div");
    optionsEl.className = "ml-options";

    var i;
    for (i = 0; i < q.options.length; i++) {
      optionsEl.appendChild(buildLetterOption(q, q.options[i]));
    }
    wrap.appendChild(optionsEl);

    if (answered) {
      var continueWrap = document.createElement("div");
      continueWrap.className = "quiz-continue-wrap";

      var continueBtn = document.createElement("button");
      continueBtn.className = "quiz-continue-btn";
      continueBtn.type = "button";
      continueBtn.textContent = qIndex === questions.length - 1 ? "Xem kết quả" : "Câu tiếp theo →";
      continueBtn.addEventListener("click", function () {
        if (qIndex < questions.length - 1) {
          qIndex++;
          answered = false;
          selectedWrongLetter = null;
          draw();
        } else {
          showResult();
        }
      });
      continueWrap.appendChild(continueBtn);
      wrap.appendChild(continueWrap);
    }

    container.appendChild(wrap);
  }

  function buildLetterOption(q, letter) {
    var btn = document.createElement("button");
    btn.className = "ml-option";
    btn.type = "button";

    var label = document.createElement("span");
    label.textContent = letter;
    btn.appendChild(label);

    if (answered) {
      btn.disabled = true;
      btn.className += " disabled";
      if (letter === q.correctLetter) {
        btn.className += " correct";
        btn.appendChild(buildResultIcon(true));
      } else if (letter === selectedWrongLetter) {
        btn.className += " wrong";
        btn.appendChild(buildResultIcon(false));
      }
    }

    btn.addEventListener("click", function () {
      if (answered) {
        return;
      }
      answered = true;
      var isCorrect = letter === q.correctLetter;
      if (isCorrect) {
        score++;
      } else {
        selectedWrongLetter = letter;
      }
      answersLog.push({
        vocab_id: q.item.id,
        word_en: q.item.en,
        selected_label: letter,
        is_correct: isCorrect
      });
      draw();
    });

    return btn;
  }

  function showResult() {
    submitQuizAttempt(unitId, "missing-letter", score, questions.length, startedAt, answersLog);

    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "ml-wrap quiz-result";

    var crumb = document.createElement("div");
    crumb.className = "breadcrumb";
    crumb.textContent = breadcrumbText;
    wrap.appendChild(crumb);

    var title = document.createElement("h2");
    title.textContent = "Kết quả";
    wrap.appendChild(title);

    var scoreBig = document.createElement("div");
    scoreBig.className = "score-big";
    scoreBig.textContent = score + " / " + questions.length;
    wrap.appendChild(scoreBig);

    var p = document.createElement("p");
    p.textContent = score === questions.length ? "Xuất sắc! Bé trả lời đúng hết!" : "Cố lên, làm lại để nhớ thêm nhé!";
    wrap.appendChild(p);

    var retryBtn = document.createElement("button");
    retryBtn.className = "quiz-continue-btn";
    retryBtn.type = "button";
    retryBtn.textContent = "Làm lại";
    retryBtn.addEventListener("click", function () {
      questions = buildMissingLetterQuestions(items, maxQuestions);
      qIndex = 0;
      score = 0;
      answered = false;
      selectedWrongLetter = null;
      answersLog = [];
      startedAt = new Date();
      draw();
    });
    wrap.appendChild(retryBtn);

    container.appendChild(wrap);
  }

  draw();
}
