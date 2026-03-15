export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { openai, AI_MODEL } from '@/lib/ai'
import { db } from '@/lib/db'
import { goals } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

export async function GET() {
  const checks: Record<string, unknown> = {}

  // Identify DB adapter
  checks.dbAdapter = require('../../../lib/db/index').db?.constructor?.name ?? 'unknown'

  // Check env
  checks.AI_MODEL = process.env.AI_MODEL
  checks.AI_BASE_URL = process.env.AI_BASE_URL
  checks.hasApiKey = !!(process.env.AI_API_KEY)
  checks.apiKeyLen = process.env.AI_API_KEY?.length

  // Check DB - raw query for tables
  try {
    const result = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`)
    // drizzle-orm/node-postgres returns QueryResult with .rows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (result as any).rows ?? result
    checks.tables = rows.map((r: Record<string, unknown>) => r.table_name)
  } catch (e: unknown) {
    checks.tables = (e as Error).message
  }

  // Check DB via Drizzle (expose underlying cause)
  try {
    await db.select().from(goals).limit(1)
    checks.db = 'ok'
  } catch (e: unknown) {
    const err = e as Error & { code?: string; detail?: string; cause?: Error & { code?: string; message?: string } }
    checks.db = {
      message: err.message,
      cause: err.cause ? { message: err.cause.message, code: err.cause.code } : null,
    }
  }

  // Check AI
  try {
    const res = await openai.chat.completions.create({
      model: AI_MODEL,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say hi' }],
    })
    checks.ai = 'ok: ' + res.choices[0]?.message?.content
  } catch (e: unknown) {
    checks.ai = (e as Error).message
  }

  return NextResponse.json(checks)
}
