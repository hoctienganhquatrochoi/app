function switchTab(target) {
  var tabs = document.querySelectorAll(".admin-tab");
  var i;
  for (i = 0; i < tabs.length; i++) {
    if (tabs[i].getAttribute("data-tab") === target) {
      tabs[i].className = "admin-tab active";
    } else {
      tabs[i].className = "admin-tab";
    }
  }
  document.getElementById("contentPanel").style.display = target === "content" ? "block" : "none";
  document.getElementById("studentsPanel").style.display = target === "students" ? "block" : "none";
  document.getElementById("resultsPanel").style.display = target === "results" ? "block" : "none";

  if (target === "results") {
    loadResults();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  populateUnitSelect();
  populateClassSelect();
  populateResultsUnitSelect();
  loadVocabTable();
  loadStudents();

  document.getElementById("unitSelect").addEventListener("change", loadVocabTable);
  document.getElementById("addVocabForm").addEventListener("submit", handleAddVocab);
  document.getElementById("bulkAddForm").addEventListener("submit", handleBulkAdd);
  document.getElementById("addStudentForm").addEventListener("submit", handleAddStudent);
  document.getElementById("resultsUnitSelect").addEventListener("change", loadResults);
  document.getElementById("resultsActivitySelect").addEventListener("change", loadResults);

  initNewImagePicker();

  var tabs = document.querySelectorAll(".admin-tab");
  var i;
  for (i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener("click", function () {
      switchTab(this.getAttribute("data-tab"));
    });
  }
});
