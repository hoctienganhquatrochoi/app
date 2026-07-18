function renderFlashcard(container, breadcrumbText, items, highlightTarget) {
  var index = 0;
  var startedAt = new Date();
  var tabTracker = startTabSwitchTracker();
  items = shuffleArray(items);

  function draw() {
    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "fc-wrap";

    var progress = document.createElement("div");
    progress.className = "fc-progress";
    progress.textContent = "Thẻ " + (index + 1) + " / " + items.length;
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
      playAudioUrlOrSpeak(item.audioEnUrl, item.speechText || item.en, item.lang || "en-US");
    });
    card.appendChild(audioBtn);

    var hasVisual = !!(item.imageUrl || item.emoji);
    if (hasVisual) {
      card.appendChild(buildVisualElement(item, "fc-emoji"));
    }

    var line = document.createElement("div");
    line.className = "fc-word" + (hasVisual ? "" : " no-visual") + (item.vi ? "" : " viet-literacy-word");
    if (item.vi) {
      line.textContent = item.en + " " + (item.phonetic || "") + " - " + capitalizeFirst(item.vi);
    } else {
      appendTextWithHighlight(line, item.en, highlightTarget);
    }
    card.appendChild(line);

    var hint = document.createElement("div");
    hint.className = "fc-hint";
    hint.textContent = "Chạm vào thẻ để chuyển từ tiếp theo";
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

    playAudioUrlOrSpeak(item.audioEnUrl, item.speechText || item.en, item.lang || "en-US");
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
    p.textContent = "Bạn đã học xong " + items.length + " từ trong bài này.";
    popup.appendChild(p);

    popup.appendChild(buildDurationLine(startedAt));
    popup.appendChild(buildTabSwitchLine(tabTracker.getCount()));

    var actions = document.createElement("div");
    actions.className = "fc-popup-actions";

    var againBtn = document.createElement("button");
    againBtn.className = "btn-next";
    againBtn.type = "button";
    againBtn.textContent = "Học lại";
    againBtn.addEventListener("click", function () {
      items = shuffleArray(items);
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
    closeBtn.textContent = "Xem lại thẻ cuối";
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
