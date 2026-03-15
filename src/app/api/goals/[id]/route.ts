import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { goals } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  await db.update(goals).set({ ...body, updatedAt: new Date() })
    .where(and(eq(goals.id, params.id), eq(goals.userId, user.id)))
  const updated = await db.select().from(goals).where(eq(goals.id, params.id))
  return NextResponse.json(updated[0])
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.delete(goals).where(and(eq(goals.id, params.id), eq(goals.userId, user.id)))
  return NextResponse.json({ ok: true })
}
