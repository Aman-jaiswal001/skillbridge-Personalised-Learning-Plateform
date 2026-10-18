import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest, extractData } from '../../api/client'
import Button from '../../components/common/Button'
import PageContainer from '../../components/common/PageContainer'
import { useToast } from '../../context/ToastContext'

const quizTopics = ['Sampling Methods', 'Data Visualization', 'Official Statistics', 'Python Basics', 'Survey Design']

export default function QuizGenerator() {
  const [topic, setTopic] = useState('Sampling Methods')
  const [count, setCount] = useState(10)
  const [difficulty, setDifficulty] = useState('Medium')
  const [type, setType] = useState('MCQ')
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { push } = useToast()

  async function generate() {
    setLoading(true)
    try {
      const payload = await apiRequest('/quiz/generate', {
        method: 'POST',
        body: { topic, numberOfQuestions: Number(count), difficulty, questionType: type },
      })
      localStorage.setItem('skillbridge_current_quiz', JSON.stringify(extractData(payload)))
      push('Quiz generated from your topic')
      navigate('/quiz')
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer title="Generate Quiz from Your Material" subtitle="Create practice questions from documents or competency topics.">
      <div className="mx-auto max-w-2xl space-y-4">
        <label className="block cursor-pointer rounded-xl border-2 border-dashed border-indigo-200 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-navy">Click to select reference material</p>
          <p className="mt-1 text-xs text-muted">Quiz generation works from topic; use Assistant for document upload and Q&A.</p>
          {fileName ? <p className="mt-2 text-xs text-primary">{fileName}</p> : null}
          <input
            type="file"
            className="hidden"
            accept=".pdf,.ppt,.pptx,.doc,.docx"
            onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold">
            Topic
            <select className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm" value={topic} onChange={(e) => setTopic(e.target.value)}>
              {quizTopics.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold">
            Number of Questions
            <input
              type="number"
              min="1"
              max="20"
              className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm"
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </label>
          <label className="text-xs font-semibold">
            Difficulty Level
            <select className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </label>
          <label className="text-xs font-semibold">
            Question Type
            <select className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
              <option>MCQ</option>
              <option>True/False</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {quizTopics.map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={`rounded-full border px-3 py-1.5 text-xs ${topic === t ? 'border-primary bg-indigo-50 text-primary' : 'border-line bg-white'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <Button className="w-full" onClick={generate} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Quiz'}
        </Button>
      </div>
    </PageContainer>
  )
}
