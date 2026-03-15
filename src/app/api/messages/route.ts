import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { messages } from '@/lib/db/schema'
import { generateId } from '@/lib/utils'
import { eq, and, desc } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const context = req.nextUrl.searchParams.get('context') ?? 'general'
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '50')
  const msgs = await db.select().from(messages)
    .where(and(eq(messages.userId, user.id), eq(messages.context, context)))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
  return NextResponse.json(msgs.reverse())
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const msg = {
    id: generateId(),
    userId: user.id,
    role: body.role,
    content: body.content,
    context: body.context ?? 'general',
    createdAt: new Date(),
  }
  await db.insert(messages).values(msg)
  return NextResponse.json(msg, { status: 201 })
}
