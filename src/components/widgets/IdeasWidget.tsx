'use client'

import { useState } from 'react'
import { Plus, Lightbulb, Trash2, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import useSWR, { mutate } from 'swr'
import type { Idea } from '@/lib/db/schema'
import { formatDate } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const categoryColors: Record<string, string> = {
  business: 'text-yellow-400 bg-yellow-400/10',
  technical: 'text-blue-400 bg-blue-400/10',
  personal: 'text-green-400 bg-green-400/10',
  creative: 'text-pink-400 bg-pink-400/10',
  learning: 'text-purple-400 bg-purple-400/10',
}

interface IdeasWidgetProps {
  onChatOpen: () => void
}

export default function IdeasWidget({ onChatOpen }: IdeasWidgetProps) {
  const { data: ideas = [], isLoading } = useSWR<Idea[]>('/api/ideas', fetcher)
  const [adding, setAdding] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const addIdea = async () => {
    if (!newContent.trim()) return
    await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent.trim() }),
    })
    mutate('/api/ideas')
    setNewContent('')
    setAdding(false)
  }

  const deleteIdea = async (id: string) => {
    await fetch(`/api/ideas/${id}`, { method: 'DELETE' })
    mutate('/api/ideas')
  }

  return (
    <div className="widget-card group">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-widget-ideas" />
          <h2 className="widget-title text-widget-ideas">Ideas</h2>
          <span className="text-xs text-white/30">{ideas.length} total</span>
        </div>
        <div className="flex gap-1">
          <button onClick={onChatOpen} className="widget-action-btn" title="Chat about ideas">
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setAdding(true)} className="widget-action-btn" title="Add idea">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5 flex-1 overflow-y-auto">
        {isLoading && <div className="text-white/30 text-sm text-center py-4">Loading...</div>}

        {!isLoading && ideas.length === 0 && !adding && (
          <div className="text-white/25 text-sm text-center py-6">
            <Lightbulb className="w-6 h-6 mx-auto mb-2 opacity-30" />
            <p>No ideas yet. Capture your thoughts here.</p>
          </div>
        )}

        {ideas.map(idea => {
          const isExpanded = expanded === idea.id
          const tags = idea.tags ? JSON.parse(idea.tags) as string[] : []
          const catColor = idea.category ? (categoryColors[idea.category.toLowerCase()] ?? 'text-white/40 bg-white/5') : null

          return (
            <div key={idea.id} className="p-2.5 rounded-lg bg-white/3 hover:bg-white/6 transition-colors group/item">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-widget-ideas/70 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug text-white/90">
                    {idea.summary || idea.content}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {catColor && idea.category && (
                      <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', catColor)}>
                        {idea.category}
                      </span>
                    )}
                    {tags.map((tag: string) => (
                      <span key={tag} className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                    <span className="text-xs text-white/20 ml-auto">
                      {formatDate(new Date(idea.createdAt))}
                    </span>
                  </div>

                  {idea.expanded && (
                    <button
                      onClick={() => setExpanded(isExpanded ? null : idea.id)}
                      className="flex items-center gap-1 text-xs text-widget-ideas/60 hover:text-widget-ideas mt-1.5 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {isExpanded ? 'Collapse' : 'AI expanded'}
                    </button>
                  )}

                  {isExpanded && idea.expanded && (
                    <div className="mt-2 text-xs text-white/50 bg-white/3 rounded p-2 leading-relaxed">
                      {idea.expanded}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteIdea(idea.id)}
                  className="opacity-0 group-hover/item:opacity-100 text-white/30 hover:text-red-400 transition-all flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}

        {adding && (
          <div className="p-2.5 rounded-lg bg-white/5 border border-widget-ideas/30">
            <textarea
              autoFocus
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) addIdea(); if (e.key === 'Escape') setAdding(false) }}
              placeholder="What's on your mind? (⌘+Enter to save)"
              rows={3}
              className="w-full bg-transparent text-sm text-white placeholder-white/30 focus:outline-none resize-none"
            />
            <div className="flex justify-end gap-2 mt-1">
              <button onClick={() => setAdding(false)} className="text-white/30 text-xs hover:opacity-80">Cancel</button>
              <button onClick={addIdea} className="text-widget-ideas text-xs font-medium hover:opacity-80">Save Idea</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
