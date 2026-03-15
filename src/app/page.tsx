'use client'

export const dynamic = 'force-dynamic'

import { useState, useCallback, useEffect } from 'react'
import { mutate } from 'swr'
import { today } from '@/lib/utils'
import { Cpu, LogOut, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ChatPanel from '@/components/ChatPanel'
import TodayWidget from '@/components/widgets/TodayWidget'
import GoalsWidget from '@/components/widgets/GoalsWidget'
import ActionsWidget from '@/components/widgets/ActionsWidget'
import IdeasWidget from '@/components/widgets/IdeasWidget'
import type { ChatContext } from '@/lib/ai'
import type { User } from '@supabase/supabase-js'

export default function Home() {
  const [chatContext, setChatContext] = useState<ChatContext | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleChatAction = useCallback(async (action: Record<string, unknown>) => {
    const type = action.action as string
    if (type === 'create_goal') {
      await fetch('/api/goals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: action.title, description: action.description, period: action.period }),
      })
      mutate('/api/goals')
    }
    if (type === 'create_action') {
      await fetch('/api/actions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId: action.goalId, title: action.title, description: action.description, frequency: action.frequency, executionType: action.executionType }),
      })
      mutate('/api/actions')
    }
    if (type === 'create_idea') {
      await fetch('/api/ideas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: action.content, summary: action.summary, category: action.category, tags: action.tags, expanded: action.expanded }),
      })
      mutate('/api/ideas')
    }
    if (type === 'create_today_task') {
      await fetch('/api/today', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: action.title, description: action.description, executionType: action.executionType, date: today() }),
      })
      mutate(`/api/today?date=${today()}`)
    }
  }, [])

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-6 py-3 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-white/50" />
            <span className="font-semibold text-white/80 text-sm tracking-tight">Personal OS</span>
          </div>
          <div className="flex-1" />

          {/* User menu */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/8 transition-colors"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs font-medium">
                    {userName[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-white/60 max-w-[120px] truncate">{userName}</span>
                <ChevronDown className="w-3 h-3 text-white/30" />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden">
                    <div className="px-3 py-2 border-b border-white/8">
                      <p className="text-xs text-white/40 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={signOut}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/8 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </header>

        {/* Widget Grid */}
        <main className="flex-1 p-5 overflow-auto">
          <div className="grid grid-cols-2 gap-4 h-full" style={{ gridTemplateRows: '1fr 1fr' }}>
            <TodayWidget onChatOpen={() => setChatContext('today')} />
            <GoalsWidget onChatOpen={() => setChatContext('goals')} onAction={handleChatAction} />
            <ActionsWidget onChatOpen={() => setChatContext('actions')} />
            <IdeasWidget onChatOpen={() => setChatContext('ideas')} />
          </div>
        </main>
      </div>

      {/* Chat Panel */}
      {chatContext && (
        <div className="w-[380px] flex-shrink-0 border-l border-white/8">
          <ChatPanel
            context={chatContext}
            onClose={() => setChatContext(null)}
            onAction={handleChatAction}
          />
        </div>
      )}
    </div>
  )
}
