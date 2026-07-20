function switchTab(target) {
  saveAdminNavState({ topTab: target });
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
  var savedNavState = loadAdminNavState();

  await loadCurriculumData();
  await loadTeachingGroups();

  populateUnitSelect();
  populateAllGroupSelects();
  populateResultsUnitSelect();
  populateAssignmentUnitSelect();
  populateAssignmentStudentAccess();
  loadVocabTable();
  loadSentenceTable();
  loadGrammarMcqSetList().then(loadGrammarMcqTable);
  loadGrammarTypingSetList().then(loadGrammarTypingTable);
  loadGrammarMatchingSetList().then(loadGrammarMatchingTable);
  loadGrammarDragfillSetList().then(loadGrammarDragfillTable);
  loadPhotoQuizSetList().then(function () {
    loadPhotoQuizTable();
    loadPhotoQuizSetImage();
  });
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
  document.getElementById("unitSelect").addEventListener("change", function () {
    loadGrammarMcqSetList().then(loadGrammarMcqTable);
  });
  document.getElementById("unitSelect").addEventListener("change", function () {
    loadGrammarTypingSetList().then(loadGrammarTypingTable);
  });
  document.getElementById("unitSelect").addEventListener("change", function () {
    loadGrammarMatchingSetList().then(loadGrammarMatchingTable);
  });
  document.getElementById("unitSelect").addEventListener("change", function () {
    loadGrammarDragfillSetList().then(loadGrammarDragfillTable);
  });
  document.getElementById("unitSelect").addEventListener("change", function () {
    loadPhotoQuizSetList().then(function () {
      loadPhotoQuizTable();
      loadPhotoQuizSetImage();
    });
  });
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
  document.getElementById("bulkAddGrammarMcqForm").addEventListener("submit", handleBulkAddGrammarMcq);
  document.getElementById("addGrammarMcqSetBtn").addEventListener("click", handleAddGrammarMcqSet);
  document.getElementById("grammarMcqSetSelect").addEventListener("change", loadGrammarMcqTable);
  document.getElementById("bulkAddGrammarTypingForm").addEventListener("submit", handleBulkAddGrammarTyping);
  document.getElementById("addGrammarTypingSetBtn").addEventListener("click", handleAddGrammarTypingSet);
  document.getElementById("grammarTypingSetSelect").addEventListener("change", loadGrammarTypingTable);
  document.getElementById("bulkAddGrammarMatchingForm").addEventListener("submit", handleBulkAddGrammarMatching);
  document.getElementById("addGrammarMatchingSetBtn").addEventListener("click", handleAddGrammarMatchingSet);
  document.getElementById("grammarMatchingSetSelect").addEventListener("change", loadGrammarMatchingTable);
  document.getElementById("bulkAddGrammarDragfillForm").addEventListener("submit", handleBulkAddGrammarDragfill);
  document.getElementById("addGrammarDragfillSetBtn").addEventListener("click", handleAddGrammarDragfillSet);
  document.getElementById("grammarDragfillSetSelect").addEventListener("change", loadGrammarDragfillTable);
  document.getElementById("bulkAddPhotoQuizForm").addEventListener("submit", handleBulkAddPhotoQuiz);
  document.getElementById("addPhotoQuizSetBtn").addEventListener("click", handleAddPhotoQuizSet);
  document.getElementById("photoQuizSetSelect").addEventListener("change", function () {
    loadPhotoQuizTable();
    loadPhotoQuizSetImage();
  });
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
  document.getElementById("assignmentUnitSearch").addEventListener("input", function () {
    populateAssignmentUnitSelect();
    updateAssignmentSetNameField();
  });
  document.getElementById("assignmentUnitSelect").addEventListener("change", updateAssignmentSetNameField);
  document.getElementById("assignmentActivitySelect").addEventListener("change", updateAssignmentSetNameField);
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

  restoreAdminNavState(savedNavState);
});
