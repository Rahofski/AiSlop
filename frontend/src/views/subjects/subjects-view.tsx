import { useState } from 'react'
import { LayoutGrid, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useCreateSubject, useSubjects } from '@/api/hooks'
import { useApp } from '@/lib/store'
import { formatRelativeDay } from '@/lib/format'

function AddSubjectDialog() {
  const createSubject = useCreateSubject()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [teacher, setTeacher] = useState('')

  const submit = async () => {
    if (!name.trim() || createSubject.isPending) return
    try {
      await createSubject.mutateAsync({ name: name.trim(), teacher: teacher.trim() })
      setName('')
      setTeacher('')
      setOpen(false)
    } catch {
      toast.error('Could not create the subject. Is the API running?')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus data-icon="inline-start" />
          Add subject
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-100">
        <DialogHeader>
          <DialogTitle>Add subject</DialogTitle>
          <DialogDescription>Courses group your tasks and history.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-1">
          <div className="flex flex-col gap-2">
            <Label htmlFor="subject-name">Name</Label>
            <Input
              id="subject-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="e.g. Computer Networks"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="subject-teacher">Teacher (optional)</Label>
            <Input
              id="subject-teacher"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="e.g. N. P. Ivanova"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim() || createSubject.isPending}>
            {createSubject.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SubjectsView() {
  const { data: subjects, isLoading } = useSubjects()
  const { openHistoryForSubject } = useApp()

  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-245 px-9 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-[22px] font-bold tracking-tight">Subjects</h1>
          <AddSubjectDialog />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-29 rounded-xl" />
            ))}
          </div>
        ) : subjects && subjects.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                type="button"
                onClick={() => openHistoryForSubject(subject.id)}
                className="rounded-xl border bg-card p-4.5 text-left shadow-xs transition-colors hover:border-primary/50"
              >
                <p className="text-[15.5px] font-bold">{subject.name}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{subject.teacher || '—'}</p>
                <p className="mt-3 text-[12.5px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{subject.task_count}</span>{' '}
                  {subject.task_count === 1 ? 'task' : 'tasks'}
                  {subject.last_task_at !== null && (
                    <> · last: {formatRelativeDay(Date.parse(subject.last_task_at))}</>
                  )}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-14 text-muted-foreground">
            <LayoutGrid className="size-5" />
            <p className="text-[13.5px]">No subjects yet — add your first course</p>
          </div>
        )}
      </div>
    </div>
  )
}
