// Generic pointer-based drag-and-drop (works for mouse and touch alike).
// getZones() returns the current list of drop-zone elements (evaluated fresh on every drop,
// so modes can add/remove zones dynamically). onDrop(item, zoneEl|null) is called after the
// item has already been re-parented into the zone (or returned to its original spot).
function makeDraggable(item, getZones, onDrop) {
  var dragging = false;
  var origParent, origNextSibling, offsetX, offsetY;

  item.classList.add("draggable-item");

  function moveTo(x, y) {
    item.style.left = (x - offsetX) + "px";
    item.style.top = (y - offsetY) + "px";
  }

  function onPointerDown(e) {
    if (item.classList.contains("locked")) {
      return;
    }
    e.preventDefault();
    dragging = true;
    try { item.setPointerCapture(e.pointerId); } catch (err) {}

    var rect = item.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    origParent = item.parentNode;
    origNextSibling = item.nextSibling;

    item.classList.add("dragging");
    item.style.position = "fixed";
    item.style.width = rect.width + "px";
    item.style.height = rect.height + "px";
    moveTo(e.clientX, e.clientY);
    document.body.appendChild(item);
  }

  function onPointerMove(e) {
    if (!dragging) {
      return;
    }
    moveTo(e.clientX, e.clientY);
  }

  function onPointerUp(e) {
    if (!dragging) {
      return;
    }
    dragging = false;
    item.classList.remove("dragging");
    item.style.position = "";
    item.style.left = "";
    item.style.top = "";
    item.style.width = "";
    item.style.height = "";

    var zones = getZones();
    var target = null;
    for (var i = 0; i < zones.length; i++) {
      var r = zones[i].getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        target = zones[i];
        break;
      }
    }

    if (target) {
      target.appendChild(item);
    } else if (origNextSibling) {
      origParent.insertBefore(item, origNextSibling);
    } else {
      origParent.appendChild(item);
    }

    onDrop(item, target);
  }

  item.addEventListener("pointerdown", onPointerDown);
  item.addEventListener("pointermove", onPointerMove);
  item.addEventListener("pointerup", onPointerUp);
  item.addEventListener("pointercancel", onPointerUp);
}
