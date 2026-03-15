'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Loader2, Bot, User, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatContext } from '@/lib/ai'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const contextLabels: Record<ChatContext, string> = {
  general: 'AI Assistant',
  goals: 'Goals Assistant',
  actions: 'Actions Assistant',
  ideas: 'Ideas Assistant',
  today: 'Today Assistant',
}

const contextColors: Record<ChatContext, string> = {
  general: 'text-white',
  goals: 'text-widget-goals',
  actions: 'text-widget-actions',
  ideas: 'text-widget-ideas',
  today: 'text-widget-today',
}

interface ChatPanelProps {
  context: ChatContext
  onClose: () => void
  onAction?: (action: Record<string, unknown>) => void
}

export default function ChatPanel({ context, onClose, onAction }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return

    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsStreaming(true)

    // Placeholder for streaming response
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: userMsg,
          context,
          history: messages.slice(-10),
        }),
      })

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n\n').filter(Boolean)

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6))

          if (data.text) {
            fullText += data.text
            setMessages(prev => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: 'assistant', content: fullText }
              return updated
            })
          }

          if (data.done) {
            // Parse any JSON actions in the response
            const jsonMatch = fullText.match(/```json\n([\s\S]*?)\n```/)
            if (jsonMatch && onAction) {
              try {
                const action = JSON.parse(jsonMatch[1])
                onAction(action)
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      }
    } catch (e) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: `Error: ${String(e)}` }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }, [input, isStreaming, messages, context, onAction])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] border-l border-white/10 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles className={cn('w-4 h-4', contextColors[context])} />
          <span className="font-medium text-sm text-white">{contextLabels[context]}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-white/30 text-sm mt-8">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Ask me anything about your {context === 'general' ? 'goals and tasks' : context}</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs',
              msg.role === 'user' ? 'bg-white/20' : 'bg-white/5'
            )}>
              {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div className={cn(
              'max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-white/10 text-white'
                : 'bg-white/5 text-white/90'
            )}>
              {msg.content ? (
                <MessageContent content={msg.content} />
              ) : (
                <span className="animate-blink">▋</span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message... (Enter to send)"
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-white/30 min-h-[36px] max-h-[120px]"
            style={{ height: 'auto' }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

function MessageContent({ content }: { content: string }) {
  // Simple markdown-like rendering
  const parts = content.split(/(```[\s\S]*?```)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const lines = part.split('\n')
          const lang = lines[0].replace('```', '')
          const code = lines.slice(1, -1).join('\n')
          return (
            <pre key={i} className="bg-black/50 rounded p-2 mt-1 text-xs overflow-x-auto text-green-400 font-mono">
              {lang && <span className="text-white/30 block mb-1">{lang}</span>}
              {code}
            </pre>
          )
        }
        return <span key={i} className="whitespace-pre-wrap">{part}</span>
      })}
    </>
  )
}
