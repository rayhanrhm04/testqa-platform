import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://uv4qhHNJJJ5pFJZ7v.jkt1_005:ca35f3753a0b78d63be0954b@pgsql-dbas-jkt1-005.sumobase.my.id:6432/dbe06a73bdd6b26463';

// Use a single database connection pool instance
let pool: Pool;
try {
  pool = new Pool({
    connectionString,
    ssl: false // SumoPod db does not support SSL connections
  });
  // Migration: Add avatar_url column to users table if it doesn't exist
  pool.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;')
    .then(() => console.log('Database migration: public.users.avatar_url check passed'))
    .catch((err) => console.warn('Database migration warning for users.avatar_url:', err));

  // Migration for releases: add project_id, drop version unique constraint, add project_id + version unique constraint
  pool.query(`
    ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
    ALTER TABLE public.releases DROP CONSTRAINT IF EXISTS releases_version_key;
  `)
    .then(() => {
      pool.query('ALTER TABLE public.releases ADD CONSTRAINT releases_project_id_version_key UNIQUE (project_id, version);')
        .then(() => console.log('Database migration: public.releases.project_id_version_key check passed'))
        .catch((err: any) => {
          if (err.code !== '42710' && err.code !== '42P07') {
            console.warn('Database migration warning for releases constraint:', err);
          } else {
            console.log('Database migration: public.releases.project_id_version_key already exists');
          }
        });
    })
    .catch((err) => console.warn('Database migration warning for releases structure:', err));
} catch (err) {
  console.error('Error creating PostgreSQL pool', err);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, table, data, filters, orderBy } = body;

    if (!pool) {
      return NextResponse.json({ error: 'Database connection pool not initialized' }, { status: 500 });
    }

    let queryText = '';
    const queryValues: any[] = [];

    // Helper to format filters into WHERE clause
    const buildWhereClause = (startIndex: number) => {
      if (!filters || !Array.isArray(filters) || filters.length === 0) {
        return { clause: '', nextIndex: startIndex };
      }
      const clauses: string[] = [];
      let index = startIndex;
      for (const f of filters) {
        if (f.operator === 'eq') {
          clauses.push(`"${f.column}" = $${index}`);
          queryValues.push(f.value);
          index++;
        } else if (f.operator === 'in') {
          if (Array.isArray(f.value) && f.value.length > 0) {
            const placeholders = f.value.map((_: any, i: number) => `$${index + i}`).join(', ');
            clauses.push(`"${f.column}" IN (${placeholders})`);
            queryValues.push(...f.value);
            index += f.value.length;
          } else {
            clauses.push('1 = 0'); // force empty result
          }
        }
      }
      return {
        clause: `WHERE ${clauses.join(' AND ')}`,
        nextIndex: index
      };
    };

    if (action === 'select') {
      const { clause } = buildWhereClause(1);
      let orderClause = '';
      if (orderBy && orderBy.column) {
        orderClause = `ORDER BY "${orderBy.column}" ${orderBy.ascending ? 'ASC' : 'DESC'}`;
      }
      queryText = `SELECT * FROM "${table}" ${clause} ${orderClause}`;

    } else if (action === 'insert') {
      if (Array.isArray(data)) {
        if (data.length === 0) {
          return NextResponse.json({ data: [] });
        }
        const keys = Object.keys(data[0]);
        const values: any[] = [];
        const placeholders = data.map((row, i) => {
          const rowPlaceholders = keys.map((_, j) => {
            values.push(row[keys[j]]);
            return `$${i * keys.length + j + 1}`;
          });
          return `(${rowPlaceholders.join(', ')})`;
        }).join(', ');
        
        queryText = `INSERT INTO "${table}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES ${placeholders} RETURNING *`;
        queryValues.push(...values);
      } else {
        const keys = Object.keys(data);
        const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
        queryText = `INSERT INTO "${table}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders}) RETURNING *`;
        queryValues.push(...Object.values(data));
      }

    } else if (action === 'update') {
      const keys = Object.keys(data);
      const setClauses = keys.map((k, idx) => `"${k}" = $${idx + 1}`);
      queryValues.push(...Object.values(data));

      const { clause } = buildWhereClause(keys.length + 1);
      queryText = `UPDATE "${table}" SET ${setClauses.join(', ')} ${clause} RETURNING *`;

    } else if (action === 'delete') {
      const { clause } = buildWhereClause(1);
      queryText = `DELETE FROM "${table}" ${clause} RETURNING *`;

    } else {
      return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    const result = await pool.query(queryText, queryValues);

    return NextResponse.json({ data: result.rows });
  } catch (err: any) {
    console.error('API Database Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
