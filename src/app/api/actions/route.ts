import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { actions } from '@/lib/db/schema'
import { generateId } from '@/lib/utils'
import { desc, eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const all = await db.select().from(actions)
    .where(eq(actions.userId, user.id))
    .orderBy(desc(actions.createdAt))
  return NextResponse.json(all)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const action = {
    id: generateId(),
    userId: user.id,
    goalId: body.goalId ?? null,
    title: body.title,
    description: body.description ?? null,
    frequency: body.frequency ?? 'daily',
    executionType: body.executionType ?? 'user',
    status: 'active' as const,
    createdAt: new Date(),
  }
  await db.insert(actions).values(action)
  return NextResponse.json(action, { status: 201 })
}
