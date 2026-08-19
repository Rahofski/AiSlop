import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { buildArtifact, buildSteps, stepNote, uid } from './mock'
import type { ChatMessage, TaskKind, View } from './types'

interface AppState {
  view: View
  messages: ChatMessage[]
  isRunning: boolean
  historySubjectFilter: string
  navigate: (view: View) => void
  openHistoryForSubject: (subjectId: string) => void
  setHistorySubjectFilter: (subjectId: string) => void
  runSimulation: (args: {
    prompt: string
    subjectName: string
    kind: TaskKind
    onFinished: () => void
  }) => void
}

const AppContext = createContext<AppState | null>(null)

const STEP_INTERVAL_MS = 900
const FIRST_STEP_DELAY_MS = 400

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('chat')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [historySubjectFilter, setHistorySubjectFilter] = useState('all')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const navigate = useCallback((next: View) => {
    setView(next)
    if (next === 'history') setHistorySubjectFilter('all')
  }, [])

  const openHistoryForSubject = useCallback((subjectId: string) => {
    setHistorySubjectFilter(subjectId)
    setView('history')
  }, [])

  // Visual preview of the job pipeline; replaced by SSE from the backend once
  // the worker exists. The real task record is created via POST /api/tasks.
  const runSimulation = useCallback(
    ({
      prompt,
      subjectName,
      kind,
      onFinished,
    }: {
      prompt: string
      subjectName: string
      kind: TaskKind
      onFinished: () => void
    }) => {
      const title = prompt.trim().replace(/\s+/g, ' ').slice(0, 48)
      const shouldFail = /\bfail\b/i.test(prompt)
      const steps = buildSteps(kind)
      const pipelineId = uid('msg')

      setIsRunning(true)
      setMessages((prev) => [
        ...prev,
        { id: uid('msg'), type: 'user', text: prompt, subjectName, sentAt: Date.now() },
        { id: pipelineId, type: 'pipeline', steps },
      ])

      const failAt = shouldFail ? steps.length - 2 : -1
      let index = 0

      const advance = () => {
        const failed = index === failAt
        const done = index >= steps.length - 1 && !failed

        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== pipelineId || msg.type !== 'pipeline') return msg
            return {
              ...msg,
              steps: msg.steps.map((step, i) => {
                if (i < index) return step
                if (i === index)
                  return {
                    ...step,
                    status: failed ? 'failed' : 'done',
                    note: failed ? 'error' : stepNote(kind, i),
                  }
                if (i === index + 1 && !failed) return { ...step, status: 'active' }
                return step
              }),
            }
          }),
        )

        if (failed || done) {
          setMessages((prev) => [
            ...prev,
            failed
              ? {
                  id: uid('msg'),
                  type: 'error',
                  summary:
                    'Tests kept failing after 3 repair attempts. Check the assignment wording or try again.',
                }
              : { id: uid('msg'), type: 'result', artifact: buildArtifact(kind, title) },
          ])
          setIsRunning(false)
          timerRef.current = null
          onFinished()
          return
        }

        index += 1
        timerRef.current = setTimeout(advance, STEP_INTERVAL_MS)
      }

      timerRef.current = setTimeout(advance, FIRST_STEP_DELAY_MS)
    },
    [],
  )

  return (
    <AppContext.Provider
      value={{
        view,
        messages,
        isRunning,
        historySubjectFilter,
        navigate,
        openHistoryForSubject,
        setHistorySubjectFilter,
        runSimulation,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
