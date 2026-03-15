import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ideas } from '@/lib/db/schema'
import { generateId } from '@/lib/utils'
import { desc, eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const all = await db.select().from(ideas)
    .where(eq(ideas.userId, user.id))
    .orderBy(desc(ideas.createdAt))
  return NextResponse.json(all)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const idea = {
    id: generateId(),
    userId: user.id,
    content: body.content,
    summary: body.summary ?? null,
    category: body.category ?? null,
    tags: body.tags ? JSON.stringify(body.tags) : null,
    expanded: body.expanded ?? null,
    createdAt: new Date(),
  }
  await db.insert(ideas).values(idea)
  return NextResponse.json(idea, { status: 201 })
}
