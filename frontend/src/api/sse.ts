import { getToken } from './client'

export interface ApiStep {
  id: string
  idx: number
  step_id: string
  label: string
  status: 'pending' | 'active' | 'done' | 'failed'
  note: string | null
}

export type TaskStreamEvent =
  | {
      type: 'snapshot'
      task: { id: string; status: string; error_summary: string | null }
      steps: ApiStep[]
    }
  | { type: 'step'; task_id: string; step: ApiStep }
  | { type: 'task'; task_id: string; status: string; error_summary: string | null }
  | { type: 'ping' }

/**
 * Subscribe to a task's SSE stream. Uses fetch instead of EventSource so the
 * JWT travels in the Authorization header rather than the URL.
 * Returns an abort function.
 */
export function streamTaskEvents(
  taskId: string,
  onEvent: (event: TaskStreamEvent) => void,
  onError: () => void,
): () => void {
  const controller = new AbortController()

  ;(async () => {
    const response = await fetch(`/api/tasks/${taskId}/events`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      signal: controller.signal,
    })
    if (!response.ok || !response.body) throw new Error(`SSE failed: ${response.status}`)

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let separator
      while ((separator = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, separator)
        buffer = buffer.slice(separator + 2)
        const data = rawEvent
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('\n')
        if (!data) continue
        try {
          onEvent(JSON.parse(data) as TaskStreamEvent)
        } catch {
          // Malformed frame — skip it.
        }
      }
    }
  })().catch(() => {
    if (!controller.signal.aborted) onError()
  })

  return () => controller.abort()
}
