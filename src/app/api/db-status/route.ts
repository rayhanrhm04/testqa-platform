import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://uv4qhHNJJJ5pFJZ7v.jkt1_005:ca35f3753a0b78d63be0954b@pgsql-dbas-jkt1-005.sumobase.my.id:6432/dbe06a73bdd6b26463';

export async function GET(req: NextRequest) {
  let pool: Pool | null = null;
  try {
    pool = new Pool({
      connectionString,
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
      error: err.message || 'Failed to connect to database',
      connectionStringRedacted: connectionString.replace(/:([^@:]+)@/, ':******@')
    }, { status: 500 });
  }
}
