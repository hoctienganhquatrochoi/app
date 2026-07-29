var MODES = {};
var currentMode = null;

var CLOUD_PATH_D = "M537.6 226.6c4.1-10.7 6.4-22.4 6.4-34.6 0-53-43-96-96-96-19.7 0-38.1 6-53.3 16.1C367.2 64.2 315.8 32 256 32c-88.4 0-160 71.6-160 160 0 2.7.1 5.4.2 8.1C40.2 219.8 0 273.2 0 336c0 79.5 64.5 144 144 144h368c70.7 0 128-57.3 128-128 0-61.9-44-113.6-102.4-125.4z";
var SVG_NS = "http://www.w3.org/2000/svg";

function renderModeTabs() {
  var tabsEl = document.getElementById("modeTabs");
  tabsEl.innerHTML = "";
  Object.keys(MODES).forEach(function (key) {
    var tab = document.createElement("button");
    tab.className = "mode-tab cloud-tab";
    tab.type = "button";
    tab.setAttribute("data-mode", key);

    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 640 512");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.classList.add("cloud-tab-bg");
    var path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", CLOUD_PATH_D);
    svg.appendChild(path);
    tab.appendChild(svg);

    var content = document.createElement("span");
    content.className = "cloud-tab-content";

    var badge = document.createElement("span");
    badge.className = "mode-tab-badge";
    badge.textContent = MODES[key].icon || "⭐";
    content.appendChild(badge);

    var labelSpan = document.createElement("span");
    labelSpan.textContent = MODES[key].label;
    content.appendChild(labelSpan);

    tab.appendChild(content);

    tab.addEventListener("click", function () { selectMode(key); });
    tabsEl.appendChild(tab);
  });
}

function renderNumberPicker(mode) {
  var picker = document.getElementById("numberPicker");
  picker.innerHTML = "";
  var range = MODES[mode].range;
  for (var n = range[0]; n <= range[1]; n++) {
    (function (num) {
      var btn = document.createElement("button");
      btn.className = "number-pill";
      btn.type = "button";
      btn.textContent = num;
      btn.addEventListener("click", function () {
        var pills = picker.querySelectorAll(".number-pill");
        for (var i = 0; i < pills.length; i++) { pills[i].classList.remove("active"); }
        btn.classList.add("active");
        MODES[mode].onSelect(num, document.getElementById("content"));
      });
      picker.appendChild(btn);
    })(n);
  }
}

function selectMode(mode) {
  currentMode = mode;
  document.body.setAttribute("data-mode", mode);
  var tabs = document.querySelectorAll(".mode-tab");
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle("active", tabs[i].getAttribute("data-mode") === mode);
  }
  renderNumberPicker(mode);
  document.getElementById("content").innerHTML = '<div class="content-placeholder">Chọn một số ở trên để bắt đầu nhé!</div>';
}

var appInitialized = false;

function showApp() {
  document.getElementById("appMain").style.display = "";
  document.getElementById("lockedNotice").style.display = "none";
  if (!appInitialized) {
    renderModeTabs();
    selectMode("hocso");
    appInitialized = true;
  }
}

function showLocked() {
  document.getElementById("appMain").style.display = "none";
  document.getElementById("lockedNotice").style.display = "";
}

function onAuthChanged() {
  if (currentStudent) {
    showApp();
  } else {
    showLocked();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  onAuthChanged();
});
