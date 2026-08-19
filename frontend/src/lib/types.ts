export type View = 'chat' | 'subjects' | 'history'

export type TaskKind = 'code' | 'doc'

export type StepStatus = 'pending' | 'active' | 'done' | 'failed'

export interface PipelineStep {
  id: string
  idx?: number
  label: string
  status: StepStatus
  note?: string
}

export interface ArtifactFile {
  name: string
  size: string
}

export interface Artifact {
  fileName: string
  kind: 'zip' | 'docx'
  size: string
  files: ArtifactFile[]
}

export type ChatMessage =
  | { id: string; type: 'user'; text: string; subjectName: string; sentAt: number }
  | { id: string; type: 'pipeline'; steps: PipelineStep[] }
  | { id: string; type: 'result'; artifact: Artifact }
  | { id: string; type: 'done' }
  | { id: string; type: 'error'; summary: string }
