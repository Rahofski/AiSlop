import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Code2, FileText, Paperclip, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCreateTask, useSubjects } from '@/api/hooks'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/store'
import type { TaskKind } from '@/lib/types'

const KIND_OPTIONS: Array<{ kind: TaskKind; label: string; icon: typeof Code2 }> = [
  { kind: 'code', label: 'Code', icon: Code2 },
  { kind: 'doc', label: 'Document', icon: FileText },
]

// Until the TaskType registry is exposed by the API, the kind toggle maps to
// the two known type ids.
const TASKTYPE_BY_KIND: Record<TaskKind, string> = {
  code: 'csharp-console',
  doc: 'docx-report',
}

export function Composer() {
  const { data: subjects = [] } = useSubjects()
  const createTask = useCreateTask()
  const queryClient = useQueryClient()
  const { isRunning, trackTask } = useApp()
  const [draft, setDraft] = useState('')
  const [kind, setKind] = useState<TaskKind>('code')
  const [subjectChoice, setSubjectChoice] = useState('')
  // Fall back to the first subject until the user explicitly picks one.
  const subjectId = subjectChoice || subjects[0]?.id || ''

  const canSubmit =
    draft.trim().length > 0 && subjectId !== '' && !isRunning && !createTask.isPending

  const submit = async () => {
    if (!canSubmit) return
    const prompt = draft.trim()
    const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? ''
    let task
    try {
      task = await createTask.mutateAsync({
        prompt_text: prompt,
        subject_id: subjectId,
        tasktype_id: TASKTYPE_BY_KIND[kind],
      })
    } catch {
      toast.error('Could not submit the task. Is the API running?')
      return
    }
    setDraft('')
    trackTask({
      taskId: task.id,
      prompt,
      subjectName,
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        queryClient.invalidateQueries({ queryKey: ['subjects'] })
      },
    })
  }

  return (
    <div className="border-t bg-sidebar px-6 py-4">
      <div className="mx-auto flex max-w-190 flex-col gap-2.5">
        <div className="flex items-center gap-2.5">
          <Select value={subjectId} onValueChange={setSubjectChoice}>
            <SelectTrigger size="sm" className="bg-card">
              <SelectValue placeholder={subjects.length === 0 ? 'Add a subject first' : 'Subject'} />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex rounded-lg border bg-card p-0.5">
            {KIND_OPTIONS.map(({ kind: option, label, icon: Icon }) => (
              <button
                key={option}
                type="button"
                onClick={() => setKind(option)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors',
                  kind === option
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <Paperclip className="size-3.5" />
                attach guidelines if needed
              </span>
            </TooltipTrigger>
            <TooltipContent>File attachments arrive in a later phase</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-end gap-2.5">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                submit()
              }
            }}
            rows={3}
            placeholder="Paste the assignment: what to build, which language, professor's requirements…"
            className="min-h-20 resize-none bg-card"
          />
          <Button onClick={submit} disabled={!canSubmit} className="h-10 px-4">
            {isRunning || createTask.isPending ? 'Solving…' : 'Solve'}
            {!isRunning && !createTask.isPending && (
              <Send data-icon="inline-end" className="size-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
