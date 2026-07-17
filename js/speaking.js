function renderSpeakingTestPicker(container, breadcrumbText, unitId, testNames) {
  container.innerHTML = "";

  var wrap = document.createElement("div");
  wrap.className = "fc-wrap";

  var title = document.createElement("div");
  title.className = "fc-progress";
  title.textContent = "Chọn đề để luyện nói";
  wrap.appendChild(title);

  var list = document.createElement("div");
  list.className = "speaking-test-list";

  testNames.forEach(function (name) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "speaking-test-card";
    btn.textContent = name;
    btn.addEventListener("click", async function () {
      var items = await loadSpeakingForUnit(unitId, name);
      renderSpeaking(container, breadcrumbText, items, function () {
        renderSpeakingTestPicker(container, breadcrumbText, unitId, testNames);
      });
    });
    list.appendChild(btn);
  });

  wrap.appendChild(list);
  container.appendChild(wrap);
}

function renderSpeaking(container, breadcrumbText, items, onBack) {
  var index = 0;
  var startedAt = new Date();
  var tabTracker = startTabSwitchTracker();

  function draw() {
    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "fc-wrap";

    if (onBack) {
      var backBtn = document.createElement("button");
      backBtn.type = "button";
      backBtn.className = "speaking-back-btn";
      backBtn.textContent = "← Chọn đề khác";
      backBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        onBack();
      });
      wrap.appendChild(backBtn);
    }

    var progress = document.createElement("div");
    progress.className = "fc-progress";
    progress.textContent = "Câu " + (index + 1) + " / " + items.length;
    wrap.appendChild(progress);

    var item = items[index];

    var card = document.createElement("div");
    card.className = "fc-card";

    var audioBtn = document.createElement("button");
    audioBtn.className = "audio-btn fc-audio-btn";
    audioBtn.type = "button";
    audioBtn.textContent = "▶";
    audioBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      playAudioUrlOrSpeak(item.audioQuestionUrl, item.question, "en-US");
    });
    card.appendChild(audioBtn);

    var hasVisual = !!item.imageUrl;
    if (hasVisual) {
      card.appendChild(buildVisualElement({ imageUrl: item.imageUrl, emoji: "" }, "fc-emoji"));
    }

    var line = document.createElement("div");
    line.className = "fc-word" + (hasVisual ? "" : " no-visual");
    line.textContent = item.answer;
    card.appendChild(line);

    var hint = document.createElement("div");
    hint.className = "fc-hint";
    hint.textContent = "Nghe câu hỏi rồi tập trả lời to lên nhé!";
    card.appendChild(hint);

    card.addEventListener("click", function () {
      goNext();
    });

    wrap.appendChild(card);

    var nav = document.createElement("div");
    nav.className = "fc-nav";

    var prevBtn = document.createElement("button");
    prevBtn.className = "btn-prev";
    prevBtn.type = "button";
    prevBtn.textContent = "← Trước";
    prevBtn.disabled = index === 0;
    prevBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (index > 0) {
        index--;
        draw();
      }
    });
    nav.appendChild(prevBtn);

    wrap.appendChild(nav);
    container.appendChild(wrap);

    playAudioUrlOrSpeak(item.audioQuestionUrl, item.question, "en-US");
  }

  function goNext() {
    if (index < items.length - 1) {
      index++;
      draw();
    } else {
      showComplete();
    }
  }

  function showComplete() {
    tabTracker.stop();

    var overlay = document.createElement("div");
    overlay.className = "fc-overlay";

    var popup = document.createElement("div");
    popup.className = "fc-popup";

    var h3 = document.createElement("h3");
    h3.textContent = "🎉 Hoàn thành!";
    popup.appendChild(h3);
    popup.appendChild(buildResultMeta(breadcrumbText));

    var p = document.createElement("p");
    p.textContent = "Bạn đã luyện xong " + items.length + " câu trong bài này.";
    popup.appendChild(p);

    popup.appendChild(buildDurationLine(startedAt));
    popup.appendChild(buildTabSwitchLine(tabTracker.getCount()));

    var actions = document.createElement("div");
    actions.className = "fc-popup-actions";

    var againBtn = document.createElement("button");
    againBtn.className = "btn-next";
    againBtn.type = "button";
    againBtn.textContent = "Luyện lại";
    againBtn.addEventListener("click", function () {
      index = 0;
      startedAt = new Date();
      tabTracker = startTabSwitchTracker();
      overlay.remove();
      draw();
    });
    actions.appendChild(againBtn);

    var closeBtn = document.createElement("button");
    closeBtn.className = "btn-prev";
    closeBtn.type = "button";
    closeBtn.textContent = "Xem lại câu cuối";
    closeBtn.addEventListener("click", function () {
      overlay.remove();
    });
    actions.appendChild(closeBtn);

    popup.appendChild(actions);
    overlay.appendChild(popup);
    container.appendChild(overlay);
  }

  draw();
}
