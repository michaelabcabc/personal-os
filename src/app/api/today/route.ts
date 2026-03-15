import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { todayTasks } from '@/lib/db/schema'
import { generateId, today } from '@/lib/utils'
import { eq, and, desc } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const date = req.nextUrl.searchParams.get('date') ?? today()
  const tasks = await db.select().from(todayTasks)
    .where(and(eq(todayTasks.userId, user.id), eq(todayTasks.date, date)))
    .orderBy(todayTasks.sortOrder, desc(todayTasks.createdAt))
  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const task = {
    id: generateId(),
    userId: user.id,
    actionId: body.actionId ?? null,
    title: body.title,
    description: body.description ?? null,
    executionType: body.executionType ?? 'user',
    status: 'pending' as const,
    result: null,
    date: body.date ?? today(),
    sortOrder: body.sortOrder ?? 0,
    createdAt: new Date(),
  }
  await db.insert(todayTasks).values(task)
  return NextResponse.json(task, { status: 201 })
}
