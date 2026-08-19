import type { Artifact, PipelineStep, TaskKind } from './types'

let counter = 0
export function uid(prefix = 'id'): string {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter}`
}

// Everything below feeds the visual pipeline preview in the chat; it goes away
// once the real worker streams step statuses over SSE.

const CODE_STEPS: Array<{ label: string; note: string }> = [
  { label: 'Analyzing assignment', note: '3s' },
  { label: 'Generating code', note: '21s' },
  { label: 'Compiling (dotnet build)', note: 'ok' },
  { label: 'Running tests', note: '12/12' },
  { label: 'Packaging', note: 'zip' },
]

const DOC_STEPS: Array<{ label: string; note: string }> = [
  { label: 'Analyzing topic', note: '2s' },
  { label: 'Outlining document', note: '6 sections' },
  { label: 'Writing content', note: '34s' },
  { label: 'Formatting & styling', note: 'GOST 7.32' },
  { label: 'Exporting to .docx', note: 'docx' },
]

export function buildSteps(kind: TaskKind): PipelineStep[] {
  const template = kind === 'code' ? CODE_STEPS : DOC_STEPS
  return template.map(({ label }, i) => ({
    id: uid('step'),
    label,
    status: i === 0 ? 'active' : 'pending',
  }))
}

export function stepNote(kind: TaskKind, index: number): string {
  const template = kind === 'code' ? CODE_STEPS : DOC_STEPS
  return template[index]?.note ?? ''
}

export function buildArtifact(kind: TaskKind, title: string): Artifact {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'solution'
  if (kind === 'code') {
    return {
      fileName: `${slug}.zip`,
      kind: 'zip',
      size: '46 KB',
      files: [
        { name: 'App/Program.cs', size: '4.1 KB' },
        { name: 'App/App.csproj', size: '0.4 KB' },
        { name: 'Tests/ProgramTests.cs', size: '3.2 KB' },
        { name: 'Tests/Tests.csproj', size: '0.5 KB' },
        { name: 'README.md', size: '1.1 KB' },
      ],
    }
  }
  return {
    fileName: `${slug}.docx`,
    kind: 'docx',
    size: '128 KB',
    files: [
      { name: 'Title page', size: '1 p.' },
      { name: 'Contents', size: '1 p.' },
      { name: 'Main sections', size: '9 p.' },
      { name: 'References', size: '1 p.' },
    ],
  }
}
