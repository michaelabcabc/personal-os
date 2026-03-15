import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { goals, actions, todayTasks } from '@/lib/db/schema'
import { generateId, today } from '@/lib/utils'
import { eq, and } from 'drizzle-orm'
import { anthropic } from '@/lib/ai'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const date = today()
  const activeGoals = await db.select().from(goals)
    .where(and(eq(goals.userId, user.id), eq(goals.status, 'active')))
  const activeActions = await db.select().from(actions)
    .where(and(eq(actions.userId, user.id), eq(actions.status, 'active')))

  if (activeActions.length === 0) {
    return NextResponse.json({ tasks: [], message: 'No active actions. Add some actions first.' })
  }

  const prompt = `Based on these goals and actions, generate today's focused task list (max 6).

Goals:
${activeGoals.map(g => `- ${g.title}`).join('\n')}

Actions:
${activeActions.map(a => `- [${a.executionType}] ${a.title} (${a.frequency})`).join('\n')}

Return JSON array only:
[{"title": "...", "description": "...", "executionType": "user|ai_assist|ai_exec"}]`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return NextResponse.json({ error: 'AI returned invalid response' }, { status: 500 })

  const suggested = JSON.parse(jsonMatch[0]) as Array<{ title: string; description?: string; executionType?: string }>

  const tasks = suggested.map((t, i) => ({
    id: generateId(),
    userId: user.id,
    actionId: null as string | null,
    title: t.title,
    description: t.description ?? null,
    executionType: (t.executionType ?? 'user') as string,
    status: 'pending' as const,
    result: null as string | null,
    date,
    sortOrder: i,
    createdAt: new Date(),
  }))

  await db.insert(todayTasks).values(tasks)
  return NextResponse.json({ tasks })
}
