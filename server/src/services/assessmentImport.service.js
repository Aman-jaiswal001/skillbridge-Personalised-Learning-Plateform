import { createHash } from 'node:crypto'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import mongoose from 'mongoose'
import { Assessment } from '../models/Assessment.js'
import { AssessmentImport } from '../models/AssessmentImport.js'
import { AssessmentResult } from '../models/AssessmentResult.js'
import { Question } from '../models/Question.js'
import { Skill } from '../models/Skill.js'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

const columns = ['questiontext', 'optiona', 'optionb', 'optionc', 'optiond', 'correctanswer', 'explanation', 'skill', 'level', 'marks']
const requiredColumns = ['questiontext', 'optiona', 'optionb', 'optionc', 'optiond', 'correctanswer']
const difficultyValues = new Map([['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']])
const progressionLevels = new Map([['easy', 'Beginner'], ['beginner', 'Beginner'], ['medium', 'Intermediate'], ['intermediate', 'Intermediate'], ['hard', 'Advanced'], ['advanced', 'Advanced']])

export async function buildAssessmentTemplate() {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'SkillBridge'
  workbook.subject = 'Bulk assessment question import'
  const questions = workbook.addWorksheet('Questions')
  questions.columns = columns.map((key, index) => ({ header: ['questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'explanation', 'skill', 'level', 'marks'][index], key, width: index === 0 || index === 6 ? 42 : 24 }))
  questions.addRow({ questiontext: 'What does HTML stand for?', optiona: 'Hyper Text Markup Language', optionb: 'High Text Machine Language', optionc: 'Hyper Tool Markup Language', optiond: 'Home Text Markup Language', correctanswer: 'A', explanation: 'HTML is the standard markup language for web pages.', skill: 'Web Development', level: 'Beginner', marks: 1 })
  questions.views = [{ state: 'frozen', ySplit: 1 }]
  questions.autoFilter = { from: 'A1', to: 'J1' }
  questions.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  questions.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF304FFE' } }
  questions.getColumn('level').eachCell((cell, row) => { if (row > 1) cell.dataValidation = { type: 'list', formulae: ['"Beginner,Intermediate,Advanced"'], allowBlank: false } })
  const instructions = workbook.addWorksheet('Instructions')
  instructions.addRows([
    ['SkillBridge Assessment Import Template'],
    ['Fill in one question per row on the Questions worksheet. Keep the header names unchanged.'],
    ['Required: questionText, optionA, optionB, optionC, optionD, correctAnswer.'],
    ['correctAnswer must be A, B, C, D, or the exact text of one choice.'],
    ['Progression level values: Beginner, Intermediate, Advanced. Legacy Easy, Medium, Hard values are also accepted. marks must be a number from 0 to 100.'],
    [`Maximum questions per import: ${env.assessmentImportMaxRows}. Maximum file size: ${Math.round(env.assessmentImportMaxFileSize / 1024 / 1024)} MB.`],
    ['Completely blank rows are skipped. Duplicate question text is skipped and reported. Formula cells are not allowed.'],
    ['Sample question: What does HTML stand for? | Hyper Text Markup Language | High Text Machine Language | Hyper Tool Markup Language | Home Text Markup Language | A | HTML is the standard markup language for web pages. | Web Development | Easy | 1'],
  ])
  instructions.getColumn(1).width = 120
  instructions.getColumn(1).alignment = { wrapText: true, vertical: 'top' }
  instructions.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF304FFE' } }
  return workbook.xlsx.writeBuffer()
}

function normalizedText(value) {
  return String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}

function fingerprint(question) {
  return createHash('sha256').update(normalizedText(question)).digest('hex')
}

function cellValue(cell, rowNumber, column, errors) {
  const value = cell.value
  if (cell.type === ExcelJS.ValueType.Formula || (value && typeof value === 'object' && ('formula' in value || 'sharedFormula' in value))) {
    errors.push({ row: rowNumber, column, message: 'Formula cells are not allowed; replace this with a value.' })
    return undefined
  }
  if (value === null || value === undefined) return ''
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    errors.push({ row: rowNumber, column, message: 'Cell must contain plain text or a number.' })
    return undefined
  }
  return value
}

function answerIndex(value, options) {
  const answer = String(value).trim()
  const letter = answer.toUpperCase()
  if (/^[A-D]$/.test(letter)) return letter.charCodeAt(0) - 65
  const matching = options.findIndex((option) => option.toLowerCase() === answer.toLowerCase())
  return matching
}

export async function parseAssessmentWorkbook(file, { defaultDifficulty = 'Medium' } = {}) {
  if (!file?.buffer?.length) throw ApiError.badRequest('The spreadsheet is empty')
  if (!file.originalname || !file.originalname.toLowerCase().endsWith('.xlsx')) throw ApiError.unsupported('Only .xlsx assessment spreadsheets are supported')
  if (file.buffer.length > env.assessmentImportMaxFileSize) throw ApiError.payloadTooLarge('Spreadsheet exceeds the configured file size limit')
  if (file.buffer.length < 4 || file.buffer[0] !== 0x50 || file.buffer[1] !== 0x4b || !file.buffer.includes(Buffer.from('[Content_Types].xml'))) {
    throw ApiError.badRequest('The uploaded file is not a valid .xlsx workbook')
  }
  let archive
  try { archive = await JSZip.loadAsync(file.buffer) } catch { throw ApiError.badRequest('Could not read this Excel workbook. Check that it is a valid .xlsx file.') }
  const archiveFiles = Object.values(archive.files).filter((entry) => !entry.dir)
  const uncompressedSize = archiveFiles.reduce((total, entry) => total + (entry._data?.uncompressedSize || 0), 0)
  if (archiveFiles.length > 100 || uncompressedSize > 25 * 1024 * 1024 || archiveFiles.some((entry) => entry._data?.uncompressedSize > 10 * 1024 * 1024)) {
    throw ApiError.payloadTooLarge('Workbook contains too much uncompressed data. Remove embedded files or excessive workbook content and try again.')
  }

  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(file.buffer)
  } catch {
    throw ApiError.badRequest('Could not read this Excel workbook. Check that it is a valid, unencrypted .xlsx file.')
  }
  const worksheet = workbook.getWorksheet('Questions') || workbook.worksheets[0]
  if (!worksheet || worksheet.rowCount < 1) throw ApiError.badRequest('The workbook does not contain a question worksheet')
  if (worksheet.rowCount - 1 > env.assessmentImportMaxRows) throw ApiError.badRequest(`The worksheet exceeds the ${env.assessmentImportMaxRows}-row question limit`)

  const headerErrors = []
  const headerRow = worksheet.getRow(1)
  const headerIndexes = new Map()
  for (let columnIndex = 1; columnIndex <= headerRow.cellCount; columnIndex += 1) {
    const value = cellValue(headerRow.getCell(columnIndex), 1, `column ${columnIndex}`, headerErrors)
    const header = normalizedText(value).replace(/\s+/g, '')
    if (header) {
      if (headerIndexes.has(header)) headerErrors.push({ row: 1, column: String(value), message: 'Duplicate column header.' })
      else headerIndexes.set(header, columnIndex)
    }
  }
  for (const header of requiredColumns) if (!headerIndexes.has(header)) headerErrors.push({ row: 1, column: header, message: 'Required column is missing.' })
  if (headerErrors.length) return { rows: [], errors: headerErrors, totalRows: Math.max(worksheet.rowCount - 1, 0), blankRows: 0, validQuestions: 0, skippedRows: Math.max(worksheet.rowCount - 1, 0), headerErrors }

  const rows = []
  const errors = []
  const seen = new Set()
  let blankRows = 0
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber)
    const rowHasContent = Array.from({ length: row.cellCount }, (_, index) => row.getCell(index + 1).value).some((value) => value !== null && value !== undefined && value !== '')
    if (!rowHasContent) {
      blankRows += 1
      rows.push({ row: rowNumber, status: 'skipped', question: '', options: [], error: 'Blank row skipped.' })
      continue
    }
    const rowErrors = []
    const read = (key, fallback = '') => headerIndexes.has(key) ? cellValue(row.getCell(headerIndexes.get(key)), rowNumber, key, rowErrors) : fallback
    // Scan all cells, including extra columns, so a formula cannot hide outside the import fields.
    for (let columnIndex = 1; columnIndex <= row.cellCount; columnIndex += 1) {
      const cell = row.getCell(columnIndex)
      if (cell.type === ExcelJS.ValueType.Formula || (cell.value && typeof cell.value === 'object' && ('formula' in cell.value || 'sharedFormula' in cell.value))) {
        rowErrors.push({ row: rowNumber, column: `column ${columnIndex}`, message: 'Formula cells are not allowed; replace this with a value.' })
      }
    }
    const question = read('questiontext')
    const optionValues = ['optiona', 'optionb', 'optionc', 'optiond'].map(read)
    const answer = read('correctanswer')
    const explanation = read('explanation')
    const skill = read('skill')
    const difficultyInput = read('level', read('difficulty', defaultDifficulty)) || defaultDifficulty
    const marksInput = read('marks', 1)
    const normalizedMarks = marksInput === '' ? 1 : marksInput
    const textFields = [['questionText', question], ...optionValues.map((value, index) => [`option${String.fromCharCode(65 + index)}`, value]), ['explanation', explanation], ['skill', skill], ['difficulty', difficultyInput], ['correctAnswer', answer]]
    for (const [column, value] of textFields) if (value !== '' && typeof value !== 'string') rowErrors.push({ row: rowNumber, column, message: 'This field must be text.' })
    if (!String(question || '').trim()) rowErrors.push({ row: rowNumber, column: 'questionText', message: 'Question text is required.' })
    for (const [index, value] of optionValues.entries()) if (!String(value || '').trim()) rowErrors.push({ row: rowNumber, column: `option${String.fromCharCode(65 + index)}`, message: 'Answer choice is required.' })
    const options = optionValues.map((value) => typeof value === 'string' ? value.trim().slice(0, 1000) : '')
    let correctAnswer = -1
    if (typeof answer === 'string' && answer.trim()) correctAnswer = answerIndex(answer, options)
    if (correctAnswer < 0) rowErrors.push({ row: rowNumber, column: 'correctAnswer', message: 'Use A, B, C, D, or the exact text of one answer choice.' })
    const normalizedInputLevel = String(difficultyInput || '').trim().toLowerCase()
    const level = progressionLevels.get(normalizedInputLevel)
    const difficulty = difficultyValues.get(normalizedInputLevel) || ({ Beginner: 'Easy', Intermediate: 'Medium', Advanced: 'Hard' })[level]
    if (!difficulty) rowErrors.push({ row: rowNumber, column: 'difficulty', message: 'Level must be Beginner, Intermediate, or Advanced.' })
    if (typeof normalizedMarks !== 'number' || !Number.isFinite(normalizedMarks) || normalizedMarks < 0 || normalizedMarks > 100) rowErrors.push({ row: rowNumber, column: 'marks', message: 'Marks must be a number from 0 to 100.' })
    if (typeof explanation !== 'string' || typeof skill !== 'string') {
      // Type errors were already collected by the cell reader; keep row invalid.
    }
    if (String(question || '').length > 2000) rowErrors.push({ row: rowNumber, column: 'questionText', message: 'Question text must be 2,000 characters or fewer.' })
    optionValues.forEach((value, index) => { if (typeof value === 'string' && value.length > 1000) rowErrors.push({ row: rowNumber, column: `option${String.fromCharCode(65 + index)}`, message: 'Answer choices must be 1,000 characters or fewer.' }) })
    if (typeof explanation === 'string' && explanation.length > 4000) rowErrors.push({ row: rowNumber, column: 'explanation', message: 'Explanation must be 4,000 characters or fewer.' })
    if (typeof skill === 'string' && skill.length > 120) rowErrors.push({ row: rowNumber, column: 'skill', message: 'Skill must be 120 characters or fewer.' })
    const key = fingerprint(question || '')
    const duplicate = !rowErrors.length && seen.has(key)
    if (duplicate) rowErrors.push({ row: rowNumber, column: 'questionText', message: 'Duplicate question text in this worksheet.' })
    if (!rowErrors.length) seen.add(key)
    errors.push(...rowErrors)
    rows.push({
      row: rowNumber,
      status: duplicate ? 'duplicate' : rowErrors.length ? 'invalid' : 'valid',
      question: typeof question === 'string' ? question.trim().slice(0, 2000) : '',
      options,
      correctAnswer: correctAnswer >= 0 ? String.fromCharCode(65 + correctAnswer) : '',
      explanation: typeof explanation === 'string' ? explanation.trim() : '',
      skill: typeof skill === 'string' ? skill.trim() : '',
      difficulty: difficulty || '',
      level: level || '',
      marks: typeof normalizedMarks === 'number' ? normalizedMarks : null,
      fingerprint: key,
      error: rowErrors.map((item) => `${item.column}: ${item.message}`).join(' '),
    })
  }
  const validQuestions = rows.filter((row) => row.status === 'valid').length
  return { rows, errors, totalRows: worksheet.rowCount - 1, blankRows, validQuestions, skippedRows: rows.filter((row) => row.status !== 'valid').length }
}

export async function previewAssessmentSpreadsheet(file) {
  const result = await parseAssessmentWorkbook(file)
  return {
    preview: result.rows.map(({ fingerprint: _fingerprint, ...row }) => row),
    errors: result.errors,
    headerErrors: result.headerErrors || [],
    totalRows: result.totalRows,
    validQuestions: result.validQuestions,
    skippedRows: result.skippedRows,
    blankRows: result.blankRows,
  }
}

function requireRequestId(value) {
  const requestId = String(value || '').trim()
  if (requestId.length < 8 || requestId.length > 100 || !/^[A-Za-z0-9_-]+$/.test(requestId)) throw ApiError.badRequest('A valid import requestId is required')
  return requestId
}

export async function importAssessmentSpreadsheet({ file, body, userId }) {
  const requestId = requireRequestId(body.requestId)
  const previous = await AssessmentImport.findOne({ importedBy: userId, requestId }).lean()
  if (previous?.summary?.state === 'COMPLETED') return { ...previous.summary, duplicateRequest: true }
  if (previous && Date.now() - new Date(previous.updatedAt).getTime() < 10 * 60 * 1000) throw ApiError.conflict('This import request is already processing')
  if (previous) {
    const staleQuestions = await Question.find({ assessmentId: previous.assessmentId, importRequestId: requestId }).select('_id').lean()
    const staleIds = staleQuestions.map((question) => question._id)
    if (staleIds.length) {
      await Assessment.updateOne({ _id: previous.assessmentId }, { $pull: { questions: { $in: staleIds } } })
      await Question.deleteMany({ _id: { $in: staleIds } })
    }
    if (previous.summary?.createdAssessment) await Assessment.deleteOne({ _id: previous.assessmentId })
    await AssessmentImport.deleteOne({ _id: previous._id })
  }
  const requestedImportLevel = progressionLevels.get(String(body.level || body.difficulty || 'Intermediate').trim().toLowerCase()) || 'Intermediate'
  const parsed = await parseAssessmentWorkbook(file, { defaultDifficulty: requestedImportLevel })
  if (parsed.headerErrors?.length) throw ApiError.unprocessable('Spreadsheet is missing required columns', parsed.headerErrors)
  const validRows = parsed.rows.filter((row) => row.status === 'valid')
  if (!validRows.length) throw ApiError.unprocessable('No valid questions were found. Correct the row errors and upload again.', parsed.errors)
  const skillNames = new Set(validRows.map((row) => String(row.skill || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()).filter(Boolean))
  const allSkills = await Skill.find().select('_id name').lean()
  const matchedSkills = allSkills.filter((skill) => skillNames.has(String(skill.name).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()))
  const skillByName = new Map(allSkills.map((skill) => [String(skill.name).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase(), skill]))

  const createNew = !body.assessmentId
  let assessment
  let publishNewAssessment = false
  if (createNew) {
    const title = String(body.title || '').trim()
    const category = String(body.category || '').trim()
    const requestedLevel = progressionLevels.get(String(body.level || body.difficulty || 'Intermediate').trim().toLowerCase())
    const difficulty = ({ Beginner: 'Easy', Intermediate: 'Medium', Advanced: 'Hard' })[requestedLevel]
    const duration = Number(body.duration || 30)
    publishNewAssessment = body.published === 'true' || body.published === true
    if (body.published !== undefined && ![true, false, 'true', 'false'].includes(body.published)) throw ApiError.badRequest('published must be true or false')
    if (!title || !category) throw ApiError.badRequest('Assessment title and topic are required when creating a new assessment')
    if (!difficulty) throw ApiError.badRequest('Assessment level must be Beginner, Intermediate, or Advanced')
    if (!Number.isInteger(duration) || duration < 1 || duration > 300) throw ApiError.badRequest('Duration must be from 1 to 300 minutes')
    assessment = await Assessment.create({ title: title.slice(0, 160), category: category.slice(0, 120), difficulty, level: requestedLevel, description: String(body.description || '').trim().slice(0, 2000), duration, durationLabel: `${duration} min`, passingScore: 70, skills: matchedSkills.map((skill) => skill._id), allowRetakes: body.allowRetakes !== 'false' && body.allowRetakes !== false, questions: [], status: 'Upcoming', isActive: true, isPublished: false })
  } else {
    if (!mongoose.isValidObjectId(body.assessmentId)) throw ApiError.badRequest('Invalid assessment identifier')
    assessment = await Assessment.findOne({ _id: body.assessmentId, isActive: true })
    if (!assessment) throw ApiError.notFound('Target assessment not found')
    if (await AssessmentResult.exists({ assessmentId: assessment._id, status: 'IN_PROGRESS' })) throw ApiError.conflict('This assessment has an active student attempt. Try importing again after it is submitted.')
  }

  let importRecord
  let questionsAttached = false
  try {
    importRecord = await AssessmentImport.create({ requestId, assessmentId: assessment._id, importedBy: userId, originalFilename: String(file.originalname).replace(/[\\/\r\n]/g, '_').slice(0, 180), summary: { state: 'PROCESSING', createdAssessment: createNew } })
  } catch (error) {
    if (createNew) await Assessment.deleteOne({ _id: assessment._id }).catch(() => {})
    if (error.code === 11000) {
      const existingImport = await AssessmentImport.findOne({ importedBy: userId, requestId }).lean()
      if (existingImport?.summary?.state === 'COMPLETED') return { ...existingImport.summary, duplicateRequest: true }
      throw ApiError.conflict('This import request is already processing')
    }
    throw error
  }

  try {
    const existingQuestions = await Question.find({ assessmentId: assessment._id }).select('question importFingerprint').lean()
    const existingFingerprints = new Set(existingQuestions.map((question) => question.importFingerprint || fingerprint(question.question)))
    const importable = []
    const resultRows = parsed.rows.map((row) => {
      if (row.status !== 'valid') return row
      if (existingFingerprints.has(row.fingerprint)) {
        const error = { row: row.row, column: 'questionText', message: 'This question already exists in the selected assessment.' }
        parsed.errors.push(error)
        return { ...row, status: 'duplicate', error: error.message }
      }
      existingFingerprints.add(row.fingerprint)
      importable.push(row)
      return row
    })
    const operations = importable.map((row) => ({
      updateOne: {
        filter: { assessmentId: assessment._id, importFingerprint: row.fingerprint },
        update: { $setOnInsert: { assessmentId: assessment._id, question: row.question, options: row.options, correctAnswer: row.correctAnswer.charCodeAt(0) - 65, explanation: row.explanation, ...(skillByName.get(String(row.skill || '').toLowerCase()) ? { skillId: skillByName.get(String(row.skill || '').toLowerCase())._id } : {}), skill: row.skill || assessment.category, category: assessment.category, difficulty: row.difficulty || assessment.difficulty, marks: row.marks, importFingerprint: row.fingerprint, importRequestId: requestId } },
        upsert: true,
      },
    }))
    if (operations.length) {
      try {
        await Question.bulkWrite(operations, { ordered: false })
      } catch (error) {
        const writeErrors = error.writeErrors || error.result?.getWriteErrors?.() || []
        if ((!writeErrors.length && error.code !== 11000) || writeErrors.some((item) => item.code !== 11000)) throw error
      }
    }
    const createdQuestions = await Question.find({ assessmentId: assessment._id, importRequestId: requestId }).select('_id importFingerprint').lean()
    const createdByFingerprint = new Map(createdQuestions.map((question) => [question.importFingerprint, question._id]))
    const createdIds = importable.map((row) => createdByFingerprint.get(row.fingerprint)).filter(Boolean)
    if (createdIds.length) {
      const updated = await Assessment.updateOne({ _id: assessment._id, isActive: true }, { $addToSet: { questions: { $each: createdIds }, skills: { $each: matchedSkills.map((skill) => skill._id) } } })
      if (!updated.matchedCount) throw ApiError.conflict('Target assessment changed during import')
      questionsAttached = true
    }
    if (createNew && publishNewAssessment) {
      await Assessment.updateOne({ _id: assessment._id }, { $set: { isPublished: true, status: 'Active' } })
      assessment.isPublished = true
      assessment.status = 'Active'
    }
    const createdFingerprints = new Set((await Question.find({ _id: { $in: createdIds } }).select('importFingerprint').lean()).map((question) => question.importFingerprint))
    const rows = resultRows.map((row) => {
      if (row.status !== 'valid') return row
      if (createdFingerprints.has(row.fingerprint)) return { ...row, status: 'imported' }
      const duplicateError = { row: row.row, column: 'questionText', message: 'This question was imported by another request.' }
      parsed.errors.push(duplicateError)
      return { ...row, status: 'duplicate', error: duplicateError.message }
    })
    const importedQuestions = createdIds.length
    const skippedRows = rows.filter((row) => !['valid', 'imported'].includes(row.status)).length
    const summary = {
      state: 'COMPLETED', requestId, assessmentId: assessment._id, assessmentTitle: assessment.title,
      totalRows: parsed.totalRows, validQuestions: parsed.validQuestions, importedQuestions,
      skippedRows, blankRows: parsed.blankRows, errors: parsed.errors, rows: rows.map(({ fingerprint: _fingerprint, ...row }) => row),
    }
    importRecord.summary = summary
    await importRecord.save()
    return summary
  } catch (error) {
    const attached = await Question.find({ assessmentId: assessment._id, importRequestId: requestId }).select('_id').lean().catch(() => [])
    const attachedIds = attached.map((question) => question._id)
    if (questionsAttached && attachedIds.length) await Assessment.updateOne({ _id: assessment._id }, { $pull: { questions: { $in: attachedIds } } }).catch(() => {})
    if (attachedIds.length) await Question.deleteMany({ _id: { $in: attachedIds } }).catch(() => {})
    if (createNew) await Assessment.deleteOne({ _id: assessment._id }).catch(() => {})
    await AssessmentImport.deleteOne({ _id: importRecord._id }).catch(() => {})
    throw error
  }
}
