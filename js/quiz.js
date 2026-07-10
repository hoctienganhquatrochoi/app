function buildQuizQuestions(items) {
  var shuffledItems = shuffleArray(items);
  var questions = [];
  var i, correct, distractors, options;
  for (i = 0; i < shuffledItems.length; i++) {
    correct = shuffledItems[i];
    distractors = pickRandomDistractors(items, correct, 3);
    options = shuffleArray([correct].concat(distractors));
    questions.push({ item: correct, options: options });
  }
  return questions;
}

function renderQuiz(container, breadcrumbText, items, unitId) {
  var questions = buildQuizQuestions(items);
  var qIndex = 0;
  var score = 0;
  var answered = false;
  var selectedWrongId = null;
  var answersLog = [];
  var startedAt = new Date();

  function draw() {
    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "quiz-wrap";

    var crumb = document.createElement("div");
    crumb.className = "breadcrumb";
    crumb.textContent = breadcrumbText;
    wrap.appendChild(crumb);

    var title = document.createElement("h2");
    title.textContent = "Quiz";
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

    var prompt = document.createElement("div");
    prompt.className = "quiz-prompt";

    var emoji = document.createElement("div");
    emoji.className = "quiz-emoji";
    emoji.textContent = q.item.emoji;
    prompt.appendChild(emoji);

    var qText = document.createElement("div");
    qText.className = "quiz-question-text";
    qText.textContent = "\"" + q.item.vi + "\" tiếng Anh là gì?";
    prompt.appendChild(qText);

    wrap.appendChild(prompt);

    var optionsEl = document.createElement("div");
    optionsEl.className = "quiz-options";

    var i;
    for (i = 0; i < q.options.length; i++) {
      optionsEl.appendChild(buildOption(q, q.options[i]));
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
          selectedWrongId = null;
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

  function buildOption(q, option) {
    var btn = document.createElement("button");
    btn.className = "quiz-option";
    btn.type = "button";

    var label = document.createElement("span");
    label.textContent = option.en;
    btn.appendChild(label);

    if (answered) {
      btn.disabled = true;
      btn.className += " disabled";
      if (option.id === q.item.id) {
        btn.className += " correct";
        btn.appendChild(buildResultIcon(true));
      } else if (option.id === selectedWrongId) {
        btn.className += " wrong";
        btn.appendChild(buildResultIcon(false));
      }
    }

    btn.addEventListener("click", function () {
      if (answered) {
        return;
      }
      answered = true;
      var isCorrect = option.id === q.item.id;
      if (isCorrect) {
        score++;
      } else {
        selectedWrongId = option.id;
      }
      answersLog.push({
        vocab_id: q.item.id,
        word_en: q.item.en,
        selected_label: option.en,
        is_correct: isCorrect
      });
      playAudioUrlOrSpeak(q.item.audioEnUrl, q.item.en, "en-US");
      draw();
    });

    return btn;
  }

  function showResult() {
    submitQuizAttempt(unitId, "quiz", score, questions.length, startedAt, answersLog);

    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "quiz-wrap quiz-result";

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
      questions = buildQuizQuestions(items);
      qIndex = 0;
      score = 0;
      answered = false;
      selectedWrongId = null;
      answersLog = [];
      startedAt = new Date();
      draw();
    });
    wrap.appendChild(retryBtn);

    container.appendChild(wrap);
  }

  draw();
}
