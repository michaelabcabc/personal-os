import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ideas } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  await db.update(ideas).set(body).where(and(eq(ideas.id, params.id), eq(ideas.userId, user.id)))
  const updated = await db.select().from(ideas).where(eq(ideas.id, params.id))
  return NextResponse.json(updated[0])
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.delete(ideas).where(and(eq(ideas.id, params.id), eq(ideas.userId, user.id)))
  return NextResponse.json({ ok: true })
}
