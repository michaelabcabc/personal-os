import { NextResponse } from 'next/server'
import postgres from 'postgres'

export async function GET() {
  const DATABASE_URL = process.env.DATABASE_URL!
  const DB_PASSWORD = process.env.DB_PASSWORD

  try {
    let sql
    if (DB_PASSWORD) {
      const url = new URL(DATABASE_URL)
      sql = postgres({
        host: url.hostname,
        port: parseInt(url.port || '6543'),
        database: url.pathname.slice(1),
        username: url.username,
        password: DB_PASSWORD,
        prepare: false,
        ssl: 'require',
      })
    } else {
      sql = postgres(DATABASE_URL, { prepare: false })
    }

    const result = await sql`SELECT current_user`
    await sql.end()
    return NextResponse.json({ ok: true, user: result[0].current_user, hasDbPassword: !!DB_PASSWORD })
  } catch (e: unknown) {
    const err = e as Error
    return NextResponse.json({ 
      ok: false, error: err.message, cause: String((err as any).cause),
      hasDbPassword: !!DB_PASSWORD,
      host: (() => { try { return new URL(DATABASE_URL).hostname } catch { return 'parse error' } })(),
    }, { status: 500 })
  }
}
