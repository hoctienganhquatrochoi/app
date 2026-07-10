async function submitQuizAttempt(unitId, activityType, score, total, startedAt, answersLog) {
  if (!currentStudent) {
    return;
  }

  await supabaseClient.from("game_quiz_attempts").insert({
    student_id: currentStudent.id,
    unit_id: unitId,
    activity_type: activityType,
    score: score,
    total: total,
    started_at: startedAt.toISOString(),
    answers: answersLog
  });
}
