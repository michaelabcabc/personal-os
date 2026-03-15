import { NextRequest, NextResponse } from 'next/server'
import { anthropic, getSystemPrompt, type ChatContext } from '@/lib/ai'
import { db } from '@/lib/db'
import { messages, goals, actions, ideas, todayTasks, usageLogs } from '@/lib/db/schema'
import { generateId, today } from '@/lib/utils'
import { eq, and, desc } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DAILY_LIMIT = parseInt(process.env.DAILY_MESSAGE_LIMIT ?? '50')

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limiting
  const dateStr = today()
  const existing = await db.select().from(usageLogs)
    .where(and(eq(usageLogs.userId, user.id), eq(usageLogs.date, dateStr)))
  const currentCount = existing[0]?.count ?? 0

  if (currentCount >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: `Daily limit reached (${DAILY_LIMIT} messages/day). Try again tomorrow.` },
      { status: 429 }
    )
  }

  // Increment usage
  if (existing.length === 0) {
    await db.insert(usageLogs).values({ id: generateId(), userId: user.id, date: dateStr, count: 1 })
  } else {
    await db.update(usageLogs).set({ count: currentCount + 1 })
      .where(and(eq(usageLogs.userId, user.id), eq(usageLogs.date, dateStr)))
  }

  const { userMessage, context = 'general', history = [] } = await req.json() as {
    userMessage: string
    context: ChatContext
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  }

  // Save user message
  await db.insert(messages).values({
    id: generateId(), userId: user.id, role: 'user',
    content: userMessage, context, createdAt: new Date(),
  })

  // Build context data
  let contextData = ''
  if (context === 'goals' || context === 'general') {
    const gs = await db.select().from(goals)
      .where(and(eq(goals.userId, user.id), eq(goals.status, 'active'))).limit(10)
    if (gs.length) contextData += `\nActive Goals:\n${gs.map(g => `- [${g.id}] ${g.title}`).join('\n')}`
  }
  if (context === 'actions' || context === 'general') {
    const as_ = await db.select().from(actions)
      .where(and(eq(actions.userId, user.id), eq(actions.status, 'active'))).limit(10)
    if (as_.length) contextData += `\nActive Actions:\n${as_.map(a => `- [${a.id}] ${a.title}`).join('\n')}`
  }
  if (context === 'today') {
    const ts = await db.select().from(todayTasks)
      .where(and(eq(todayTasks.userId, user.id), eq(todayTasks.date, today()))).limit(10)
    if (ts.length) contextData += `\nToday's Tasks:\n${ts.map(t => `- [${t.status}] ${t.title}`).join('\n')}`
  }
  if (context === 'ideas') {
    const is_ = await db.select().from(ideas)
      .where(eq(ideas.userId, user.id)).orderBy(desc(ideas.createdAt)).limit(5)
    if (is_.length) contextData += `\nRecent Ideas:\n${is_.map(i => `- ${i.summary || i.content}`).join('\n')}`
  }

  const systemPrompt = getSystemPrompt(context) + (contextData ? `\n\nCurrent Data:${contextData}` : '')

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let fullText = ''
      const msgHistory = [...history.slice(-10), { role: 'user' as const, content: userMessage }]

      const aiStream = anthropic.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: msgHistory,
      })

      for await (const chunk of aiStream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const text = chunk.delta.text
          fullText += text
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
        }
      }

      await db.insert(messages).values({
        id: generateId(), userId: user.id, role: 'assistant',
        content: fullText, context, createdAt: new Date(),
      })

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullText, remaining: DAILY_LIMIT - currentCount - 1 })}\n\n`))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  })
}
