import { useEffect, useRef } from 'react'
import { AlertCircle, Sparkles } from 'lucide-react'
import { useApp } from '@/lib/store'
import { formatTime } from '@/lib/format'
import { Composer } from './composer'
import { PipelineCard } from './pipeline-card'
import { ResultCard } from './result-card'

export function ChatView() {
  const { messages } = useApp()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-baseline gap-3 border-b bg-sidebar px-7 py-4">
        <h1 className="text-base font-bold">New task</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-7">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-6" />
            </div>
            <div>
              <p className="font-semibold">Paste your assignment below</p>
              <p className="mt-1 max-w-90 text-[13px] text-muted-foreground">
                The pipeline will generate, compile, test and package the solution — you get a
                ready-to-submit file.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-190 flex-col gap-4.5">
            {messages.map((msg) => {
              if (msg.type === 'user') {
                return (
                  <div key={msg.id} className="flex flex-col items-end gap-1">
                    <div className="max-w-140 rounded-2xl rounded-br-md bg-primary px-4 py-3 text-[14.5px] leading-relaxed whitespace-pre-wrap text-primary-foreground">
                      {msg.text}
                    </div>
                    <p className="text-[11.5px] text-muted-foreground">
                      {msg.subjectName} · {formatTime(msg.sentAt)}
                    </p>
                  </div>
                )
              }
              if (msg.type === 'pipeline') return <PipelineCard key={msg.id} steps={msg.steps} />
              if (msg.type === 'result') return <ResultCard key={msg.id} artifact={msg.artifact} />
              return (
                <div
                  key={msg.id}
                  className="flex w-105 max-w-full items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-[13.5px] text-destructive"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  {msg.summary}
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <Composer />
    </div>
  )
}
