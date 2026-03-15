import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { goals } from '@/lib/db/schema'
import { generateId } from '@/lib/utils'
import { desc, eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const all = await db.select().from(goals)
    .where(eq(goals.userId, user.id))
    .orderBy(desc(goals.createdAt))
  return NextResponse.json(all)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const now = new Date()
  const goal = {
    id: generateId(),
    userId: user.id,
    title: body.title,
    description: body.description ?? null,
    status: 'active' as const,
    period: body.period ?? null,
    createdAt: now,
    updatedAt: now,
  }
  await db.insert(goals).values(goal)
  return NextResponse.json(goal, { status: 201 })
}
