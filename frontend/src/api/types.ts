export interface ApiSubject {
  id: string
  name: string
  teacher: string
  task_count: number
  last_task_at: string | null
}

export interface ApiTask {
  id: string
  subject_id: string
  tasktype_id: string
  kind: 'code' | 'doc'
  title: string
  status: 'queued' | 'running' | 'done' | 'failed'
  error_summary: string | null
  created_at: string
  artifact_filename: string | null
}

export interface TaskFilters {
  subject_id?: string
  status?: string
  kind?: string
  days?: number
}
