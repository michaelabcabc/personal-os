'use client'

import { useState } from 'react'
import { Plus, Zap, User, Bot, Trash2, MessageSquare, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import useSWR, { mutate } from 'swr'
import type { Action, Goal } from '@/lib/db/schema'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const execTypeIcon = {
  user: <User className="w-3 h-3" />,
  ai_assist: <Bot className="w-3 h-3 text-blue-400" />,
  ai_exec: <Zap className="w-3 h-3 text-yellow-400" />,
}

const execTypeLabel = {
  user: 'You',
  ai_assist: 'AI helps',
  ai_exec: 'AI does',
}

interface ActionsWidgetProps {
  onChatOpen: () => void
}

export default function ActionsWidget({ onChatOpen }: ActionsWidgetProps) {
  const { data: actions = [], isLoading } = useSWR<Action[]>('/api/actions', fetcher)
  const { data: goals = [] } = useSWR<Goal[]>('/api/goals', fetcher)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const addAction = async () => {
    if (!newTitle.trim()) return
    await fetch('/api/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim() }),
    })
    mutate('/api/actions')
    setNewTitle('')
    setAdding(false)
  }

  const toggleStatus = async (id: string, status: string) => {
    await fetch(`/api/actions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status === 'active' ? 'paused' : 'active' }),
    })
    mutate('/api/actions')
  }

  const deleteAction = async (id: string) => {
    await fetch(`/api/actions/${id}`, { method: 'DELETE' })
    mutate('/api/actions')
  }

  const activeActions = actions.filter(a => a.status === 'active')

  return (
    <div className="widget-card group">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-widget-actions" />
          <h2 className="widget-title text-widget-actions">Actions</h2>
          <span className="text-xs text-white/30">{activeActions.length} active</span>
        </div>
        <div className="flex gap-1">
          <button onClick={onChatOpen} className="widget-action-btn" title="Chat about actions">
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setAdding(true)} className="widget-action-btn" title="Add action">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5 flex-1 overflow-y-auto">
        {isLoading && <div className="text-white/30 text-sm text-center py-4">Loading...</div>}

        {!isLoading && actions.length === 0 && !adding && (
          <div className="text-white/25 text-sm text-center py-6">
            <Zap className="w-6 h-6 mx-auto mb-2 opacity-30" />
            <p>No actions yet. Define what you'll do regularly.</p>
          </div>
        )}

        {actions.map(action => {
          const goal = goals.find(g => g.id === action.goalId)
          const type = action.executionType as keyof typeof execTypeIcon
          return (
            <div key={action.id} className={cn(
              'flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-white/6 transition-colors group/item',
              action.status === 'active' ? 'bg-white/3' : 'bg-white/1 opacity-50'
            )}>
              <button
                onClick={() => toggleStatus(action.id, action.status)}
                className={cn('mt-0.5 flex-shrink-0 p-1 rounded', action.status === 'active' ? 'text-widget-actions' : 'text-white/30')}
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium leading-snug">{action.title}</p>
                  <span className="flex items-center gap-0.5 text-xs text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                    {execTypeIcon[type] ?? execTypeIcon.user}
                    {execTypeLabel[type] ?? 'You'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {action.frequency && (
                    <span className="text-xs text-white/30">{action.frequency}</span>
                  )}
                  {goal && (
                    <span className="text-xs text-widget-actions/60 truncate">{goal.title}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteAction(action.id)}
                className="opacity-0 group-hover/item:opacity-100 text-white/30 hover:text-red-400 transition-all flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}

        {adding && (
          <div className="flex gap-2 p-2.5 rounded-lg bg-white/5 border border-widget-actions/30">
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addAction(); if (e.key === 'Escape') setAdding(false) }}
              placeholder="Action title..."
              className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
            />
            <button onClick={addAction} className="text-widget-actions text-xs font-medium hover:opacity-80">Add</button>
            <button onClick={() => setAdding(false)} className="text-white/30 text-xs hover:opacity-80">✕</button>
          </div>
        )}
      </div>
    </div>
  )
}
