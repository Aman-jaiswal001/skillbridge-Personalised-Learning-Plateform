import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateSkillProficiency, getSkillAssessmentEvidence, isMasteryLevelUnlocked, matchesSkillLabel, skillProgressStatus, startingMasteryLevel, updateMasteryUnlock } from '../src/utils/skillProgress.js'

test('latest retry replaces the same assessment while separate assessments both contribute', () => {
  const attempts = [
    { _id: 'attempt-3', assessmentId: 'assessment-a', completedAt: '2026-03-03', skillPerformance: [{ skillId: 'skill-1', name: 'JavaScript', value: 90 }] },
    { _id: 'attempt-2', assessmentId: 'assessment-b', completedAt: '2026-03-02', skillPerformance: [{ skillId: 'skill-1', name: 'JavaScript', value: 60 }] },
    { _id: 'attempt-1', assessmentId: 'assessment-a', completedAt: '2026-03-01', skillPerformance: [{ skillId: 'skill-1', name: 'JavaScript', value: 40 }] },
  ]
  const evidence = getSkillAssessmentEvidence(attempts, 'skill-1', 'JavaScript')
  assert.deepEqual(evidence.history.map((row) => row.score), [90, 60, 40])
  assert.deepEqual(evidence.latestPerAssessment.map((row) => row.score), [90, 60])
  assert.equal(calculateSkillProficiency(20, evidence.latestPerAssessment.map((row) => row.score)), 59)
})

test('a retry can update evidence without adding a second assessment to proficiency', () => {
  const attempts = [
    { _id: 'new', assessmentId: 'same', completedAt: '2026-03-02', skillPerformance: [{ name: 'Data Analysis', value: 50 }] },
    { _id: 'old', assessmentId: 'same', completedAt: '2026-03-01', skillPerformance: [{ name: 'Data Analysis', value: 100 }] },
  ]
  const evidence = getSkillAssessmentEvidence(attempts, null, 'Data Analysis')
  assert.equal(evidence.history.length, 2)
  assert.equal(evidence.latestPerAssessment.length, 1)
  assert.equal(calculateSkillProficiency(0, evidence.latestPerAssessment.map((row) => row.score)), 35)
})

test('skill gap status uses target distance', () => {
  assert.equal(skillProgressStatus(100, 100), 'Target Achieved')
  assert.equal(skillProgressStatus(75, 80), 'On Target')
  assert.equal(skillProgressStatus(50, 80), 'In Progress')
  assert.equal(skillProgressStatus(20, 80), 'Needs Improvement')
})

test('starting level is self reported and passing unlocks exactly the next stage', () => {
  const skill = { startingLevel: 'Beginner', unlockedLevel: 'Beginner', passedLevels: [] }
  assert.equal(startingMasteryLevel(skill), 'Beginner')
  assert.equal(isMasteryLevelUnlocked('Intermediate', skill.unlockedLevel), false)
  assert.deepEqual(updateMasteryUnlock(skill, 'Beginner', false), { ...skill, passedLevels: [] })
  const afterPass = updateMasteryUnlock(skill, 'Beginner', true)
  assert.equal(afterPass.unlockedLevel, 'Intermediate')
  assert.deepEqual(afterPass.passedLevels, ['Beginner'])
  assert.equal(isMasteryLevelUnlocked('Advanced', afterPass.unlockedLevel), false)
})

test('legacy self-assessed percentages safely infer a starting stage', () => {
  assert.equal(startingMasteryLevel({ currentPercent: 20 }), 'Beginner')
  assert.equal(startingMasteryLevel({ currentPercent: 55 }), 'Intermediate')
  assert.equal(startingMasteryLevel({ currentPercent: 75 }), 'Advanced')
})

test('assessment evidence matches a skill prefix in a longer question label', () => {
  const attempts = [{ _id: 'attempt-cpp', assessmentId: 'assessment-cpp', completedAt: '2026-03-04', assessmentLevel: 'Beginner', passed: true, skillPerformance: [{ name: 'C++ Programming Fundamentals', value: 80, passed: true }] }]
  const evidence = getSkillAssessmentEvidence(attempts, 'skill-cpp', 'C++')
  assert.equal(evidence.history.length, 1)
  assert.equal(evidence.history[0].passed, true)
  assert.equal(matchesSkillLabel('C++ Programming Fundamentals', 'C++'), true)
})
