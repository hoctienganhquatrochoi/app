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
    .select("disabled_activity_ids")
    .eq("unit_id", unitId)
    .maybeSingle();

  var disabledIds = result.data ? result.data.disabled_activity_ids : [];
  renderActivityToggles(unit, disabledIds || []);
}

function renderActivityToggles(unit, disabledIds) {
  var listEl = document.getElementById("activityTogglesList");
  listEl.innerHTML = "";

  var i;
  for (i = 0; i < unit.activities.length; i++) {
    var activity = unit.activities[i];
    var label = document.createElement("label");
    label.className = "admin-toggle-item";

    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = disabledIds.indexOf(activity.id) === -1;
    checkbox.addEventListener("change", function () {
      handleToggleChange(unit.id);
    });
    label.appendChild(checkbox);

    var text = document.createElement("span");
    text.textContent = activity.name;
    label.appendChild(text);

    listEl.appendChild(label);
  }
}

async function handleToggleChange(unitId) {
  var unit = findUnitById(unitId);
  var checkboxes = document.querySelectorAll("#activityTogglesList input[type=checkbox]");
  var disabledIds = [];
  var i;
  for (i = 0; i < checkboxes.length; i++) {
    if (!checkboxes[i].checked) {
      disabledIds.push(unit.activities[i].id);
    }
  }

  await supabaseClient
    .from("game_unit_settings")
    .upsert({ unit_id: unitId, disabled_activity_ids: disabledIds });
}
