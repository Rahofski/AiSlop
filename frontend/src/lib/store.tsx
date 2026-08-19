import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { streamTaskEvents, type ApiStep } from '@/api/sse'
import type { ChatMessage, PipelineStep, View } from './types'

let counter = 0
function uid(prefix = 'id'): string {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter}`
}

interface TrackTaskArgs {
  taskId: string
  prompt: string
  subjectName: string
  onSettled: () => void
}

interface AppState {
  view: View
  messages: ChatMessage[]
  isRunning: boolean
  historySubjectFilter: string
  navigate: (view: View) => void
  openHistoryForSubject: (subjectId: string) => void
  setHistorySubjectFilter: (subjectId: string) => void
  trackTask: (args: TrackTaskArgs) => void
}

const AppContext = createContext<AppState | null>(null)

function toStep(step: ApiStep): PipelineStep {
  return {
    id: step.id,
    idx: step.idx,
    label: step.label,
    status: step.status,
    note: step.note ?? undefined,
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('chat')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [historySubjectFilter, setHistorySubjectFilter] = useState('all')
  const stopStreamRef = useRef<(() => void) | null>(null)

  const navigate = useCallback((next: View) => {
    setView(next)
    if (next === 'history') setHistorySubjectFilter('all')
  }, [])

  const openHistoryForSubject = useCallback((subjectId: string) => {
    setHistorySubjectFilter(subjectId)
    setView('history')
  }, [])

  // Follow a created task over SSE: live pipeline card in the chat.
  const trackTask = useCallback(({ taskId, prompt, subjectName, onSettled }: TrackTaskArgs) => {
    const pipelineId = uid('msg')
    let settled = false

    setIsRunning(true)
    setMessages((prev) => [
      ...prev,
      { id: uid('msg'), type: 'user', text: prompt, subjectName, sentAt: Date.now() },
      { id: pipelineId, type: 'pipeline', steps: [] },
    ])

    const setSteps = (updater: (steps: PipelineStep[]) => PipelineStep[]) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === pipelineId && msg.type === 'pipeline'
            ? { ...msg, steps: updater(msg.steps) }
            : msg,
        ),
      )
    }

    const finish = (status: string, errorSummary: string | null) => {
      if (settled) return
      settled = true
      stopStreamRef.current?.()
      stopStreamRef.current = null
      setMessages((prev) => [
        ...prev,
        status === 'done'
          ? { id: uid('msg'), type: 'done' }
          : {
              id: uid('msg'),
              type: 'error',
              summary: errorSummary ?? 'The task failed. Check the logs and try again.',
            },
      ])
      setIsRunning(false)
      onSettled()
    }

    stopStreamRef.current = streamTaskEvents(
      taskId,
      (event) => {
        if (event.type === 'snapshot') {
          setSteps(() => event.steps.map(toStep).sort((a, b) => (a.idx ?? 0) - (b.idx ?? 0)))
          if (event.task.status === 'done' || event.task.status === 'failed') {
            finish(event.task.status, event.task.error_summary)
          }
        } else if (event.type === 'step') {
          const incoming = toStep(event.step)
          setSteps((steps) => {
            const next = steps.filter((s) => s.id !== incoming.id)
            next.push(incoming)
            return next.sort((a, b) => (a.idx ?? 0) - (b.idx ?? 0))
          })
        } else if (event.type === 'task') {
          if (event.status === 'done' || event.status === 'failed') {
            finish(event.status, event.error_summary)
          }
        }
      },
      () => finish('failed', 'Lost connection to the server while tracking the task.'),
    )
  }, [])

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
        trackTask,
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
