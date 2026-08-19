import { Download, FileArchive, FileText, FlaskConical } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { Artifact } from '@/lib/types'

export function ResultCard({ artifact }: { artifact: Artifact }) {
  const Icon = artifact.kind === 'zip' ? FileArchive : FileText

  return (
    <div className="w-105 max-w-full rounded-xl border bg-card shadow-xs">
      <div className="flex items-center gap-3 p-4.5">
        <div className="flex size-9.5 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-semibold">{artifact.fileName}</p>
          <p className="text-xs text-muted-foreground">
            ready · {artifact.kind === 'zip' ? 'compiled & tested' : 'formatted'} · {artifact.size}
          </p>
        </div>
      </div>
      <Separator />
      <div className="flex flex-col gap-1.5 px-4.5 py-3">
        {artifact.files.map((file) => (
          <div key={file.name} className="flex items-center justify-between font-mono text-xs">
            <span className="truncate text-foreground/80">{file.name}</span>
            <span className="ml-4 shrink-0 text-muted-foreground">{file.size}</span>
          </div>
        ))}
      </div>
      <Separator />
      <div className="flex gap-2 p-4">
        <Button
          size="sm"
          onClick={() => toast.info('Downloads arrive with the real backend', { description: 'This is a UI prototype running on mock data.' })}
        >
          <Download data-icon="inline-start" />
          Download {artifact.kind === 'zip' ? 'archive' : 'file'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => toast.info('Test report will be available once the pipeline is real')}
        >
          <FlaskConical data-icon="inline-start" />
          Test report
        </Button>
      </div>
    </div>
  )
}
