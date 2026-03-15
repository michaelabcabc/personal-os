'use client'

import { useState } from 'react'
import { Plus, Target, CheckCircle2, Pause, Trash2, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import useSWR, { mutate } from 'swr'
import type { Goal } from '@/lib/db/schema'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const statusIcon = {
  active: <Target className="w-3.5 h-3.5 text-widget-goals" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5 text-white/40" />,
  paused: <Pause className="w-3.5 h-3.5 text-yellow-500" />,
}

interface GoalsWidgetProps {
  onChatOpen: () => void
  onAction: (action: Record<string, unknown>) => void
}

export default function GoalsWidget({ onChatOpen, onAction }: GoalsWidgetProps) {
  const { data: goals = [], isLoading } = useSWR<Goal[]>('/api/goals', fetcher)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const addGoal = async () => {
    if (!newTitle.trim()) return
    await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim() }),
    })
    mutate('/api/goals')
    setNewTitle('')
    setAdding(false)
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    mutate('/api/goals')
  }

  const deleteGoal = async (id: string) => {
    await fetch(`/api/goals/${id}`, { method: 'DELETE' })
    mutate('/api/goals')
  }

  return (
    <div className="widget-card group">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-widget-goals" />
          <h2 className="widget-title text-widget-goals">Goals</h2>
          <span className="text-xs text-white/30">{goals.filter(g => g.status === 'active').length} active</span>
        </div>
        <div className="flex gap-1">
          <button onClick={onChatOpen} className="widget-action-btn" title="Chat about goals">
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setAdding(true)} className="widget-action-btn" title="Add goal">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5 flex-1 overflow-y-auto">
        {isLoading && <div className="text-white/30 text-sm text-center py-4">Loading...</div>}

        {!isLoading && goals.length === 0 && !adding && (
          <div className="text-white/25 text-sm text-center py-6">
            <Target className="w-6 h-6 mx-auto mb-2 opacity-30" />
            <p>No goals yet. Add one or chat with AI.</p>
          </div>
        )}

        {goals.map(goal => (
          <div key={goal.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/3 hover:bg-white/6 transition-colors group/item">
            <button
              onClick={() => updateStatus(goal.id, goal.status === 'active' ? 'completed' : 'active')}
              className="mt-0.5 flex-shrink-0"
            >
              {statusIcon[goal.status as keyof typeof statusIcon] ?? statusIcon.active}
            </button>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium leading-snug', goal.status !== 'active' && 'opacity-40 line-through')}>
                {goal.title}
              </p>
              {goal.description && (
                <p className="text-xs text-white/40 mt-0.5 leading-snug">{goal.description}</p>
              )}
              {goal.period && (
                <span className="text-xs text-widget-goals/60 mt-1 inline-block">{goal.period}</span>
              )}
            </div>
            <button
              onClick={() => deleteGoal(goal.id)}
              className="opacity-0 group-hover/item:opacity-100 text-white/30 hover:text-red-400 transition-all flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {adding && (
          <div className="flex gap-2 p-2.5 rounded-lg bg-white/5 border border-widget-goals/30">
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addGoal(); if (e.key === 'Escape') setAdding(false) }}
              placeholder="Goal title..."
              className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
            />
            <button onClick={addGoal} className="text-widget-goals text-xs font-medium hover:opacity-80">Add</button>
            <button onClick={() => setAdding(false)} className="text-white/30 text-xs hover:opacity-80">✕</button>
          </div>
        )}
      </div>
    </div>
  )
}
