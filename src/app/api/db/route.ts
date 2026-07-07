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

  // Migration: Create release_projects table and alter releases table
  pool.query(`
    CREATE TABLE IF NOT EXISTS public.release_projects (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
    .then(() => {
      // Seed initial release projects
      pool.query(`
        INSERT INTO public.release_projects (id, name) VALUES 
          ('11111111-1111-1111-1111-111111111111', 'DSDA Jakarta'),
          ('22222222-2222-2222-2222-222222222222', 'FORM MAPID'),
          ('33333333-3333-3333-3333-333333333333', 'GEO MAPID')
        ON CONFLICT (id) DO NOTHING;
      `).catch(err => console.warn('Database migration warning seeding release projects:', err));

      // Alter releases structure to point to release_projects instead of projects
      pool.query(`
        ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS project_id UUID;
        ALTER TABLE public.releases DROP CONSTRAINT IF EXISTS releases_project_id_fkey;
        ALTER TABLE public.releases DROP CONSTRAINT IF EXISTS releases_release_project_id_fkey;
        ALTER TABLE public.releases DROP CONSTRAINT IF EXISTS releases_version_key;
        ALTER TABLE public.releases ALTER COLUMN release_date DROP NOT NULL;
      `)
        .then(() => {
          // Re-create the foreign key referencing release_projects
          pool.query(`
            ALTER TABLE public.releases ADD CONSTRAINT releases_release_project_id_fkey 
              FOREIGN KEY (project_id) REFERENCES public.release_projects(id) ON DELETE CASCADE;
          `)
            .then(() => console.log('Database migration: releases_release_project_id_fkey check passed'))
            .catch((err: any) => {
              if (err.code !== '42710' && err.code !== '42P07') {
                console.warn('Database migration warning creating foreign key constraint:', err);
              }
            });

          // Re-create the unique composite constraint
          pool.query('ALTER TABLE public.releases ADD CONSTRAINT releases_project_id_version_key UNIQUE (project_id, version);')
            .then(() => console.log('Database migration: public.releases.project_id_version_key check passed'))
            .catch((err: any) => {
              if (err.code !== '42710' && err.code !== '42P07') {
                console.warn('Database migration warning creating unique constraint:', err);
              }
            });
        })
        .catch(err => console.warn('Database migration warning altering releases structure:', err));
    })
    .catch(err => console.warn('Database migration warning creating release_projects:', err));

  // Migration: Create exploratory testing tables
  pool.query(`
    CREATE TABLE IF NOT EXISTS public.exploratory_sessions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      module TEXT,
      objective TEXT,
      timebox_mins INTEGER NOT NULL,
      elapsed_seconds INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Draft',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS public.exploratory_notes (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      session_id UUID REFERENCES public.exploratory_sessions(id) ON DELETE CASCADE,
      note_text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS public.exploratory_bugs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      session_id UUID REFERENCES public.exploratory_sessions(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT,
      severity TEXT NOT NULL DEFAULT 'Medium',
      priority TEXT NOT NULL DEFAULT 'Medium',
      description TEXT,
      steps_to_reproduce TEXT,
      expected_result TEXT,
      actual_result TEXT,
      relative_timestamp_seconds INTEGER NOT NULL,
      evidence_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS public.exploratory_evidence (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      session_id UUID REFERENCES public.exploratory_sessions(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_url TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
    .then(() => {
      console.log('Database migration: exploratory tables check passed');
      
      // Create implementation report tables
      pool.query(`
        CREATE TABLE IF NOT EXISTS public.implementation_reports (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          title TEXT NOT NULL,
          reporter_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
          reporter_name TEXT,
          version_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
          platform TEXT NOT NULL DEFAULT 'Web',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE public.implementation_reports ADD COLUMN IF NOT EXISTS reporter_name TEXT;
        
        ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS attachment_url TEXT;
        ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS attachment_name TEXT;
        
        ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS attachment_url TEXT;
        ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS attachment_name TEXT;
        
        CREATE TABLE IF NOT EXISTS public.implementation_report_items (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          report_id UUID REFERENCES public.implementation_reports(id) ON DELETE CASCADE,
          feedback_id UUID REFERENCES public.feedbacks(id) ON DELETE SET NULL,
          title TEXT NOT NULL,
          feature TEXT,
          status TEXT NOT NULL,
          implementation_version TEXT,
          qa_note TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS public.notifications (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          type TEXT NOT NULL,
          link TEXT NOT NULL,
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS public.recorder_sessions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          title TEXT NOT NULL,
          project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
          suite_id UUID REFERENCES public.test_suites(id) ON DELETE SET NULL,
          case_id UUID REFERENCES public.test_cases(id) ON DELETE SET NULL,
          browser TEXT NOT NULL DEFAULT 'Chrome',
          environment TEXT NOT NULL DEFAULT 'Staging',
          start_url TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Draft',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS public.recorder_steps (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          session_id UUID REFERENCES public.recorder_sessions(id) ON DELETE CASCADE,
          step_number INT NOT NULL,
          action_type TEXT NOT NULL,
          target_element TEXT,
          value TEXT,
          notes TEXT,
          attachment_url TEXT,
          attachment_name TEXT,
          timestamp TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS public.api_collections (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS public.api_endpoints (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          collection_id UUID REFERENCES public.api_collections(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          method TEXT NOT NULL,
          path TEXT NOT NULL,
          headers TEXT,
          params TEXT,
          body TEXT,
          test_case_id UUID REFERENCES public.test_cases(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS public.api_environments (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          variables TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS public.api_test_runs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          collection_id UUID REFERENCES public.api_collections(id) ON DELETE CASCADE,
          environment_id UUID REFERENCES public.api_environments(id) ON DELETE SET NULL,
          executed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
          passed_count INT NOT NULL DEFAULT 0,
          failed_count INT NOT NULL DEFAULT 0,
          duration_ms INT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS public.api_test_results (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          run_id UUID REFERENCES public.api_test_runs(id) ON DELETE CASCADE,
          endpoint_id UUID REFERENCES public.api_endpoints(id) ON DELETE CASCADE,
          status TEXT NOT NULL,
          status_code INT,
          response_time_ms INT,
          request_payload TEXT,
          request_headers TEXT,
          response_payload TEXT,
          response_headers TEXT,
          error_message TEXT
        );
      `)
        .then(() => {
          console.log('Database migration: implementation report, notifications, recorder, and api hub tables check passed');
          pool.query('ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;')
            .then(() => {
              console.log('Database migration: public.issues.created_by check passed');
              
              // Register RPC helper function
              pool.query(`
                CREATE OR REPLACE FUNCTION public.get_all_qa_data()
                RETURNS JSONB AS $$
                DECLARE
                  result JSONB;
                BEGIN
                  SELECT jsonb_build_object(
                    'projects', COALESCE((SELECT json_agg(x) FROM (SELECT * FROM public.projects ORDER BY created_at DESC) x), '[]'::jsonb),
                    'feedbacks', COALESCE((SELECT json_agg(x) FROM (SELECT * FROM public.feedbacks ORDER BY created_at DESC) x), '[]'::jsonb),
                    'issues', COALESCE((SELECT json_agg(x) FROM (SELECT * FROM public.issues ORDER BY created_at DESC) x), '[]'::jsonb),
                    'releases', COALESCE((SELECT json_agg(x) FROM (SELECT * FROM public.releases ORDER BY release_date DESC) x), '[]'::jsonb),
                    'test_suites', COALESCE((SELECT json_agg(x) FROM (SELECT * FROM public.test_suites) x), '[]'::jsonb),
                    'test_cases', COALESCE((SELECT json_agg(x) FROM (SELECT * FROM public.test_cases ORDER BY code ASC) x), '[]'::jsonb),
                    'test_runs', COALESCE((SELECT json_agg(x) FROM (SELECT * FROM public.test_runs ORDER BY created_at DESC) x), '[]'::jsonb),
                    'test_run_results', COALESCE((SELECT json_agg(x) FROM (SELECT * FROM public.test_run_results) x), '[]'::jsonb),
                    'comments', COALESCE((SELECT json_agg(x) FROM (SELECT * FROM public.comments ORDER BY created_at ASC) x), '[]'::jsonb),
                    'activity_logs', COALESCE((SELECT json_agg(x) FROM (SELECT * FROM public.activity_logs ORDER BY created_at DESC LIMIT 100) x), '[]'::jsonb),
                    'users', COALESCE((SELECT json_agg(x) FROM (SELECT * FROM public.users ORDER BY created_at DESC) x), '[]'::jsonb),
                    'recorder_sessions', COALESCE((SELECT json_agg(x) FROM (SELECT * FROM public.recorder_sessions ORDER BY created_at DESC) x), '[]'::jsonb),
                    'recorder_steps', COALESCE((SELECT json_agg(x) FROM (SELECT * FROM public.recorder_steps ORDER BY step_number ASC) x), '[]'::jsonb),
                    'api_collections', COALESCE((SELECT json_agg(x) FROM (SELECT * FROM public.api_collections ORDER BY created_at DESC) x), '[]'::jsonb),
                    'api_endpoints', COALESCE((SELECT json_agg(x) FROM (SELECT * FROM public.api_endpoints ORDER BY created_at ASC) x), '[]'::jsonb),
                    'api_environments', COALESCE((SELECT json_agg(x) FROM (SELECT * FROM public.api_environments ORDER BY created_at DESC) x), '[]'::jsonb),
                    'api_test_runs', COALESCE((SELECT json_agg(x) FROM (SELECT * FROM public.api_test_runs ORDER BY created_at DESC) x), '[]'::jsonb),
                    'api_test_results', COALESCE((SELECT json_agg(x) FROM (SELECT * FROM public.api_test_results) x), '[]'::jsonb)
                  ) INTO result;
                  RETURN result;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
              `)
                .then(() => console.log('Database migration: get_all_qa_data RPC registered'))
                .catch(err => console.warn('Database migration warning registering RPC helper:', err));
            })
            .catch((err) => console.warn('Database migration warning for issues.created_by:', err));
        })
        .catch((err) => console.warn('Database migration warning for implementation report, notifications, recorder, and api hub tables:', err));
    })
    .catch((err) => console.warn('Database migration warning for exploratory tables:', err));

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
