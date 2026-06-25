import { z } from 'zod';

// Roles
export const USER_ROLES = ['Admin', 'QA Engineer', 'Developer', 'Reporter'] as const;
export type UserRole = typeof USER_ROLES[number];

// Feedback Status & Priority
export const FEEDBACK_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export type FeedbackPriority = typeof FEEDBACK_PRIORITIES[number];

export const FEEDBACK_STATUSES = ['Open', 'Reviewed', 'Implemented', 'Rejected'] as const;
export type FeedbackStatus = typeof FEEDBACK_STATUSES[number];

// Issue Type, Severity, Status
export const ISSUE_TYPES = ['Bug', 'Improvement'] as const;
export type IssueType = typeof ISSUE_TYPES[number];

export const ISSUE_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export type IssueSeverity = typeof ISSUE_SEVERITIES[number];

export const ISSUE_STATUSES = ['Open', 'In Progress', 'Ready QA', 'Verified', 'Closed'] as const;
export type IssueStatus = typeof ISSUE_STATUSES[number];

// Release Status
export const RELEASE_STATUSES = ['Draft', 'Released'] as const;
export type ReleaseStatus = typeof RELEASE_STATUSES[number];

// Test Run Status & Results
export const TEST_RUN_STATUSES = ['Draft', 'In Progress', 'Completed'] as const;
export type TestRunStatus = typeof TEST_RUN_STATUSES[number];

export const TEST_RESULT_VALUES = ['Pass', 'Fail', 'Blocked', 'Not Run'] as const;
export type TestResultValue = typeof TEST_RESULT_VALUES[number];

// Models
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  avatar_url?: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface ReleaseProject {
  id: string;
  name: string;
  created_at: string;
}

export interface Release {
  id: string;
  project_id?: string | null;
  version: string;
  release_date: string;
  notes?: string;
  status: ReleaseStatus;
}

export interface Feedback {
  id: string;
  code: string;
  title: string;
  description: string;
  project_id: string;
  reporter_id: string | null;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  created_at: string;
  updated_at: string;
}

export interface Issue {
  id: string;
  code: string;
  feedback_id?: string;
  project_id: string;
  type: IssueType;
  title: string;
  description: string;
  expected_result?: string;
  actual_result?: string;
  steps_to_reproduce?: string;
  severity: IssueSeverity;
  status: IssueStatus;
  assigned_to?: string | null;
  release_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TestSuite {
  id: string;
  project_id: string;
  name: string;
  description: string;
}

export interface TestCase {
  id: string;
  code: string;
  title: string;
  objective?: string;
  precondition?: string;
  post_condition?: string;
  test_data?: string;
  steps?: string; // Markdown text
  expected_result?: string;
  suite_id: string;
  project_id: string;
  tags: string[]; // Smoke, Regression, Functional
  is_automated: boolean;
  automation_link?: string;
  status?: 'Actual' | 'Draft' | 'Deprecated';
  description?: string;
  severity?: 'Normal' | 'Blocker' | 'Critical' | 'Major' | 'Minor' | 'Trivial';
  priority?: 'Not set' | 'High' | 'Medium' | 'Low';
  type?: string;
  layer?: 'Not set' | 'E2E' | 'API' | 'Unit';
  is_flaky?: boolean;
  behavior?: 'Not set' | 'Positive' | 'Negative' | 'Destructive';
  is_muted?: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectShare {
  id: string;
  project_id: string;
  user_id: string;
  role: 'Editor' | 'Viewer';
  created_at?: string;
}

export const USER_FEEDBACK_TOPICS = ['Site Selection', 'Site Analysis', 'GIS Tool', 'Import Data', 'Maps', 'UX Improvement', 'Other'] as const;
export type UserFeedbackTopic = typeof USER_FEEDBACK_TOPICS[number];

export interface UserFeedback {
  id: string;
  topic: UserFeedbackTopic;
  message: string;
  project_id: string;
  email?: string;
  created_at: string;
}


export interface TestRun {
  id: string;
  release_id: string;
  title: string;
  description?: string;
  test_type: string; // Smoke, Regression, Functional
  status: TestRunStatus;
  created_at: string;
}

export interface TestRunResult {
  id: string;
  test_run_id: string;
  test_case_id: string;
  result: TestResultValue;
  actual_result?: string;
  notes?: string;
  executed_by: string | null;
  executed_at: string;
}

export interface Comment {
  id: string;
  entity_type: 'feedback' | 'issue';
  entity_id: string;
  user_id: string | null;
  content: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  details?: string;
  created_at: string;
}

// Zod Validation Schemas
export const feedbackSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  project_id: z.string().min(1, 'Project is required'),
  reporter_id: z.string().min(1, 'Reporter is required'),
  priority: z.enum(FEEDBACK_PRIORITIES),
  status: z.enum(FEEDBACK_STATUSES),
});

export const issueSchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  type: z.enum(ISSUE_TYPES),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  expected_result: z.string().optional(),
  actual_result: z.string().optional(),
  steps_to_reproduce: z.string().optional(),
  severity: z.enum(ISSUE_SEVERITIES),
  status: z.enum(ISSUE_STATUSES),
  assigned_to: z.string().optional(),
  release_id: z.string().optional(),
  feedback_id: z.string().optional(),
});

export const releaseSchema = z.object({
  version: z.string().min(1, 'Version is required').regex(/^\d+\.\d+\.\d+$/, 'Version must follow semver (e.g. 2.56.02)'),
  release_date: z.string().min(1, 'Release date is required'),
  notes: z.string().optional(),
  status: z.enum(RELEASE_STATUSES),
});

export const testSuiteSchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
});

export const testCaseSchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  suite_id: z.string().min(1, 'Suite is required'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  objective: z.string().optional(),
  precondition: z.string().optional(),
  post_condition: z.string().optional(),
  test_data: z.string().optional(),
  steps: z.string().optional(),
  expected_result: z.string().optional(),
  tags: z.array(z.string()).min(1, 'At least one tag is required'),
  is_automated: z.boolean().default(false),
  automation_link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  status: z.enum(['Actual', 'Draft', 'Deprecated']).default('Actual'),
  description: z.string().optional(),
  severity: z.enum(['Normal', 'Blocker', 'Critical', 'Major', 'Minor', 'Trivial']).default('Normal'),
  priority: z.enum(['Not set', 'High', 'Medium', 'Low']).default('Not set'),
  type: z.string().default('Other'),
  layer: z.enum(['Not set', 'E2E', 'API', 'Unit']).default('Not set'),
  is_flaky: z.boolean().default(false),
  behavior: z.enum(['Not set', 'Positive', 'Negative', 'Destructive']).default('Not set'),
  is_muted: z.boolean().default(false),
});

export const projectShareSchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  user_id: z.string().min(1, 'User is required'),
  role: z.enum(['Editor', 'Viewer']),
});

export const userFeedbackSchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  topic: z.enum(USER_FEEDBACK_TOPICS),
  message: z.string().min(3, 'Feedback must be at least 3 characters').max(200, 'Feedback cannot exceed 200 characters'),
  email: z.string().email('Must be a valid email').optional().or(z.literal('')),
});


export const testRunSchema = z.object({
  release_id: z.string().min(1, 'Release is required'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  test_type: z.string().min(1, 'Test type is required'),
});

export interface TestStep {
  action: string;
  data: string;
  expected_result: string;
}

export function parseSteps(steps: string | undefined | null, expected_result?: string | null): TestStep[] {
  if (!steps) {
    return [{ action: '', data: '', expected_result: expected_result || '' }];
  }
  try {
    const parsed = JSON.parse(steps);
    if (Array.isArray(parsed)) {
      return parsed.map((s: any) => ({
        action: s.action || '',
        data: s.data || '',
        expected_result: s.expected_result || ''
      }));
    }
  } catch (e) {
    // Treat as markdown string
  }

  // Classic markdown string parsing fallback
  const lines = steps.split('\n');
  const parsedSteps: TestStep[] = [];
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed) {
      // Remove leading number/bullet (e.g. "1. ", "- ", "* ")
      const cleanAction = trimmed.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*]\s*/, '');
      if (cleanAction) {
        parsedSteps.push({
          action: cleanAction,
          data: '',
          expected_result: parsedSteps.length === 0 ? (expected_result || '') : ''
        });
      }
    }
  });

  if (parsedSteps.length === 0) {
    parsedSteps.push({ action: steps, data: '', expected_result: expected_result || '' });
  }
  return parsedSteps;
}
