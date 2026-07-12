function findUnitById(unitId) {
  var c, s, u;
  for (c = 0; c < DATA.classes.length; c++) {
    var subjects = DATA.subjectsByClass[DATA.classes[c].id] || [];
    for (s = 0; s < subjects.length; s++) {
      for (u = 0; u < subjects[s].units.length; u++) {
        if (subjects[s].units[u].id === unitId) {
          return subjects[s].units[u];
        }
      }
    }
  }
  return null;
}

function orderActivities(activities, orderIds) {
  if (!orderIds || !orderIds.length) {
    return activities.slice();
  }
  var byId = {};
  activities.forEach(function (a) {
    byId[a.id] = a;
  });
  var ordered = [];
  orderIds.forEach(function (id) {
    if (byId[id]) {
      ordered.push(byId[id]);
      delete byId[id];
    }
  });
  activities.forEach(function (a) {
    if (byId[a.id]) {
      ordered.push(a);
    }
  });
  return ordered;
}

var currentToggleActivities = [];
var currentToggleUnitId = null;

async function loadActivityToggles() {
  var unitId = document.getElementById("unitSelect").value;
  var listEl = document.getElementById("activityTogglesList");
  listEl.textContent = "Đang tải...";

  var unit = findUnitById(unitId);
  if (!unit) {
    listEl.textContent = "";
    return;
  }

  var result = await supabaseClient
    .from("game_unit_settings")
    .select("disabled_activity_ids, activity_order")
    .eq("unit_id", unitId)
    .maybeSingle();

  var orderIds = result.data ? result.data.activity_order : null;

  currentToggleUnitId = unitId;
  currentToggleActivities = orderActivities(unit.activities, orderIds);

  var disabledIds = result.data
    ? (result.data.disabled_activity_ids || [])
    : currentToggleActivities.map(function (a) { return a.id; });

  renderActivityToggles(disabledIds);
}

function renderActivityToggles(disabledIds) {
  var listEl = document.getElementById("activityTogglesList");
  listEl.innerHTML = "";

  currentToggleActivities.forEach(function (activity, idx) {
    var row = document.createElement("div");
    row.className = "admin-toggle-item";

    var label = document.createElement("label");
    label.className = "admin-toggle-item-label";

    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = disabledIds.indexOf(activity.id) === -1;
    checkbox.addEventListener("change", handleToggleChange);
    label.appendChild(checkbox);

    var text = document.createElement("span");
    text.textContent = activity.name;
    label.appendChild(text);

    row.appendChild(label);

    var moveWrap = document.createElement("span");
    moveWrap.className = "admin-toggle-move";

    var upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.className = "admin-btn-secondary";
    upBtn.textContent = "↑";
    upBtn.disabled = idx === 0;
    upBtn.addEventListener("click", function () {
      moveActivity(idx, -1);
    });
    moveWrap.appendChild(upBtn);

    var downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.className = "admin-btn-secondary";
    downBtn.textContent = "↓";
    downBtn.disabled = idx === currentToggleActivities.length - 1;
    downBtn.addEventListener("click", function () {
      moveActivity(idx, 1);
    });
    moveWrap.appendChild(downBtn);

    row.appendChild(moveWrap);

    listEl.appendChild(row);
  });
}

function collectDisabledIds() {
  var checkboxes = document.querySelectorAll("#activityTogglesList input[type=checkbox]");
  var disabledIds = [];
  var i;
  for (i = 0; i < checkboxes.length; i++) {
    if (!checkboxes[i].checked) {
      disabledIds.push(currentToggleActivities[i].id);
    }
  }
  return disabledIds;
}

async function saveToggleState(disabledIds) {
  var statusEl = document.getElementById("activityToggleStatus");
  statusEl.textContent = "Đang lưu...";

  var orderIds = currentToggleActivities.map(function (a) {
    return a.id;
  });
  var result = await supabaseClient
    .from("game_unit_settings")
    .upsert({ unit_id: currentToggleUnitId, disabled_activity_ids: disabledIds, activity_order: orderIds });

  statusEl.textContent = result.error ? "Lỗi lưu: " + result.error.message : "Đã lưu ✓";
}

async function handleToggleChange() {
  await saveToggleState(collectDisabledIds());
}

async function moveActivity(index, direction) {
  var disabledIds = collectDisabledIds();
  var swapIndex = index + direction;
  if (swapIndex < 0 || swapIndex >= currentToggleActivities.length) {
    return;
  }

  var tmp = currentToggleActivities[index];
  currentToggleActivities[index] = currentToggleActivities[swapIndex];
  currentToggleActivities[swapIndex] = tmp;

  await saveToggleState(disabledIds);
  renderActivityToggles(disabledIds);
}
