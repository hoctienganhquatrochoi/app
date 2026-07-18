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
    loadAllAssignmentsForResults();
    populateHistoryGroupSelect();
    loadAllStudentsForHistory().then(populateHistoryStudentSelect);
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  await loadCurriculumData();
  await loadTeachingGroups();

  populateUnitSelect();
  populateAllGroupSelects();
  populateResultsUnitSelect();
  populateAssignmentUnitSelect();
  populateAssignmentStudentAccess();
  loadVocabTable();
  loadSentenceTable();
  loadVietLiteracyTable();
  loadSpeakingTestList().then(loadSpeakingTable);
  loadWordwallList();
  loadWordwallTemplates();
  loadStudents();
  loadActivityToggles();
  initCurriculumManage();
  renderTeachingGroupList();
  populateNewTeachingGroupClassAccess();

  document.getElementById("unitSelect").addEventListener("change", loadVocabTable);
  document.getElementById("unitSelect").addEventListener("change", loadSentenceTable);
  document.getElementById("unitSelect").addEventListener("change", loadVietLiteracyTable);
  document.getElementById("unitSelect").addEventListener("change", function () {
    loadSpeakingTestList().then(loadSpeakingTable);
  });
  document.getElementById("unitSelect").addEventListener("change", loadWordwallList);
  document.getElementById("unitSelect").addEventListener("change", loadActivityToggles);
  document.getElementById("toggleAllVocabOnBtn").addEventListener("click", function () {
    setVocabTogglesEnabled(true);
  });
  document.getElementById("toggleAllVocabOffBtn").addEventListener("click", function () {
    setVocabTogglesEnabled(false);
  });
  document.getElementById("bulkAddForm").addEventListener("submit", handleBulkAdd);
  document.getElementById("bulkAddSentenceForm").addEventListener("submit", handleBulkAddSentences);
  document.getElementById("bulkAddVietLiteracyForm").addEventListener("submit", handleBulkAddVietLiteracy);
  document.getElementById("bulkAddSpeakingForm").addEventListener("submit", handleBulkAddSpeaking);
  document.getElementById("addStudentForm").addEventListener("submit", handleAddStudent);
  document.getElementById("addTeachingGroupBtn").addEventListener("click", handleAddTeachingGroup);
  document.getElementById("newStudentGroupSelect").addEventListener("change", applyGroupDefaultClassAccess);
  document.getElementById("studentsGroupFilter").addEventListener("change", function () {
    loadStudents();
    populateAssignmentUnitSelect();
    populateAssignmentStudentAccess();
  });
  document.getElementById("historyGroupSelect").addEventListener("change", function () {
    populateHistoryStudentSelect();
    loadGroupHistory();
  });
  document.getElementById("historyStudentSearch").addEventListener("input", populateHistoryStudentSelect);
  document.getElementById("historyStudentSelect").addEventListener("change", loadGroupHistory);
  document.getElementById("historyFromDate").addEventListener("change", loadGroupHistory);
  document.getElementById("historyToDate").addEventListener("change", loadGroupHistory);
  document.getElementById("historyTodayBtn").addEventListener("click", function () {
    setHistoryDateRange(1);
    loadGroupHistory();
  });
  document.getElementById("historyLast7Btn").addEventListener("click", function () {
    setHistoryDateRange(7);
    loadGroupHistory();
  });
  document.getElementById("historyExportPdfBtn").addEventListener("click", handleHistoryExportPdf);
  document.getElementById("resultsUnitSearch").addEventListener("input", populateResultsUnitSelect);
  document.getElementById("resultsUnitSelect").addEventListener("change", function () {
    currentResultsAssignmentId = null;
    loadResults();
  });
  document.getElementById("resultsActivitySelect").addEventListener("change", function () {
    currentResultsAssignmentId = null;
    loadResults();
  });
  document.getElementById("resultsGroupFilter").addEventListener("change", function () {
    currentResultsAssignmentId = null;
    loadResults();
  });
  document.getElementById("addAssignmentBtn").addEventListener("click", handleAddAssignment);
  document.getElementById("assignmentUnitSearch").addEventListener("input", populateAssignmentUnitSelect);
  document.getElementById("closeWordwallTemplateModalBtn").addEventListener("click", closeWordwallTemplateModal);
  document.getElementById("addWordwallTemplateBtn").addEventListener("click", handleAddWordwallTemplate);
  document.getElementById("addWordwallTemplateItemBtn").addEventListener("click", handleAddWordwallTemplateItem);
  document.getElementById("wordwallTemplateModalOverlay").addEventListener("click", function (e) {
    if (e.target === this) {
      closeWordwallTemplateModal();
    }
  });

  var tabs = document.querySelectorAll(".admin-tab");
  var i;
  for (i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener("click", function () {
      switchTab(this.getAttribute("data-tab"));
    });
  }
});
