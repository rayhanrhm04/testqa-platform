import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

export async function GET(req: NextRequest) {
  let pool: Pool | null = null;
  try {
    if (!connectionString) {
      return NextResponse.json({
        success: false,
        envSet: false,
        error: 'Database service is not configured.'
      }, { status: 503 });
    }

    pool = new Pool({
      connectionString,
      max: 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      ssl: false
    });

    const isEnvSet = !!process.env.DATABASE_URL;
    let dbName = '';
    try {
      const dbNameRes = await pool.query('SELECT current_database();');
      dbName = dbNameRes.rows[0]?.current_database || 'unknown';
    } catch (e) {}

    const projectsRes = await pool.query('SELECT COUNT(*) FROM public.projects;');
    const issuesRes = await pool.query('SELECT COUNT(*) FROM public.issues;');
    const usersRes = await pool.query('SELECT COUNT(*) FROM public.users;');

    await pool.end();

    return NextResponse.json({
      success: true,
      envSet: isEnvSet,
      databaseName: dbName,
      projectsCount: parseInt(projectsRes.rows[0].count, 10),
      issuesCount: parseInt(issuesRes.rows[0].count, 10),
      usersCount: parseInt(usersRes.rows[0].count, 10),
      connectionStringRedacted: connectionString.replace(/:([^@:]+)@/, ':******@')
    });
  } catch (err: any) {
    if (pool) {
      try { await pool.end(); } catch (e) {}
    }
    return NextResponse.json({
      success: false,
      error: 'Database service is temporarily unavailable.',
      connectionStringRedacted: connectionString ? connectionString.replace(/:([^@:]+)@/, ':******@') : null
    }, { status: 503 });
  }
}
