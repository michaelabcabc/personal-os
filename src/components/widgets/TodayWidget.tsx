'use client'

import { useState } from 'react'
import { Plus, Calendar, Check, SkipForward, Zap, User, Bot, Loader2, MessageSquare, Sparkles, Trash2 } from 'lucide-react'
import { cn, today, formatDate } from '@/lib/utils'
import useSWR, { mutate } from 'swr'
import type { TodayTask } from '@/lib/db/schema'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const statusConfig = {
  pending: { label: 'Pending', className: 'text-white/50' },
  done: { label: 'Done', className: 'text-green-400 line-through opacity-60' },
  skipped: { label: 'Skipped', className: 'text-white/30 line-through opacity-40' },
  ai_running: { label: 'AI Running', className: 'text-yellow-400' },
  ai_done: { label: 'AI Done', className: 'text-green-400 opacity-70' },
}

const execIcon = {
  user: <User className="w-3 h-3 text-white/40" />,
  ai_assist: <Bot className="w-3 h-3 text-blue-400" />,
  ai_exec: <Zap className="w-3 h-3 text-yellow-400" />,
}

interface TodayWidgetProps {
  onChatOpen: () => void
}

export default function TodayWidget({ onChatOpen }: TodayWidgetProps) {
  const date = today()
  const { data: tasks = [], isLoading } = useSWR<TodayTask[]>(`/api/today?date=${date}`, fetcher)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [generating, setGenerating] = useState(false)

  const doneCount = tasks.filter(t => t.status === 'done' || t.status === 'ai_done').length

  const updateTask = async (id: string, update: Partial<TodayTask>) => {
    await fetch(`/api/today/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })
    mutate(`/api/today?date=${date}`)
  }

  const deleteTask = async (id: string) => {
    await fetch(`/api/today/${id}`, { method: 'DELETE' })
    mutate(`/api/today?date=${date}`)
  }

  const addTask = async () => {
    if (!newTitle.trim()) return
    await fetch('/api/today', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), date }),
    })
    mutate(`/api/today?date=${date}`)
    setNewTitle('')
    setAdding(false)
  }

  const generateTasks = async () => {
    setGenerating(true)
    await fetch('/api/today/generate', { method: 'POST' })
    mutate(`/api/today?date=${date}`)
    setGenerating(false)
  }

  return (
    <div className="widget-card group">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-widget-today" />
          <h2 className="widget-title text-widget-today">Today</h2>
          <span className="text-xs text-white/30">{formatDate(new Date())}</span>
          {tasks.length > 0 && (
            <span className="text-xs text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
              {doneCount}/{tasks.length}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={onChatOpen} className="widget-action-btn" title="Chat about today">
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button onClick={generateTasks} disabled={generating} className="widget-action-btn" title="AI generate tasks">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setAdding(true)} className="widget-action-btn" title="Add task">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="h-1 bg-white/5 rounded-full mb-3">
          <div
            className="h-full bg-widget-today rounded-full transition-all duration-500"
            style={{ width: `${(doneCount / tasks.length) * 100}%` }}
          />
        </div>
      )}

      <div className="space-y-1.5 flex-1 overflow-y-auto">
        {isLoading && <div className="text-white/30 text-sm text-center py-4">Loading...</div>}

        {!isLoading && tasks.length === 0 && !adding && (
          <div className="text-white/25 text-sm text-center py-6">
            <Calendar className="w-6 h-6 mx-auto mb-2 opacity-30" />
            <p>No tasks for today.</p>
            <button
              onClick={generateTasks}
              disabled={generating}
              className="mt-2 text-widget-today text-xs hover:opacity-80 flex items-center gap-1 mx-auto"
            >
              <Sparkles className="w-3 h-3" />
              Generate with AI
            </button>
          </div>
        )}

        {tasks.map(task => {
          const statusCfg = statusConfig[task.status as keyof typeof statusConfig] ?? statusConfig.pending
          const execType = task.executionType as keyof typeof execIcon
          const isDone = task.status === 'done' || task.status === 'ai_done'

          return (
            <div key={task.id} className={cn(
              'flex items-start gap-2.5 p-2.5 rounded-lg transition-colors group/item',
              isDone ? 'bg-white/2 opacity-60' : 'bg-white/3 hover:bg-white/6'
            )}>
              {/* Check button */}
              <button
                onClick={() => updateTask(task.id, { status: isDone ? 'pending' : 'done' })}
                className={cn(
                  'mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all',
                  isDone
                    ? 'bg-widget-today border-widget-today'
                    : 'border-white/20 hover:border-widget-today'
                )}
              >
                {isDone && <Check className="w-2.5 h-2.5 text-white" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {execIcon[execType] ?? execIcon.user}
                  <p className={cn('text-sm leading-snug', statusCfg.className)}>
                    {task.title}
                  </p>
                </div>
                {task.description && (
                  <p className="text-xs text-white/30 mt-0.5 leading-snug">{task.description}</p>
                )}
                {task.result && (
                  <p className="text-xs text-green-400/70 mt-1 bg-green-400/5 rounded p-1.5 leading-snug">
                    {task.result}
                  </p>
                )}
              </div>

              <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={() => updateTask(task.id, { status: 'skipped' })}
                  className="text-white/20 hover:text-yellow-400 transition-colors"
                  title="Skip"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-white/20 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}

        {adding && (
          <div className="flex gap-2 p-2.5 rounded-lg bg-white/5 border border-widget-today/30">
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') setAdding(false) }}
              placeholder="Task title..."
              className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
            />
            <button onClick={addTask} className="text-widget-today text-xs font-medium hover:opacity-80">Add</button>
            <button onClick={() => setAdding(false)} className="text-white/30 text-xs hover:opacity-80">✕</button>
          </div>
        )}
      </div>
    </div>
  )
}
