import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { actions } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  await db.update(actions).set(body).where(and(eq(actions.id, params.id), eq(actions.userId, user.id)))
  const updated = await db.select().from(actions).where(eq(actions.id, params.id))
  return NextResponse.json(updated[0])
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.delete(actions).where(and(eq(actions.id, params.id), eq(actions.userId, user.id)))
  return NextResponse.json({ ok: true })
}
