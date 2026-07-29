// Generic pointer-based drag-and-drop (works for mouse and touch alike).
// Uses a floating "ghost" clone that follows the pointer, while the real item stays put
// (just dimmed) until it's actually dropped on a valid zone - this avoids the pool
// reflowing/jumping the instant you pick something up.
// getZones() returns the current list of drop-zone elements (evaluated fresh on every drop,
// so modes can add/remove zones dynamically). onDrop(item, zoneEl|null) is called after the
// item has already been re-parented into the zone (if a valid drop happened).
function makeDraggable(item, getZones, onDrop) {
  var dragging = false;
  var ghost = null;
  var offsetX, offsetY;

  item.classList.add("draggable-item");

  function moveGhost(x, y) {
    ghost.style.left = (x - offsetX) + "px";
    ghost.style.top = (y - offsetY) + "px";
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

    ghost = item.cloneNode(true);
    ghost.classList.add("dragging");
    ghost.style.position = "fixed";
    ghost.style.width = rect.width + "px";
    ghost.style.height = rect.height + "px";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "1000";
    moveGhost(e.clientX, e.clientY);
    document.body.appendChild(ghost);

    item.classList.add("drag-source-hidden");
  }

  function onPointerMove(e) {
    if (!dragging) {
      return;
    }
    moveGhost(e.clientX, e.clientY);
  }

  function onPointerUp(e) {
    if (!dragging) {
      return;
    }
    dragging = false;
    item.classList.remove("drag-source-hidden");

    if (ghost) {
      ghost.remove();
      ghost = null;
    }

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
    }

    onDrop(item, target);
  }

  item.addEventListener("pointerdown", onPointerDown);
  item.addEventListener("pointermove", onPointerMove);
  item.addEventListener("pointerup", onPointerUp);
  item.addEventListener("pointercancel", onPointerUp);
}
