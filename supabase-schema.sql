-- Supabase database schema for the QA Management System

-- Create Enum for Roles
CREATE TYPE user_role AS ENUM ('Admin', 'QA Engineer', 'Developer', 'Reporter');

-- Create Enum for Feedback Priority and Status
CREATE TYPE priority_level AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE feedback_status AS ENUM ('Open', 'Reviewed', 'Implemented', 'Rejected');

-- Create Enum for Issue Severity, Status, and Type
CREATE TYPE severity_level AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE issue_status AS ENUM ('Open', 'In Progress', 'Ready QA', 'Verified', 'Closed');
CREATE TYPE issue_type AS ENUM ('Bug', 'Improvement');

-- Create Enum for Release Status
CREATE TYPE release_status AS ENUM ('Draft', 'Released');

-- Create Enum for Test Run Status and Result
CREATE TYPE test_run_status AS ENUM ('Draft', 'In Progress', 'Completed');
CREATE TYPE test_result_value AS ENUM ('Pass', 'Fail', 'Blocked', 'Not Run');

-- 1. Users Table (linking to Supabase Auth)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'Reporter',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow users to update their own profiles" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 2. Projects Table
CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Allow admins and QA engineers to write projects" ON public.projects FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role IN ('Admin', 'QA Engineer')
  )
);

-- 3. Release Projects Table
CREATE TABLE public.release_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.release_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to release projects" ON public.release_projects FOR SELECT USING (true);
CREATE POLICY "Allow admins and QA engineers to write release projects" ON public.release_projects FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role IN ('Admin', 'QA Engineer')
  )
);

-- 3b. Releases Table
CREATE TABLE public.releases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.release_projects(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  release_date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  status release_status NOT NULL DEFAULT 'Draft',
  CONSTRAINT releases_project_id_version_key UNIQUE (project_id, version)
);

ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to releases" ON public.releases FOR SELECT USING (true);
CREATE POLICY "Allow admins and QA engineers to write releases" ON public.releases FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role IN ('Admin', 'QA Engineer')
  )
);

-- 4. Feedbacks Table
CREATE TABLE public.feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  priority priority_level NOT NULL DEFAULT 'Medium',
  status feedback_status NOT NULL DEFAULT 'Open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to feedbacks" ON public.feedbacks FOR SELECT USING (true);
CREATE POLICY "Allow all users to create feedback" ON public.feedbacks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow admins, QA, and reporter to update feedback" ON public.feedbacks FOR UPDATE USING (
  reporter_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role IN ('Admin', 'QA Engineer')
  )
);

-- 5. Issues Table (Bugs and Improvements)
CREATE TABLE public.issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  feedback_id UUID REFERENCES public.feedbacks(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  type issue_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  expected_result TEXT,
  actual_result TEXT,
  steps_to_reproduce TEXT,
  severity severity_level NOT NULL DEFAULT 'Medium',
  status issue_status NOT NULL DEFAULT 'Open',
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  release_id UUID REFERENCES public.releases(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to issues" ON public.issues FOR SELECT USING (true);
CREATE POLICY "Allow admins, QA, and assigned developers to write/update issues" ON public.issues FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role IN ('Admin', 'QA Engineer')
  ) OR assigned_to = auth.uid()
);

-- 6. Test Suites Table
CREATE TABLE public.test_suites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT
);

ALTER TABLE public.test_suites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read to test suites" ON public.test_suites FOR SELECT USING (true);
CREATE POLICY "Allow admins and QA to write test suites" ON public.test_suites FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role IN ('Admin', 'QA Engineer')
  )
);

-- 7. Test Cases Table
CREATE TABLE public.test_cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  objective TEXT,
  precondition TEXT,
  test_data TEXT,
  steps TEXT,
  expected_result TEXT,
  suite_id UUID REFERENCES public.test_suites(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  tags TEXT[] DEFAULT '{}',
  is_automated BOOLEAN DEFAULT FALSE,
  automation_link TEXT,
  status TEXT DEFAULT 'Actual',
  description TEXT,
  severity TEXT DEFAULT 'Normal',
  priority TEXT DEFAULT 'Not set',
  type TEXT DEFAULT 'Other',
  layer TEXT DEFAULT 'Not set',
  is_flaky BOOLEAN DEFAULT FALSE,
  behavior TEXT DEFAULT 'Not set',
  is_muted BOOLEAN DEFAULT FALSE,
  post_condition TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read to test cases" ON public.test_cases FOR SELECT USING (true);
CREATE POLICY "Allow admins and QA to write test cases" ON public.test_cases FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role IN ('Admin', 'QA Engineer')
  )
);

-- 8. Test Runs Table
CREATE TABLE public.test_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  test_type TEXT NOT NULL,
  status test_run_status NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read to test runs" ON public.test_runs FOR SELECT USING (true);
CREATE POLICY "Allow admins and QA to write test runs" ON public.test_runs FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role IN ('Admin', 'QA Engineer')
  )
);

-- 9. Test Run Results Table
CREATE TABLE public.test_run_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_run_id UUID REFERENCES public.test_runs(id) ON DELETE CASCADE,
  test_case_id UUID REFERENCES public.test_cases(id) ON DELETE CASCADE,
  result test_result_value NOT NULL DEFAULT 'Not Run',
  actual_result TEXT,
  notes TEXT,
  executed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(test_run_id, test_case_id)
);

ALTER TABLE public.test_run_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read to test run results" ON public.test_run_results FOR SELECT USING (true);
CREATE POLICY "Allow admins and QA to update results" ON public.test_run_results FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role IN ('Admin', 'QA Engineer')
  )
);

-- 10. Comments Table
CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read to comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to write comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 11. Activity Logs Table
CREATE TABLE public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read to activity logs" ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY "Allow system insertions to activity logs" ON public.activity_logs FOR INSERT WITH CHECK (true);

-- Seed Data (Initial Admin/User Trigger Helper)
-- Creates user record in public.users when a user signs up on Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'Reporter'::user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. Project Shares Table
CREATE TABLE public.project_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('Editor', 'Viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read to project shares" ON public.project_shares FOR SELECT USING (true);
CREATE POLICY "Allow admins and QA to write project shares" ON public.project_shares FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role IN ('Admin', 'QA Engineer')
  )
);

/*
MIGRATION INSTRUCTIONS FOR EXISTING DATABASES:
If you already ran the previous schema version, you can apply this diff in your Supabase SQL editor:

ALTER TABLE public.test_cases 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Actual',
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'Normal',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Not set',
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Other',
ADD COLUMN IF NOT EXISTS layer TEXT DEFAULT 'Not set',
ADD COLUMN IF NOT EXISTS is_flaky BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS behavior TEXT DEFAULT 'Not set',
ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS post_condition TEXT;

CREATE TABLE IF NOT EXISTS public.project_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('Editor', 'Viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read to project shares" ON public.project_shares FOR SELECT USING (true);
CREATE POLICY "Allow admins and QA to write project shares" ON public.project_shares FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role IN ('Admin', 'QA Engineer')
  )
);

CREATE TABLE IF NOT EXISTS public.user_feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  message VARCHAR(200) NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_feedbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read to user feedbacks" ON public.user_feedbacks FOR SELECT USING (true);
CREATE POLICY "Allow anyone to insert user feedbacks" ON public.user_feedbacks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admins, QA, and project editors to delete user feedbacks" ON public.user_feedbacks FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role IN ('Admin', 'QA Engineer')
  ) OR EXISTS (
    SELECT 1 FROM public.project_shares
    WHERE project_shares.project_id = user_feedbacks.project_id 
      AND project_shares.user_id = auth.uid() 
      AND project_shares.role = 'Editor'
  )
);
*/

