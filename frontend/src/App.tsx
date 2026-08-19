import { Loader2 } from 'lucide-react'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { useApp } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { AuthScreen } from '@/views/auth/auth-screen'
import { ChatView } from '@/views/chat/chat-view'
import { HistoryView } from '@/views/history/history-view'
import { SubjectsView } from '@/views/subjects/subjects-view'

export default function App() {
  const { view } = useApp()
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) return <AuthScreen />

  return (
    <div className="flex h-dvh overflow-hidden">
      <AppSidebar />
      {view === 'chat' && <ChatView />}
      {view === 'subjects' && <SubjectsView />}
      {view === 'history' && <HistoryView />}
    </div>
  )
}
