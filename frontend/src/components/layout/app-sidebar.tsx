import { History, LayoutGrid, LogOut, MessageSquarePlus, Moon, Sparkles, Sun } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSubjects } from '@/api/hooks'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import type { View } from '@/lib/types'

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]!.toUpperCase())
      .join('') || '?'
  )
}

const NAV_ITEMS: Array<{ view: View; label: string; icon: typeof History }> = [
  { view: 'chat', label: 'New task', icon: MessageSquarePlus },
  { view: 'subjects', label: 'Subjects', icon: LayoutGrid },
  { view: 'history', label: 'History', icon: History },
]

export function AppSidebar() {
  const { view, navigate, openHistoryForSubject } = useApp()
  const { data: subjects = [] } = useSubjects()
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()

  return (
    <aside className="flex w-62 shrink-0 flex-col border-r bg-sidebar">
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4.5" />
        </div>
        <span className="text-[17px] font-bold tracking-tight">AI-Helper</span>
      </div>

      <nav className="flex flex-col gap-0.5 px-2.5">
        {NAV_ITEMS.map(({ view: itemView, label, icon: Icon }) => (
          <button
            key={itemView}
            type="button"
            onClick={() => navigate(itemView)}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
              view === itemView
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        <p className="px-4.5 pb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          Subjects
        </p>
        <div className="flex-1 overflow-y-auto px-2.5">
          {subjects.length === 0 && (
            <p className="px-2.5 py-1.5 text-[12px] text-muted-foreground/70">No subjects yet</p>
          )}
          {subjects.map((subject) => (
            <button
              key={subject.id}
              type="button"
              onClick={() => openHistoryForSubject(subject.id)}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-muted"
            >
              <span className="truncate text-[13px] text-foreground/80">{subject.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {subject.task_count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2.5 border-t px-4 py-3.5">
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initialsOf(user?.name ?? '')}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">{user?.name}</p>
          <p className="truncate text-[11.5px] text-muted-foreground">{user?.email}</p>
        </div>
        <div className="ml-auto flex">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
                onClick={toggle}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun /> : <Moon />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
                onClick={logout}
                aria-label="Sign out"
              >
                <LogOut />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  )
}
