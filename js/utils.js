function speak(text, lang) {
  if (!("speechSynthesis" in window)) {
    return;
  }
  window.speechSynthesis.cancel();
  var utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  window.speechSynthesis.speak(utter);
}

function playAudioUrlOrSpeak(url, text, lang) {
  if (url) {
    var audio = new Audio(url);
    audio.play();
    return;
  }
  speak(text, lang);
}

function shuffleArray(arr) {
  var copy = arr.slice();
  var i, j, tmp;
  for (i = copy.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function buildResultIcon(isCorrect) {
  var icon = document.createElement("span");
  icon.className = "option-icon " + (isCorrect ? "option-icon-correct" : "option-icon-wrong");
  icon.textContent = isCorrect ? "✓" : "✗";
  return icon;
}

function pickRandomDistractors(pool, correctItem, count) {
  var candidates = [];
  var i;
  for (i = 0; i < pool.length; i++) {
    if (pool[i].id !== correctItem.id) {
      candidates.push(pool[i]);
    }
  }
  candidates = shuffleArray(candidates);
  return candidates.slice(0, count);
}

function buildVisualElement(item, sizeClass) {
  if (item.imageUrl) {
    var img = document.createElement("img");
    img.src = item.imageUrl;
    img.alt = item.en;
    img.className = "vocab-image" + (sizeClass ? " " + sizeClass : "");
    return img;
  }
  var span = document.createElement("span");
  span.className = "vocab-emoji" + (sizeClass ? " " + sizeClass : "");
  span.textContent = item.emoji;
  return span;
}

function pickQuestionPool(items, maxQuestions) {
  if (!maxQuestions || items.length <= maxQuestions) {
    return shuffleArray(items);
  }
  return shuffleArray(items).slice(0, maxQuestions);
}
