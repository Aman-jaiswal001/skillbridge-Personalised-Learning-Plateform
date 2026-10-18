import test from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { Assessment } from '../src/models/Assessment.js'
import { Question } from '../src/models/Question.js'
import { env } from '../src/config/env.js'
import { requireRole } from '../src/middleware/role.middleware.js'
import { scoreAttempt } from '../src/utils/scoring.js'
import { buildAssessmentTemplate, parseAssessmentWorkbook, previewAssessmentSpreadsheet } from '../src/services/assessmentImport.service.js'

const headers = ['questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'explanation', 'skill', 'difficulty', 'marks']
const sample = ['What does HTML stand for?', 'Hyper Text Markup Language', 'High Text Machine Language', 'Hyper Tool Markup Language', 'Home Text Markup Language', 'A', 'Standard markup language for web pages.', 'Web Development', 'Easy', 2]

async function makeFile(rows = [sample], { columns = headers, extension = 'xlsx' } = {}) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Questions')
  worksheet.addRow(columns)
  for (const row of rows) worksheet.addRow(row)
  return { originalname: `questions.${extension}`, buffer: Buffer.from(await workbook.xlsx.writeBuffer()) }
}

test('template has Questions and Instructions worksheets and parses its sample row', async () => {
  const template = Buffer.from(await buildAssessmentTemplate())
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(template)
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ['Questions', 'Instructions'])
  const result = await parseAssessmentWorkbook({ originalname: 'template.xlsx', buffer: template })
  assert.equal(result.validQuestions, 1)
  assert.equal(result.rows[0].correctAnswer, 'A')
})

test('parser validates and previews multiple MCQs using the Excel row numbers', async () => {
  const secondQuestion = [...sample]
  secondQuestion[0] = 'Which language adds structure to a web page?'
  secondQuestion[5] = 'B'
  const result = await previewAssessmentSpreadsheet(await makeFile([sample, secondQuestion]))
  assert.equal(result.totalRows, 2)
  assert.equal(result.validQuestions, 2)
  assert.deepEqual(result.preview.map((row) => row.row), [2, 3])
  assert.equal(result.preview[1].correctAnswer, 'B')
})

test('missing required columns are reported with worksheet header row details', async () => {
  const result = await parseAssessmentWorkbook(await makeFile([sample], { columns: headers.filter((header) => header !== 'correctAnswer') }))
  assert.equal(result.validQuestions, 0)
  assert.ok(result.headerErrors.some((error) => error.column === 'correctanswer'))
})

test('optional explanation, skill, difficulty, and marks headers default safely', async () => {
  const optionalColumns = headers.slice(0, 6)
  const result = await parseAssessmentWorkbook(await makeFile([sample.slice(0, 6)], { columns: optionalColumns }))
  assert.equal(result.validQuestions, 1)
  assert.equal(result.rows[0].difficulty, 'Medium')
  assert.equal(result.rows[0].marks, 1)
  assert.equal(result.rows[0].skill, '')
})

test('invalid answer values and duplicate question text are row-specific', async () => {
  const invalid = [...sample]
  invalid[5] = 'E'
  const duplicate = [...sample]
  const result = await parseAssessmentWorkbook(await makeFile([sample, invalid, duplicate]))
  assert.equal(result.validQuestions, 1)
  assert.equal(result.rows[1].status, 'invalid')
  assert.equal(result.rows[2].status, 'duplicate')
  assert.ok(result.errors.some((error) => error.row === 4 && /Duplicate/.test(error.message)))
})

test('blank worksheet rows are marked skipped and formula cells are rejected', async () => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Questions')
  worksheet.addRow(headers)
  worksheet.addRow(sample)
  worksheet.addRow([])
  const formula = worksheet.addRow([...sample])
  formula.getCell(2).value = { formula: '"answer"' }
  const result = await parseAssessmentWorkbook({ originalname: 'rows.xlsx', buffer: Buffer.from(await workbook.xlsx.writeBuffer()) })
  assert.equal(result.blankRows, 1)
  assert.equal(result.rows[1].status, 'skipped')
  assert.equal(result.rows[2].status, 'invalid')
  assert.ok(result.errors.some((error) => error.row === 4 && /Formula/.test(error.message)))
})

test('parser rejects empty, non-XLSX, oversized, and malformed spreadsheet files', async () => {
  await assert.rejects(parseAssessmentWorkbook({ originalname: 'empty.xlsx', buffer: Buffer.alloc(0) }), /empty/)
  await assert.rejects(parseAssessmentWorkbook({ originalname: 'questions.xls', buffer: Buffer.alloc(8) }), /Only .xlsx/)
  await assert.rejects(parseAssessmentWorkbook({ originalname: 'bad.xlsx', buffer: Buffer.from('not a workbook') }), /valid .xlsx/)
  await assert.rejects(parseAssessmentWorkbook({ originalname: 'large.xlsx', buffer: Buffer.alloc(env.assessmentImportMaxFileSize + 1) }), /file size/)
})

test('configured maximum question rows is enforced', async () => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Questions')
  worksheet.addRow(headers)
  for (let index = 0; index <= env.assessmentImportMaxRows; index += 1) worksheet.addRow([...sample,])
  const file = { originalname: 'too-many.xlsx', buffer: Buffer.from(await workbook.xlsx.writeBuffer()) }
  await assert.rejects(parseAssessmentWorkbook(file), /row question limit/)
})

test('only admins pass the existing admin-role gate', () => {
  const gate = requireRole('ADMIN')
  let denied
  gate({ user: { role: 'STUDENT' } }, {}, (error) => { denied = error })
  assert.equal(denied.statusCode, 403)
  let allowed = false
  gate({ user: { role: 'ADMIN' } }, {}, (error) => { allowed = !error })
  assert.equal(allowed, true)
})

test('assessment and question schemas preserve indexed correct-answer scoring fields', () => {
  assert.ok(Assessment.schema.path('questions'))
  assert.equal(Question.schema.path('correctAnswer').instance, 'Number')
  assert.ok(Question.schema.indexes().some(([keys, options]) => keys.importFingerprint === 1 && options.unique))
  const scored = scoreAttempt({ questions: [{ correctAnswer: 1, marks: 2 }], answers: [{ selected: 1 }] })
  assert.equal(scored.score, 2)
  assert.equal(scored.total, 2)
  assert.equal(scored.percentage, 100)
})
