import { NextRequest, NextResponse } from 'next/server';
import { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import { DATABASE_URL } from '@/lib/database-config';

export const runtime = 'nodejs';

const globalForPm = globalThis as typeof globalThis & { pmPool?: Pool; pmSchemaPromise?: Promise<void> };
const pool = globalForPm.pmPool ?? new Pool({ connectionString: DATABASE_URL, max: 10, ssl: false });
if (process.env.NODE_ENV !== 'production') globalForPm.pmPool = pool;

const schemaSql = `
CREATE TABLE IF NOT EXISTS public.pm_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  lead_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  start_date DATE,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'Planning' CHECK (status IN ('Planning','Active','On Hold','Completed')),
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.pm_project_members (
  project_id UUID NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('Project Lead','Member','Viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);
CREATE TABLE IF NOT EXISTS public.pm_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, name), UNIQUE (project_id, position)
);
CREATE TABLE IF NOT EXISTS public.pm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES public.pm_columns(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High','Critical')),
  due_date DATE,
  labels TEXT[] NOT NULL DEFAULT '{}',
  attachment_url TEXT,
  attachment_name TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.pm_task_assignees (
  task_id UUID NOT NULL REFERENCES public.pm_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);
CREATE TABLE IF NOT EXISTS public.pm_task_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.pm_tasks(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('Issue','Feedback','Test Case','Test Run','Release','Exploratory Finding')),
  linked_id TEXT NOT NULL,
  linked_code TEXT NOT NULL,
  UNIQUE (task_id, link_type, linked_id)
);
CREATE TABLE IF NOT EXISTS public.pm_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.pm_tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.pm_task_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.pm_tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.pm_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.pm_tasks(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pm_members_user_idx ON public.pm_project_members(user_id, project_id);
CREATE INDEX IF NOT EXISTS pm_columns_project_idx ON public.pm_columns(project_id, position);
CREATE INDEX IF NOT EXISTS pm_tasks_project_column_idx ON public.pm_tasks(project_id, column_id, position);
CREATE INDEX IF NOT EXISTS pm_tasks_due_idx ON public.pm_tasks(project_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS pm_assignees_user_idx ON public.pm_task_assignees(user_id, task_id);
CREATE INDEX IF NOT EXISTS pm_links_task_idx ON public.pm_task_links(task_id);
CREATE INDEX IF NOT EXISTS pm_comments_task_idx ON public.pm_task_comments(task_id, created_at);
CREATE INDEX IF NOT EXISTS pm_checklists_task_idx ON public.pm_task_checklists(task_id, position);
CREATE INDEX IF NOT EXISTS pm_activity_project_idx ON public.pm_activity(project_id, created_at DESC);
`;

async function ensureSchema() {
  globalForPm.pmSchemaPromise ??= pool.query(schemaSql).then(() => undefined);
  await globalForPm.pmSchemaPromise;
}

const idSchema = z.string().uuid();
const roleSchema = z.enum(['Project Lead', 'Member', 'Viewer']);
const statusSchema = z.enum(['Planning', 'Active', 'On Hold', 'Completed']);
const prioritySchema = z.enum(['Low', 'Medium', 'High', 'Critical']);
const linkTypeSchema = z.enum(['Issue', 'Feedback', 'Test Case', 'Test Run', 'Release', 'Exploratory Finding']);

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected error';
  const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : message === 'Not found' ? 404 : 400;
  return NextResponse.json({ error: message }, { status });
}

async function getUserId(req: NextRequest) {
  const parsed = idSchema.safeParse(req.headers.get('x-user-id'));
  if (!parsed.success) throw new Error('Unauthorized');
  const result = await pool.query('SELECT id FROM public.users WHERE id = $1', [parsed.data]);
  if (!result.rowCount) throw new Error('Unauthorized');
  return parsed.data;
}

async function membership(client: PoolClient, projectId: string, userId: string, write = false, leadOnly = false) {
  const result = await client.query(
    'SELECT role FROM public.pm_project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  if (!result.rowCount) throw new Error('Forbidden');
  const role = result.rows[0].role as string;
  if (leadOnly && role !== 'Project Lead') throw new Error('Forbidden');
  if (write && role === 'Viewer') throw new Error('Forbidden');
  return role;
}

async function taskProject(client: PoolClient, taskId: string) {
  const result = await client.query('SELECT project_id, title FROM public.pm_tasks WHERE id = $1', [taskId]);
  if (!result.rowCount) throw new Error('Not found');
  return result.rows[0] as { project_id: string; title: string };
}

async function logActivity(client: PoolClient, projectId: string, taskId: string | null, actorId: string, action: string, details: string) {
  await client.query(
    'INSERT INTO public.pm_activity (project_id, task_id, actor_id, action, details) VALUES ($1,$2,$3,$4,$5)',
    [projectId, taskId, actorId, action, details]
  );
}

const projectSelect = `
SELECT p.*, lead.name AS lead_name, m.role,
  (SELECT COUNT(*)::int FROM public.pm_project_members pm WHERE pm.project_id = p.id) AS member_count,
  (SELECT COUNT(*)::int FROM public.pm_tasks t WHERE t.project_id = p.id) AS task_count,
  (SELECT COUNT(*)::int FROM public.pm_tasks t JOIN public.pm_columns c ON c.id=t.column_id WHERE t.project_id=p.id AND lower(c.name)='done') AS completed_count
FROM public.pm_projects p
JOIN public.pm_project_members m ON m.project_id=p.id
JOIN public.users lead ON lead.id=p.lead_user_id
`;

export async function GET(req: NextRequest) {
  try {
    await ensureSchema();
    const userId = await getUserId(req);
    const projectId = req.nextUrl.searchParams.get('projectId');
    const taskId = req.nextUrl.searchParams.get('taskId');
    const client = await pool.connect();
    try {
      if (taskId) {
        idSchema.parse(taskId);
        const task = await taskProject(client, taskId);
        await membership(client, task.project_id, userId);
        const [comments, checklist, activities] = await Promise.all([
          client.query('SELECT c.*, u.name AS author_name FROM public.pm_task_comments c JOIN public.users u ON u.id=c.author_id WHERE c.task_id=$1 ORDER BY c.created_at', [taskId]),
          client.query('SELECT * FROM public.pm_task_checklists WHERE task_id=$1 ORDER BY position, created_at', [taskId]),
          client.query('SELECT a.*, u.name AS actor_name FROM public.pm_activity a JOIN public.users u ON u.id=a.actor_id WHERE a.task_id=$1 ORDER BY a.created_at DESC LIMIT 50', [taskId]),
        ]);
        return NextResponse.json({ comments: comments.rows, checklist: checklist.rows, activities: activities.rows });
      }

      if (!projectId) {
        const [projects, users] = await Promise.all([
          client.query(`${projectSelect} WHERE m.user_id=$1 ORDER BY p.updated_at DESC`, [userId]),
          client.query('SELECT id,name,email,avatar_url FROM public.users ORDER BY name'),
        ]);
        return NextResponse.json({ projects: projects.rows, users: users.rows });
      }

      idSchema.parse(projectId);
      await membership(client, projectId, userId);
      const [project, members, columns, tasks, activities] = await Promise.all([
        client.query(`${projectSelect} WHERE p.id=$1 AND m.user_id=$2`, [projectId, userId]),
        client.query('SELECT u.id,u.name,u.email,u.avatar_url,m.role FROM public.pm_project_members m JOIN public.users u ON u.id=m.user_id WHERE m.project_id=$1 ORDER BY CASE m.role WHEN \'Project Lead\' THEN 0 WHEN \'Member\' THEN 1 ELSE 2 END,u.name', [projectId]),
        client.query('SELECT * FROM public.pm_columns WHERE project_id=$1 ORDER BY position', [projectId]),
        client.query(`SELECT t.*, reporter.name AS reporter_name,
          COALESCE((SELECT json_agg(json_build_object('id',u.id,'name',u.name,'email',u.email,'avatar_url',u.avatar_url) ORDER BY u.name) FROM public.pm_task_assignees ta JOIN public.users u ON u.id=ta.user_id WHERE ta.task_id=t.id),'[]') AS assignees,
          COALESCE((SELECT json_agg(l ORDER BY l.linked_code) FROM public.pm_task_links l WHERE l.task_id=t.id),'[]') AS links,
          (SELECT COUNT(*)::int FROM public.pm_task_comments c WHERE c.task_id=t.id) AS comment_count,
          (SELECT COUNT(*)::int FROM public.pm_task_checklists cl WHERE cl.task_id=t.id) AS checklist_total,
          (SELECT COUNT(*)::int FROM public.pm_task_checklists cl WHERE cl.task_id=t.id AND cl.is_done) AS checklist_done
        FROM public.pm_tasks t JOIN public.users reporter ON reporter.id=t.reporter_id WHERE t.project_id=$1 ORDER BY t.position,t.created_at`, [projectId]),
        client.query('SELECT a.*,u.name AS actor_name FROM public.pm_activity a JOIN public.users u ON u.id=a.actor_id WHERE a.project_id=$1 ORDER BY a.created_at DESC LIMIT 20', [projectId]),
      ]);
      if (!project.rowCount) throw new Error('Not found');
      return NextResponse.json({ project: project.rows[0], members: members.rows, columns: columns.rows, tasks: tasks.rows, activities: activities.rows });
    } finally { client.release(); }
  } catch (error) { return errorResponse(error); }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const userId = await getUserId(req);
    const body = await req.json();
    const action = z.string().parse(body.action);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (action === 'createProject') {
        const input = z.object({
          name: z.string().trim().min(2).max(120), description: z.string().max(3000).default(''),
          leadUserId: idSchema, memberIds: z.array(idSchema).default([]), startDate: z.string().nullable().optional(),
          targetDate: z.string().nullable().optional(), status: statusSchema.default('Planning'),
        }).parse(body);
        const project = await client.query('INSERT INTO public.pm_projects (name,description,lead_user_id,start_date,target_date,status,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [input.name,input.description,input.leadUserId,input.startDate||null,input.targetDate||null,input.status,userId]);
        const id = project.rows[0].id;
        await client.query('INSERT INTO public.pm_project_members (project_id,user_id,role) VALUES ($1,$2,\'Project Lead\')', [id,input.leadUserId]);
        const members = [...new Set([userId, ...input.memberIds])].filter(memberId => memberId !== input.leadUserId);
        for (const memberId of members) await client.query('INSERT INTO public.pm_project_members (project_id,user_id,role) VALUES ($1,$2,\'Member\') ON CONFLICT DO NOTHING', [id,memberId]);
        for (const [position,name] of ['Backlog','To Do','In Progress','Review','Done'].entries()) await client.query('INSERT INTO public.pm_columns (project_id,name,position) VALUES ($1,$2,$3)', [id,name,position]);
        await logActivity(client,id,null,userId,'project.created',`Created project ${input.name}`);
        await client.query('COMMIT');
        return NextResponse.json({ projectId: id }, { status: 201 });
      }

      const projectId = idSchema.parse(body.projectId);
      if (action === 'createTask') {
        await membership(client,projectId,userId,true);
        const input = z.object({ columnId:idSchema,title:z.string().trim().min(2).max(200),description:z.string().max(5000).default(''),priority:prioritySchema.default('Medium'),dueDate:z.string().nullable().optional(),labels:z.array(z.string().trim().min(1).max(40)).max(10).default([]),assigneeIds:z.array(idSchema).default([]),attachmentUrl:z.string().url().nullable().optional(),attachmentName:z.string().max(255).nullable().optional(),linkType:linkTypeSchema.nullable().optional(),linkedId:z.string().max(120).nullable().optional(),linkedCode:z.string().max(120).nullable().optional() }).parse(body);
        const column = await client.query('SELECT id FROM public.pm_columns WHERE id=$1 AND project_id=$2',[input.columnId,projectId]);
        if (!column.rowCount) throw new Error('Not found');
        const result = await client.query('INSERT INTO public.pm_tasks (project_id,column_id,title,description,reporter_id,priority,due_date,labels,attachment_url,attachment_name,position) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,(SELECT COALESCE(MAX(position),-1)+1 FROM public.pm_tasks WHERE column_id=$2)) RETURNING *',[projectId,input.columnId,input.title,input.description,userId,input.priority,input.dueDate||null,input.labels,input.attachmentUrl||null,input.attachmentName||null]);
        const taskId = result.rows[0].id;
        for (const assigneeId of input.assigneeIds) await client.query('INSERT INTO public.pm_task_assignees (task_id,user_id) SELECT $1,$2 WHERE EXISTS (SELECT 1 FROM public.pm_project_members WHERE project_id=$3 AND user_id=$2) ON CONFLICT DO NOTHING',[taskId,assigneeId,projectId]);
        if(input.linkType && input.linkedId && input.linkedCode) await client.query('INSERT INTO public.pm_task_links (task_id,link_type,linked_id,linked_code) VALUES ($1,$2,$3,$4)',[taskId,input.linkType,input.linkedId,input.linkedCode]);
        await logActivity(client,projectId,taskId,userId,'task.created',`Created task ${input.title}`);
        await client.query('COMMIT');
        return NextResponse.json({ taskId },{status:201});
      }
      if (action === 'createColumn') {
        await membership(client,projectId,userId,false,true);
        const name=z.string().trim().min(1).max(80).parse(body.name);
        const result=await client.query('INSERT INTO public.pm_columns (project_id,name,position) VALUES ($1,$2,(SELECT COALESCE(MAX(position),-1)+1 FROM public.pm_columns WHERE project_id=$1)) RETURNING *',[projectId,name]);
        await logActivity(client,projectId,null,userId,'column.created',`Added column ${name}`);
        await client.query('COMMIT'); return NextResponse.json({column:result.rows[0]},{status:201});
      }
      if (action === 'addMember') {
        await membership(client,projectId,userId,false,true);
        const memberId=idSchema.parse(body.userId); const role=roleSchema.parse(body.role);
        if(role==='Project Lead') throw new Error('Use project lead transfer to assign Project Lead');
        await client.query('INSERT INTO public.pm_project_members (project_id,user_id,role) VALUES ($1,$2,$3) ON CONFLICT (project_id,user_id) DO UPDATE SET role=EXCLUDED.role',[projectId,memberId,role]);
        await logActivity(client,projectId,null,userId,'member.assigned',`Assigned member as ${role}`);
        await client.query('COMMIT'); return NextResponse.json({success:true});
      }
      if (action === 'addComment') {
        const taskId=idSchema.parse(body.taskId); const task=await taskProject(client,taskId); if(task.project_id!==projectId) throw new Error('Not found');
        await membership(client,projectId,userId,true); const text=z.string().trim().min(1).max(3000).parse(body.text);
        await client.query('INSERT INTO public.pm_task_comments (task_id,author_id,body) VALUES ($1,$2,$3)',[taskId,userId,text]);
        await logActivity(client,projectId,taskId,userId,'comment.created','Added a comment');
        await client.query('COMMIT'); return NextResponse.json({success:true},{status:201});
      }
      if (action === 'addChecklist') {
        const taskId=idSchema.parse(body.taskId); const task=await taskProject(client,taskId); if(task.project_id!==projectId) throw new Error('Not found');
        await membership(client,projectId,userId,true); const text=z.string().trim().min(1).max(300).parse(body.text);
        await client.query('INSERT INTO public.pm_task_checklists (task_id,text,position) VALUES ($1,$2,(SELECT COALESCE(MAX(position),-1)+1 FROM public.pm_task_checklists WHERE task_id=$1))',[taskId,text]);
        await logActivity(client,projectId,taskId,userId,'checklist.created',`Added checklist item ${text}`);
        await client.query('COMMIT'); return NextResponse.json({success:true},{status:201});
      }
      throw new Error('Unsupported action');
    } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  } catch(error) { return errorResponse(error); }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureSchema(); const userId=await getUserId(req); const body=await req.json(); const action=z.string().parse(body.action); const projectId=idSchema.parse(body.projectId); const client=await pool.connect();
    try { await client.query('BEGIN');
      if(action==='updateTask') {
        await membership(client,projectId,userId,true);
        const input=z.object({taskId:idSchema,columnId:idSchema,title:z.string().trim().min(2).max(200),description:z.string().max(5000).default(''),priority:prioritySchema,dueDate:z.string().nullable().optional(),labels:z.array(z.string().trim().min(1).max(40)).max(10).default([]),assigneeIds:z.array(idSchema).default([]),attachmentUrl:z.string().url().nullable().optional(),attachmentName:z.string().max(255).nullable().optional(),linkType:linkTypeSchema.nullable().optional(),linkedId:z.string().max(120).nullable().optional(),linkedCode:z.string().max(120).nullable().optional()}).parse(body);
        const task=await taskProject(client,input.taskId); if(task.project_id!==projectId) throw new Error('Not found');
        const column=await client.query('SELECT id FROM public.pm_columns WHERE id=$1 AND project_id=$2',[input.columnId,projectId]); if(!column.rowCount) throw new Error('Not found');
        await client.query('UPDATE public.pm_tasks SET column_id=$1,title=$2,description=$3,priority=$4,due_date=$5,labels=$6,attachment_url=$7,attachment_name=$8,updated_at=NOW() WHERE id=$9',[input.columnId,input.title,input.description,input.priority,input.dueDate||null,input.labels,input.attachmentUrl||null,input.attachmentName||null,input.taskId]);
        await client.query('DELETE FROM public.pm_task_assignees WHERE task_id=$1',[input.taskId]);
        for(const assigneeId of input.assigneeIds) await client.query('INSERT INTO public.pm_task_assignees (task_id,user_id) SELECT $1,$2 WHERE EXISTS (SELECT 1 FROM public.pm_project_members WHERE project_id=$3 AND user_id=$2)',[input.taskId,assigneeId,projectId]);
        await client.query('DELETE FROM public.pm_task_links WHERE task_id=$1',[input.taskId]);
        if(input.linkType&&input.linkedId&&input.linkedCode) await client.query('INSERT INTO public.pm_task_links (task_id,link_type,linked_id,linked_code) VALUES ($1,$2,$3,$4)',[input.taskId,input.linkType,input.linkedId,input.linkedCode]);
        await logActivity(client,projectId,input.taskId,userId,'task.updated',`Updated task ${input.title}`);
      }
      else if(action==='moveTask') { await membership(client,projectId,userId,true); const taskId=idSchema.parse(body.taskId); const columnId=idSchema.parse(body.columnId); const task=await taskProject(client,taskId); if(task.project_id!==projectId) throw new Error('Not found'); const column=await client.query('SELECT name FROM public.pm_columns WHERE id=$1 AND project_id=$2',[columnId,projectId]); if(!column.rowCount) throw new Error('Not found'); await client.query('UPDATE public.pm_tasks SET column_id=$1,position=(SELECT COALESCE(MAX(position),-1)+1 FROM public.pm_tasks WHERE column_id=$1),updated_at=NOW() WHERE id=$2',[columnId,taskId]); await logActivity(client,projectId,taskId,userId,'task.moved',`Moved task to ${column.rows[0].name}`); }
      else if(action==='renameColumn') { await membership(client,projectId,userId,false,true); const columnId=idSchema.parse(body.columnId); const name=z.string().trim().min(1).max(80).parse(body.name); await client.query('UPDATE public.pm_columns SET name=$1 WHERE id=$2 AND project_id=$3',[name,columnId,projectId]); await logActivity(client,projectId,null,userId,'column.renamed',`Renamed column to ${name}`); }
      else if(action==='reorderColumns') { await membership(client,projectId,userId,false,true); const ids=z.array(idSchema).parse(body.columnIds); for(const [position,id] of ids.entries()) await client.query('UPDATE public.pm_columns SET position=$1 WHERE id=$2 AND project_id=$3',[position+1000,id,projectId]); for(const [position,id] of ids.entries()) await client.query('UPDATE public.pm_columns SET position=$1 WHERE id=$2 AND project_id=$3',[position,id,projectId]); await logActivity(client,projectId,null,userId,'column.reordered','Reordered board columns'); }
      else if(action==='toggleChecklist') { const checklistId=idSchema.parse(body.checklistId); const row=await client.query('SELECT c.task_id,t.project_id,c.text FROM public.pm_task_checklists c JOIN public.pm_tasks t ON t.id=c.task_id WHERE c.id=$1',[checklistId]); if(!row.rowCount||row.rows[0].project_id!==projectId) throw new Error('Not found'); await membership(client,projectId,userId,true); await client.query('UPDATE public.pm_task_checklists SET is_done=NOT is_done WHERE id=$1',[checklistId]); await logActivity(client,projectId,row.rows[0].task_id,userId,'checklist.updated',`Updated checklist item ${row.rows[0].text}`); }
      else throw new Error('Unsupported action');
      await client.query('COMMIT'); return NextResponse.json({success:true});
    } catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  } catch(error){return errorResponse(error);}
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureSchema(); const userId=await getUserId(req); const projectId=idSchema.parse(req.nextUrl.searchParams.get('projectId')); const type=req.nextUrl.searchParams.get('type'); const id=idSchema.parse(req.nextUrl.searchParams.get('id')); const client=await pool.connect();
    try { await client.query('BEGIN');
      if(type==='task'){await membership(client,projectId,userId,true); const task=await taskProject(client,id); if(task.project_id!==projectId) throw new Error('Not found'); await logActivity(client,projectId,null,userId,'task.deleted',`Deleted task ${task.title}`); await client.query('DELETE FROM public.pm_tasks WHERE id=$1',[id]);}
      else if(type==='column'){await membership(client,projectId,userId,false,true); const count=await client.query('SELECT COUNT(*)::int AS count FROM public.pm_tasks WHERE column_id=$1',[id]); if(count.rows[0].count>0) throw new Error('Move tasks before deleting this column'); await client.query('DELETE FROM public.pm_columns WHERE id=$1 AND project_id=$2',[id,projectId]); await logActivity(client,projectId,null,userId,'column.deleted','Deleted a board column');}
      else throw new Error('Unsupported type');
      await client.query('COMMIT'); return NextResponse.json({success:true});
    }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }catch(error){return errorResponse(error);}
}
