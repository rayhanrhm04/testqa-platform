import { create } from 'zustand';
import { 
  Project, Feedback, Issue, Release, TestSuite, TestCase, TestRun, TestRunResult, Comment, ActivityLog,
  FeedbackPriority, FeedbackStatus, IssueType, IssueSeverity, IssueStatus, ReleaseStatus, TestRunStatus, TestResultValue,
  ProjectShare, User, UserRole, UserFeedback, UserFeedbackTopic, ReleaseProject,
  ExploratorySession, ExploratoryNote, ExploratoryBug, ExploratoryEvidence
} from '@/lib/validators';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const toUuidOrNull = (id: string | null | undefined) => {
  if (!id) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id) ? id : null;
};

interface DataState {
  projects: Project[];
  feedbacks: Feedback[];
  issues: Issue[];
  releases: Release[];
  releaseProjects: ReleaseProject[];
  testSuites: TestSuite[];
  testCases: TestCase[];
  testRuns: TestRun[];
  testRunResults: TestRunResult[];
  comments: Comment[];
  activityLogs: ActivityLog[];
  users: User[];
  projectShares: ProjectShare[];
  userFeedbacks: UserFeedback[];
  exploratorySessions: ExploratorySession[];
  exploratoryNotes: ExploratoryNote[];
  exploratoryBugs: ExploratoryBug[];
  exploratoryEvidence: ExploratoryEvidence[];
  isLoading: boolean;

  // Actions
  fetchData: () => Promise<void>;
  
  // Users
  updateUserRole: (id: string, role: UserRole) => Promise<void>;
  
  // Projects
  addProject: (name: string, description: string) => Promise<Project | null>;
  updateProject: (id: string, name: string, description: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  
  // Project sharing
  shareProject: (projectId: string, userId: string, role: 'Editor' | 'Viewer') => Promise<void>;
  unshareProject: (shareId: string) => Promise<void>;
  updateProjectShareRole: (shareId: string, role: 'Editor' | 'Viewer') => Promise<void>;

  // Feedbacks
  addFeedback: (feedback: Omit<Feedback, 'id' | 'code' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateFeedback: (id: string, updates: Partial<Feedback>) => Promise<void>;
  deleteFeedback: (id: string) => Promise<void>;
  convertFeedbackToIssue: (feedbackId: string, issueType: IssueType, issueData: Partial<Issue>) => Promise<void>;

  // Issues
  addIssue: (issue: Omit<Issue, 'id' | 'code' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateIssue: (id: string, updates: Partial<Issue>) => Promise<void>;
  deleteIssue: (id: string) => Promise<void>;
  updateIssueStatus: (id: string, status: IssueStatus) => Promise<void>;

  // Releases
  addRelease: (release: Omit<Release, 'id'>) => Promise<void>;
  updateRelease: (id: string, updates: Partial<Release>) => Promise<void>;
  deleteRelease: (id: string) => Promise<void>;

  // Release Projects
  addReleaseProject: (name: string) => Promise<ReleaseProject | null>;
  deleteReleaseProject: (id: string) => Promise<void>;

  // Test Suites
  addTestSuite: (project_id: string, name: string, description?: string) => Promise<TestSuite | null>;
  updateTestSuite: (id: string, name: string, description?: string) => Promise<void>;
  deleteTestSuite: (id: string) => Promise<void>;

  // Test Cases
  addTestCase: (testCase: Omit<TestCase, 'id' | 'code' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateTestCase: (id: string, updates: Partial<TestCase>) => Promise<void>;
  deleteTestCase: (id: string) => Promise<void>;
  bulkCloneTestCases: (ids: string[], targetSuiteId?: string) => Promise<void>;
  bulkMoveTestCases: (ids: string[], targetSuiteId: string) => Promise<void>;
  bulkDeleteTestCases: (ids: string[]) => Promise<void>;

  // Test Runs
  addTestRun: (releaseId: string, title: string, testType: string, description?: string) => Promise<void>;
  updateTestRunStatus: (id: string, status: TestRunStatus) => Promise<void>;
  deleteTestRun: (id: string) => Promise<void>;
  updateTestRunResult: (runId: string, caseId: string, result: TestResultValue, actualResult?: string, notes?: string, userId?: string) => Promise<void>;
  resetTestRun: (runId: string) => Promise<void>;

  // Comments
  addComment: (entityType: 'feedback' | 'issue', entityId: string, userId: string, content: string) => Promise<void>;
  
  // Activity Logging
  logActivity: (userId: string, action: string, details?: string) => Promise<void>;

  // User Feedbacks
  addUserFeedback: (project_id: string, topic: UserFeedbackTopic, message: string, email?: string) => Promise<void>;
  deleteUserFeedback: (id: string) => Promise<void>;

  // Exploratory Testing
  addExploratorySession: (session: Omit<ExploratorySession, 'id' | 'created_at' | 'updated_at' | 'elapsed_seconds' | 'status'>) => Promise<ExploratorySession | null>;
  updateExploratorySession: (id: string, updates: Partial<ExploratorySession>) => Promise<void>;
  addExploratoryNote: (sessionId: string, noteText: string) => Promise<void>;
  addExploratoryBug: (bug: Omit<ExploratoryBug, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  addExploratoryEvidence: (evidence: Omit<ExploratoryEvidence, 'id' | 'created_at'>) => Promise<void>;
}

// ----------------------------------------------------
// DEFAULT SEED DATA (For Local Mode)
// ----------------------------------------------------
const seedProjects: Project[] = [
  { id: 'p-1', name: 'GEO MAPID', description: 'Advanced mapping dashboard, editor, and geospatial analytics.', created_at: new Date('2026-01-10').toISOString() },
  { id: 'p-2', name: 'FORM MAPID', description: 'No-code geospatial forms builder and manager.', created_at: new Date('2026-01-15').toISOString() },
  { id: 'p-3', name: 'MAPID APPS', description: 'Internal portals, communities, and customer surveys.', created_at: new Date('2026-01-20').toISOString() },
  { id: 'p-4', name: 'MAPID ACADEMY', description: 'Online documentation, tutorial tracks, and certifications.', created_at: new Date('2026-02-01').toISOString() },
];

const seedReleaseProjects: ReleaseProject[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'DSDA Jakarta', created_at: new Date('2026-01-01').toISOString() },
  { id: '22222222-2222-2222-2222-222222222222', name: 'FORM MAPID', created_at: new Date('2026-01-05').toISOString() },
  { id: '33333333-3333-3333-3333-333333333333', name: 'GEO MAPID', created_at: new Date('2026-01-10').toISOString() },
];

const seedReleases: Release[] = [
  { id: 'r-1', project_id: '11111111-1111-1111-1111-111111111111', version: '2.56.00', release_date: new Date('2026-04-10').toISOString(), notes: 'Initial map rendering acceleration and layout rework.', status: 'Released' },
  { id: 'r-2', project_id: '11111111-1111-1111-1111-111111111111', version: '2.56.01', release_date: new Date('2026-05-15').toISOString(), notes: 'Improvements to community channels and export metrics.', status: 'Released' },
  { id: 'r-3', project_id: '11111111-1111-1111-1111-111111111111', version: '2.56.02', release_date: new Date('2026-06-25').toISOString(), notes: 'Pending release with bugfixes for GIS map exporters.', status: 'Draft' },
];

const seedFeedbacks: Feedback[] = [
  { id: 'fb-1', code: 'FB-001', title: 'Shapefile date attributes showing raw timestamps', description: 'When exporting files from GEO MAPID, dates are formatted in epoch milliseconds instead of standard ISO format.', project_id: 'p-1', reporter_id: 'user-rep-1', priority: 'High', status: 'Reviewed', created_at: new Date('2026-06-01').toISOString(), updated_at: new Date('2026-06-03').toISOString() },
  { id: 'fb-2', code: 'FB-002', title: 'Slow rendering performance on files larger than 50MB', description: 'Layers containing over 50k coordinates slow the map view down drastically. Needs hardware acceleration or clustering.', project_id: 'p-1', reporter_id: 'user-rep-1', priority: 'Critical', status: 'Implemented', created_at: new Date('2026-06-02').toISOString(), updated_at: new Date('2026-06-15').toISOString() },
  { id: 'fb-3', code: 'FB-003', title: 'Community forum page crashes when uploading avatar images', description: 'Uploading a large PNG profile pic results in an unhandled API error and page whitescreen.', project_id: 'p-3', reporter_id: 'user-rep-1', priority: 'Medium', status: 'Open', created_at: new Date('2026-06-10').toISOString(), updated_at: new Date('2026-06-10').toISOString() },
  { id: 'fb-4', code: 'FB-004', title: 'Form editor crashes on nested conditions setup', description: 'Selecting multi-level dependencies in custom fields causes React hook form evaluation to loop infinitely.', project_id: 'p-2', reporter_id: 'user-rep-1', priority: 'Critical', status: 'Rejected', created_at: new Date('2026-06-12').toISOString(), updated_at: new Date('2026-06-13').toISOString() },
];

const seedIssues: Issue[] = [
  { id: 'i-1', code: 'BUG-001', feedback_id: 'fb-1', project_id: 'p-1', type: 'Bug', title: 'Export date format mismatch in shapefile exports', description: 'Format date values correctly before serializing shapefile metadata on server.', expected_result: 'Dates should export as YYYY-MM-DD.', actual_result: 'Export shows epoch timestamp e.g. 1774888200000.', steps_to_reproduce: '1. Go to Map Viewer\n2. Select Export Layer\n3. Choose Shapefile format\n4. Open DBF file in GIS viewer.', severity: 'Medium', status: 'Ready QA', assigned_to: 'user-dev-1', release_id: 'r-3', created_at: new Date('2026-06-03').toISOString(), updated_at: new Date('2026-06-14').toISOString() },
  { id: 'i-2', code: 'BUG-002', feedback_id: 'fb-2', project_id: 'p-1', type: 'Bug', title: 'Layer rendering takes > 5 seconds for large datasets', description: 'Apply point clustering logic on map layers loading over 10,000 points.', expected_result: 'Map loaded in under 1.5 seconds using dynamic cluster layers.', actual_result: 'Browser hangs for 8 seconds and displays out-of-memory warnings.', steps_to_reproduce: '1. Load spatial layer "Mega Spatial Dataset"\n2. Zoom out to view all points.', severity: 'Critical', status: 'Verified', assigned_to: 'user-dev-1', release_id: 'r-2', created_at: new Date('2026-06-05').toISOString(), updated_at: new Date('2026-06-15').toISOString() },
  { id: 'i-3', code: 'IMP-001', project_id: 'p-3', type: 'Improvement', title: 'Added grouping chart feature to community dashboard', description: 'Provide stacked horizontal bar graphs for active dashboard members by organization role.', severity: 'Low', status: 'Verified', assigned_to: 'user-dev-1', release_id: 'r-2', created_at: new Date('2026-06-06').toISOString(), updated_at: new Date('2026-06-14').toISOString() },
  { id: 'i-4', code: 'IMP-002', project_id: 'p-1', type: 'Improvement', title: 'Add warning dialog for collaboration file overwrite', description: 'Prompt user when saving if another user edited the project map layer details in the last 60 seconds.', expected_result: 'Interactive overwrite prompt showing conflict details.', actual_result: 'Silently overwrites other user changes.', steps_to_reproduce: '1. Open same map editor in two tabs.\n2. Modify point in Tab A.\n3. Modify point in Tab B and hit Save.', severity: 'High', status: 'In Progress', assigned_to: 'user-dev-1', release_id: 'r-3', created_at: new Date('2026-06-07').toISOString(), updated_at: new Date('2026-06-16').toISOString() },
];

const seedTestSuites: TestSuite[] = [
  { id: 'ts-1', project_id: 'p-1', name: 'Map Editor', description: 'Tests covering drawing tools, basemap switches, and asset modifications.' },
  { id: 'ts-2', project_id: 'p-1', name: 'Layer Exporter', description: 'Validations for GeoJSON, KML, CSV, and Shapefile exports.' },
  { id: 'ts-3', project_id: 'p-2', name: 'Form Builder', description: 'Logic validation, validation messages, and custom logic chains.' },
  { id: 'ts-4', project_id: 'p-3', name: 'Community Forum', description: 'User profile management, comments thread, and notifications.' },
];

const seedTestCases: TestCase[] = [
  { id: 'tc-1', code: 'TC-LAYER-001', title: 'Verify export format of attributes table to CSV', objective: 'Ensure all data types including dates are exported clearly in standard CSV format.', precondition: 'A layer with at least 5 attributes including text, integers, and datetime is active.', test_data: 'Sample dataset: City Parks GIS.', steps: '1. Open GEO MAPID dashboard.\n2. Click "City Parks GIS" layer.\n3. Open Layer Settings -> Export.\n4. Select CSV and click Export.\n5. Open downloaded file in spreadsheet editor.', expected_result: 'CSV file matches table grid with date column parsed as YYYY-MM-DD HH:mm:ss.', suite_id: 'ts-2', project_id: 'p-1', tags: ['Smoke', 'Functional'], is_automated: true, automation_link: 'https://github.com/mapid/cypress/e2e/exporter.cy.ts', created_by: 'user-qa-1', created_at: new Date('2026-06-02').toISOString(), updated_at: new Date('2026-06-02').toISOString() },
  { id: 'tc-2', code: 'TC-MAP-001', title: 'Check layer rendering and point clusters at low zoom', objective: 'Validate that coordinates cluster together at zoom levels <= 8 for high coordinate layers.', precondition: 'Hardware acceleration enabled. Test dataset is active.', steps: '1. Load map editor.\n2. Add high-density vector layer.\n3. Verify individual icons are visible at zoom level 15.\n4. Zoom out to level 7.', expected_result: 'Vector icons cluster into single circle badges showing count. Browser memory usage does not spike.', suite_id: 'ts-1', project_id: 'p-1', tags: ['Regression'], is_automated: false, created_by: 'user-qa-1', created_at: new Date('2026-06-04').toISOString(), updated_at: new Date('2026-06-04').toISOString() },
  { id: 'tc-3', code: 'TC-FORM-001', title: 'Verify custom select lists with external API resources', objective: 'Assert that external API inputs load dropdown options dynamically on selection.', precondition: 'Active network connection. API endpoint is online.', steps: '1. Create a Form Editor.\n2. Add Selector element.\n3. Choose Source -> External API.\n4. Save Form and Open Live Link.\n5. Click selector dropdown.', expected_result: 'Dropdown populates options fetched from mock API endpoint.', suite_id: 'ts-3', project_id: 'p-2', tags: ['Functional'], is_automated: false, created_by: 'user-qa-1', created_at: new Date('2026-06-08').toISOString(), updated_at: new Date('2026-06-08').toISOString() },
  { id: 'tc-4', code: 'TC-COMMUNITY-001', title: 'Verify community chat user tags triggering notifications', objective: 'Verify tagging another user using @name triggers notification center logs.', precondition: 'Two registered user profiles.', steps: '1. Login as User A.\n2. Navigate to Community Forum.\n3. Type message "@Sarah Connor verify this fix".\n4. Submit comment.\n5. Login as User B (Sarah Connor).', expected_result: 'User B sees red notification dot and "User A mentioned you" message.', suite_id: 'ts-4', project_id: 'p-3', tags: ['Smoke'], is_automated: true, automation_link: 'https://github.com/mapid/cypress/e2e/mentions.cy.ts', created_by: 'user-qa-1', created_at: new Date('2026-06-10').toISOString(), updated_at: new Date('2026-06-11').toISOString() },
];

const seedTestRuns: TestRun[] = [
  { id: 'tr-1', release_id: 'r-3', title: 'Regression Run v2.56.02', description: 'Run all regression tests prior to merging GIS Map export features.', test_type: 'Regression', status: 'In Progress', created_at: new Date('2026-06-15').toISOString() },
];

const seedTestRunResults: TestRunResult[] = [
  { id: 'trr-1', test_run_id: 'tr-1', test_case_id: 'tc-2', result: 'Pass', actual_result: 'Clustering triggered correctly, memory was stable.', notes: 'Tested on Safari & Chrome.', executed_by: 'user-qa-1', executed_at: new Date('2026-06-16').toISOString() },
];

const seedComments: Comment[] = [
  { id: 'c-1', entity_type: 'feedback', entity_id: 'fb-1', user_id: 'user-qa-1', content: 'Double checked, we should format the output directly in standard ISO YYYY-MM-DD instead of local formatting to maintain compatibility.', created_at: new Date('2026-06-02T10:00:00Z').toISOString() },
  { id: 'c-2', entity_type: 'issue', entity_id: 'i-1', user_id: 'user-dev-1', content: 'Implemented formatting on the DBF exporter class. Pushed to release branch v2.56.02.', created_at: new Date('2026-06-13T14:30:00Z').toISOString() },
];

const seedActivityLogs: ActivityLog[] = [
  { id: 'l-1', user_id: 'user-admin-1', action: 'Created project GEO MAPID', created_at: new Date('2026-06-01T09:00:00Z').toISOString() },
  { id: 'l-2', user_id: 'user-qa-1', action: 'Created feedback FB-001', details: 'Export date format issue in GEO MAPID', created_at: new Date('2026-06-01T11:20:00Z').toISOString() },
];

const seedUserFeedbacks: UserFeedback[] = [
  { id: 'ufb-1', project_id: 'p-1', topic: 'Site Selection', message: 'Sangat terbantu menggunakan fitur site selection untuk mencari area prospek ruko baru di Bandung. Saran kalau bisa ditambahkan data kepadatan penduduk terbaru.', email: 'budi.hartono@gmail.com', created_at: new Date('2026-06-20T08:30:00Z').toISOString() },
  { id: 'ufb-2', project_id: 'p-1', topic: 'GIS Tool', message: 'Fitur buffer radius 1km kadang loading-nya agak lama kalau titiknya banyak. Tolong dioptimasi kembali.', email: 'anita.sari@corporate.id', created_at: new Date('2026-06-21T10:15:00Z').toISOString() },
  { id: 'ufb-3', project_id: 'p-1', topic: 'Import Data', message: 'Sukses import file GeoJSON sebesar 12MB. Sangat lancar dibanding platform sebelah!', email: 'hendra.wijaya@spatial.org', created_at: new Date('2026-06-22T14:45:00Z').toISOString() },
  { id: 'ufb-4', project_id: 'p-1', topic: 'UX Improvement', message: 'Tampilan dark mode-nya keren sekali, tapi kontras warna teks legenda peta di sebelah kiri agak sulit dibaca.', email: 'rizky.ramadhan@uxdesign.net', created_at: new Date('2026-06-23T09:20:00Z').toISOString() },
  { id: 'ufb-5', project_id: 'p-1', topic: 'Maps', message: 'Basemap satelit resolusi tinggi sangat detail! Apakah ada opsi untuk offline basemap?', email: 'dewi.lestari@agri-tech.co.id', created_at: new Date('2026-06-23T11:05:00Z').toISOString() }
];

// ----------------------------------------------------
// STATE STORE IMPLEMENTATION
// ----------------------------------------------------

export const useDataStore = create<DataState>((set, get) => {
  // Helpers
  const persist = (updatedState: Partial<DataState>) => {
    if (!isSupabaseConfigured()) {
      Object.entries(updatedState).forEach(([key, val]) => {
        if (key !== 'isLoading') {
          localStorage.setItem(`qa_${key}`, JSON.stringify(val));
        }
      });
    }
  };

  const getNextCode = (prefix: string, list: { code: string }[]) => {
    const numbers = list
      .filter((i) => i.code.startsWith(prefix))
      .map((i) => {
        const parts = i.code.split('-');
        return parseInt(parts[parts.length - 1], 10);
      })
      .filter((n) => !isNaN(n));
    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
  };

  return {
    projects: [],
    feedbacks: [],
    issues: [],
    releases: [],
    releaseProjects: [],
    testSuites: [],
    testCases: [],
    testRuns: [],
    testRunResults: [],
    comments: [],
    activityLogs: [],
    users: [],
    projectShares: [],
    userFeedbacks: [],
    exploratorySessions: [],
    exploratoryNotes: [],
    exploratoryBugs: [],
    exploratoryEvidence: [],
    isLoading: true,

    fetchData: async () => {
      set({ isLoading: true });
      if (isSupabaseConfigured()) {
        try {
          const [
            { data: p },
            { data: fb },
            { data: iss },
            { data: rel },
            { data: ts },
            { data: tc },
            { data: tr },
            { data: trr },
            { data: comm },
            { data: act },
            { data: u }
          ] = await Promise.all([
            supabase!.from('projects').select('*').order('created_at', { ascending: false }),
            supabase!.from('feedbacks').select('*').order('created_at', { ascending: false }),
            supabase!.from('issues').select('*').order('created_at', { ascending: false }),
            supabase!.from('releases').select('*').order('release_date', { ascending: false }),
            supabase!.from('test_suites').select('*'),
            supabase!.from('test_cases').select('*').order('code', { ascending: true }),
            supabase!.from('test_runs').select('*').order('created_at', { ascending: false }),
            supabase!.from('test_run_results').select('*'),
            supabase!.from('comments').select('*').order('created_at', { ascending: true }),
            supabase!.from('activity_logs').select('*').order('created_at', { ascending: false }),
            supabase!.from('users').select('*').order('created_at', { ascending: false }),
          ]);
          
          let shares: any[] = [];
          try {
            const { data } = await supabase!.from('project_shares').select('*');
            shares = data || [];
          } catch (e) {
            console.warn("Table project_shares does not exist or fetch failed:", e);
          }

          let userFbs: any[] = [];
          try {
            const { data } = await supabase!.from('user_feedbacks').select('*').order('created_at', { ascending: false });
            userFbs = data || [];
          } catch (e) {
            console.warn("Table user_feedbacks does not exist or fetch failed, loading fallback:", e);
            const local = localStorage.getItem('qa_userFeedbacks');
            userFbs = local ? JSON.parse(local) : seedUserFeedbacks;
          }

          let releaseProjectsData: any[] = [];
          try {
            const { data } = await supabase!.from('release_projects').select('*').order('created_at', { ascending: true });
            releaseProjectsData = data || [];
          } catch (e) {
            console.warn("Table release_projects does not exist or fetch failed, loading fallback:", e);
            const local = localStorage.getItem('qa_releaseProjects');
            releaseProjectsData = local ? JSON.parse(local) : seedReleaseProjects;
          }

          let expSessions: any[] = [];
          let expNotes: any[] = [];
          let expBugs: any[] = [];
          let expEvidence: any[] = [];
          try {
            const [
              { data: es },
              { data: en },
              { data: eb },
              { data: ee }
            ] = await Promise.all([
              supabase!.from('exploratory_sessions').select('*').order('created_at', { ascending: false }),
              supabase!.from('exploratory_notes').select('*').order('created_at', { ascending: true }),
              supabase!.from('exploratory_bugs').select('*').order('created_at', { ascending: false }),
              supabase!.from('exploratory_evidence').select('*').order('created_at', { ascending: false }),
            ]);
            expSessions = es || [];
            expNotes = en || [];
            expBugs = eb || [];
            expEvidence = ee || [];
          } catch (e) {
            console.warn("Exploratory testing tables fetch failed, loading fallback:", e);
            expSessions = JSON.parse(localStorage.getItem('qa_exploratorySessions') || '[]');
            expNotes = JSON.parse(localStorage.getItem('qa_exploratoryNotes') || '[]');
            expBugs = JSON.parse(localStorage.getItem('qa_exploratoryBugs') || '[]');
            expEvidence = JSON.parse(localStorage.getItem('qa_exploratoryEvidence') || '[]');
          }
 
           set({
             projects: p || [],
             feedbacks: fb || [],
             issues: iss || [],
             releases: rel || [],
             releaseProjects: releaseProjectsData,
             testSuites: ts || [],
             testCases: tc || [],
             testRuns: tr || [],
             testRunResults: trr || [],
             comments: comm || [],
             activityLogs: act || [],
             users: u || [],
             projectShares: shares,
             userFeedbacks: userFbs,
             exploratorySessions: expSessions,
             exploratoryNotes: expNotes,
             exploratoryBugs: expBugs,
             exploratoryEvidence: expEvidence,
             isLoading: false,
           });
        } catch (e) {
          console.error("Failed fetching Supabase tables, falling back to storage", e);
          set({ isLoading: false });
        }
      } else {
        // LocalStorage loading
        setTimeout(() => {
          const getLocal = <T>(key: string, fallback: T): T => {
            const data = localStorage.getItem(`qa_${key}`);
            return data ? JSON.parse(data) : fallback;
          };

          const registered = JSON.parse(localStorage.getItem('qa_registered_users') || '[]');
          const cleanRegistered = registered.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            created_at: u.created_at,
          }));
          const seedMockUsers = [
            { id: 'user-admin-1', name: 'Sarah Connor (Admin)', email: 'sarah.connor@portal.qa', role: 'Admin', created_at: new Date('2026-01-01').toISOString() },
            { id: 'user-qa-1', name: 'Alex Mercer (QA Engineer)', email: 'alex.mercer@portal.qa', role: 'QA Engineer', created_at: new Date('2026-01-05').toISOString() },
            { id: 'user-dev-1', name: 'Linus Torvalds (Developer)', email: 'linus.t@portal.qa', role: 'Developer', created_at: new Date('2026-01-10').toISOString() },
            { id: 'user-rep-1', name: 'GIS Team (Reporter)', email: 'gis.team@portal.qa', role: 'Reporter', created_at: new Date('2026-01-15').toISOString() },
          ];
          const allUsers = [...seedMockUsers, ...cleanRegistered];

          set({
            projects: getLocal('projects', seedProjects),
            feedbacks: getLocal('feedbacks', seedFeedbacks),
            issues: getLocal('issues', seedIssues),
            releases: getLocal('releases', seedReleases),
            releaseProjects: getLocal('releaseProjects', seedReleaseProjects),
            testSuites: getLocal('testSuites', seedTestSuites),
            testCases: getLocal('testCases', seedTestCases),
            testRuns: getLocal('testRuns', seedTestRuns),
            testRunResults: getLocal('testRunResults', seedTestRunResults),
            comments: getLocal('comments', seedComments),
            activityLogs: getLocal('activityLogs', seedActivityLogs),
            users: allUsers,
            projectShares: getLocal('projectShares', []),
            userFeedbacks: getLocal('userFeedbacks', seedUserFeedbacks),
            exploratorySessions: getLocal('exploratorySessions', []),
            exploratoryNotes: getLocal('exploratoryNotes', []),
            exploratoryBugs: getLocal('exploratoryBugs', []),
            exploratoryEvidence: getLocal('exploratoryEvidence', []),
            isLoading: false,
          });
        }, 300);
      }
    },

    updateUserRole: async (id, role) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('users').update({ role }).eq('id', id);
        set((state) => ({
          users: state.users.map((u) => u.id === id ? { ...u, role } : u),
        }));
      } else {
        set((state) => {
          const next = state.users.map((u) => u.id === id ? { ...u, role } : u);
          const registered = JSON.parse(localStorage.getItem('qa_registered_users') || '[]');
          const updatedReg = registered.map((u: any) => u.id === id ? { ...u, role } : u);
          localStorage.setItem('qa_registered_users', JSON.stringify(updatedReg));
          return { users: next };
        });
      }
    },

    // ----------------------------------------------------
    // PROJECTS CRUD
    // ----------------------------------------------------
    addProject: async (name, description) => {
      const newProj: Project = {
        id: isSupabaseConfigured() ? undefined : `p-${Date.now()}` as any,
        name,
        description,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!.from('projects').insert(newProj).select();
        if (!error && data && data[0]) {
          set((state) => ({ projects: [data[0], ...state.projects] }));
          return data[0];
        }
        return null;
      } else {
        set((state) => {
          const next = [newProj, ...state.projects];
          persist({ projects: next });
          return { projects: next };
        });
        return newProj;
      }
    },

    updateProject: async (id, name, description) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('projects').update({ name, description }).eq('id', id);
        set((state) => ({
          projects: state.projects.map((p) => p.id === id ? { ...p, name, description } : p),
        }));
      } else {
        set((state) => {
          const next = state.projects.map((p) => p.id === id ? { ...p, name, description } : p);
          persist({ projects: next });
          return { projects: next };
        });
      }
    },

    deleteProject: async (id) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('projects').delete().eq('id', id);
        set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }));
      } else {
        set((state) => {
          const next = state.projects.filter((p) => p.id !== id);
          persist({ projects: next });
          return { projects: next };
        });
      }
    },
 
    shareProject: async (projectId, userId, role) => {
      const newShare: ProjectShare = {
        id: isSupabaseConfigured() ? undefined : `ps-${Date.now()}` as any,
        project_id: projectId,
        user_id: userId,
        role,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!.from('project_shares').insert(newShare).select();
        if (!error && data) {
          set((state) => ({ projectShares: [...state.projectShares, data[0]] }));
        }
      } else {
        set((state) => {
          const next = [...state.projectShares, newShare];
          persist({ projectShares: next });
          return { projectShares: next };
        });
      }
    },

    unshareProject: async (shareId) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('project_shares').delete().eq('id', shareId);
        set((state) => ({ projectShares: state.projectShares.filter((s) => s.id !== shareId) }));
      } else {
        set((state) => {
          const next = state.projectShares.filter((s) => s.id !== shareId);
          persist({ projectShares: next });
          return { projectShares: next };
        });
      }
    },

    updateProjectShareRole: async (shareId, role) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('project_shares').update({ role }).eq('id', shareId);
        set((state) => ({
          projectShares: state.projectShares.map((s) => s.id === shareId ? { ...s, role } : s),
        }));
      } else {
        set((state) => {
          const next = state.projectShares.map((s) => s.id === shareId ? { ...s, role } : s);
          persist({ projectShares: next });
          return { projectShares: next };
        });
      }
    },

    // ----------------------------------------------------
    // FEEDBACKS CRUD
    // ----------------------------------------------------
    addFeedback: async (feedback) => {
      const code = getNextCode('FB', get().feedbacks);
      const newFb: Feedback = {
        ...feedback,
        id: isSupabaseConfigured() ? undefined : `fb-${Date.now()}` as any,
        code,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const dbFb = {
          ...newFb,
          reporter_id: toUuidOrNull(newFb.reporter_id)
        };
        const { data, error } = await supabase!.from('feedbacks').insert(dbFb).select();
        if (!error && data) {
          set((state) => ({ feedbacks: [data[0], ...state.feedbacks] }));
        }
      } else {
        set((state) => {
          const next = [newFb, ...state.feedbacks];
          persist({ feedbacks: next });
          return { feedbacks: next };
        });
      }
    },

    updateFeedback: async (id, updates) => {
      const payload = { ...updates, updated_at: new Date().toISOString() };
      if (isSupabaseConfigured()) {
        const dbPayload = {
          ...payload,
          reporter_id: updates.reporter_id !== undefined ? toUuidOrNull(updates.reporter_id) : undefined
        };
        Object.keys(dbPayload).forEach(key => (dbPayload as any)[key] === undefined && delete (dbPayload as any)[key]);
        await supabase!.from('feedbacks').update(dbPayload).eq('id', id);
        set((state) => ({
          feedbacks: state.feedbacks.map((f) => f.id === id ? { ...f, ...payload } : f),
        }));
      } else {
        set((state) => {
          const next = state.feedbacks.map((f) => f.id === id ? { ...f, ...payload } : f);
          persist({ feedbacks: next });
          return { feedbacks: next };
        });
      }
    },

    deleteFeedback: async (id) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('feedbacks').delete().eq('id', id);
        set((state) => ({ feedbacks: state.feedbacks.filter((f) => f.id !== id) }));
      } else {
        set((state) => {
          const next = state.feedbacks.filter((f) => f.id !== id);
          persist({ feedbacks: next });
          return { feedbacks: next };
        });
      }
    },

    convertFeedbackToIssue: async (feedbackId, issueType, issueData) => {
      // 1. Create issue
      const codePrefix = issueType === 'Bug' ? 'BUG' : 'IMP';
      const code = getNextCode(codePrefix, get().issues);
      const newIssue: Issue = {
        id: isSupabaseConfigured() ? undefined : `i-${Date.now()}` as any,
        code,
        feedback_id: feedbackId,
        project_id: issueData.project_id!,
        type: issueType,
        title: issueData.title || '',
        description: issueData.description || '',
        expected_result: issueData.expected_result,
        actual_result: issueData.actual_result,
        steps_to_reproduce: issueData.steps_to_reproduce,
        severity: issueData.severity || 'Medium',
        status: 'Open',
        assigned_to: issueData.assigned_to,
        release_id: issueData.release_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 2. Update feedback status to Reviewed
      if (isSupabaseConfigured()) {
        const dbIssue = {
          ...newIssue,
          assigned_to: toUuidOrNull(newIssue.assigned_to)
        };
        const [{ data: issueRes }, { error: fbError }] = await Promise.all([
          supabase!.from('issues').insert(dbIssue).select(),
          supabase!.from('feedbacks').update({ status: 'Reviewed', updated_at: new Date().toISOString() }).eq('id', feedbackId)
        ]);
        if (issueRes) {
          set((state) => ({
            issues: [issueRes[0], ...state.issues],
            feedbacks: state.feedbacks.map((f) => f.id === feedbackId ? { ...f, status: 'Reviewed' as FeedbackStatus, updated_at: new Date().toISOString() } : f),
          }));
        }
      } else {
        set((state) => {
          const nextIssues = [newIssue, ...state.issues];
          const nextFeedbacks = state.feedbacks.map((f) => f.id === feedbackId ? { ...f, status: 'Reviewed' as FeedbackStatus, updated_at: new Date().toISOString() } : f);
          persist({ issues: nextIssues, feedbacks: nextFeedbacks });
          return { issues: nextIssues, feedbacks: nextFeedbacks };
        });
      }
    },

    // ----------------------------------------------------
    // ISSUES CRUD
    // ----------------------------------------------------
    addIssue: async (issue) => {
      const codePrefix = issue.type === 'Bug' ? 'BUG' : 'IMP';
      const code = getNextCode(codePrefix, get().issues);
      const newIssue: Issue = {
        ...issue,
        id: isSupabaseConfigured() ? undefined : `i-${Date.now()}` as any,
        code,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const dbIssue = {
          ...newIssue,
          assigned_to: toUuidOrNull(newIssue.assigned_to)
        };
        const { data, error } = await supabase!.from('issues').insert(dbIssue).select();
        if (!error && data) {
          set((state) => ({ issues: [data[0], ...state.issues] }));
        }
      } else {
        set((state) => {
          const next = [newIssue, ...state.issues];
          persist({ issues: next });
          return { issues: next };
        });
      }
    },

    updateIssue: async (id, updates) => {
      const payload = { ...updates, updated_at: new Date().toISOString() };
      if (isSupabaseConfigured()) {
        const dbPayload = {
          ...payload,
          assigned_to: updates.assigned_to !== undefined ? toUuidOrNull(updates.assigned_to) : undefined
        };
        Object.keys(dbPayload).forEach(key => (dbPayload as any)[key] === undefined && delete (dbPayload as any)[key]);
        await supabase!.from('issues').update(dbPayload).eq('id', id);
        set((state) => ({
          issues: state.issues.map((i) => i.id === id ? { ...i, ...payload } : i),
        }));
      } else {
        set((state) => {
          const next = state.issues.map((i) => i.id === id ? { ...i, ...payload } : i);
          persist({ issues: next });
          return { issues: next };
        });
      }
    },

    deleteIssue: async (id) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('issues').delete().eq('id', id);
        set((state) => ({ issues: state.issues.filter((i) => i.id !== id) }));
      } else {
        set((state) => {
          const next = state.issues.filter((i) => i.id !== id);
          persist({ issues: next });
          return { issues: next };
        });
      }
    },

    updateIssueStatus: async (id, status) => {
      const updates = { status, updated_at: new Date().toISOString() };
      if (isSupabaseConfigured()) {
        await supabase!.from('issues').update(updates).eq('id', id);
        set((state) => ({
          issues: state.issues.map((i) => i.id === id ? { ...i, ...updates } : i),
        }));
      } else {
        set((state) => {
          const next = state.issues.map((i) => i.id === id ? { ...i, ...updates } : i);
          persist({ issues: next });
          return { issues: next };
        });
      }
    },

    // ----------------------------------------------------
    // RELEASES CRUD
    // ----------------------------------------------------
    addRelease: async (release) => {
      const newRel: Release = {
        ...release,
        id: isSupabaseConfigured() ? undefined : `r-${Date.now()}` as any,
      };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!.from('releases').insert(newRel).select();
        if (!error && data) {
          set((state) => ({ releases: [data[0], ...state.releases] }));
        }
      } else {
        set((state) => {
          const next = [newRel, ...state.releases];
          persist({ releases: next });
          return { releases: next };
        });
      }
    },

    updateRelease: async (id, updates) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('releases').update(updates).eq('id', id);
        set((state) => ({
          releases: state.releases.map((r) => r.id === id ? { ...r, ...updates } : r),
        }));
      } else {
        set((state) => {
          const next = state.releases.map((r) => r.id === id ? { ...r, ...updates } : r);
          persist({ releases: next });
          return { releases: next };
        });
      }
    },

    deleteRelease: async (id) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('releases').delete().eq('id', id);
        set((state) => ({ releases: state.releases.filter((r) => r.id !== id) }));
      } else {
        set((state) => {
          const next = state.releases.filter((r) => r.id !== id);
          persist({ releases: next });
          return { releases: next };
        });
      }
    },

    addReleaseProject: async (name) => {
      const newProj: ReleaseProject = {
        id: isSupabaseConfigured() ? undefined : `rp-${Date.now()}` as any,
        name,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!.from('release_projects').insert(newProj).select();
        if (error) {
          console.error("Error adding release project in Supabase:", error);
          throw new Error(error.message);
        }
        if (data && data[0]) {
          set((state) => ({ releaseProjects: [...state.releaseProjects, data[0]] }));
          return data[0];
        }
        return null;
      } else {
        newProj.id = `rp-${Date.now()}`;
        let created: ReleaseProject | null = null;
        set((state) => {
          const next = [...state.releaseProjects, newProj];
          persist({ releaseProjects: next });
          created = newProj;
          return { releaseProjects: next };
        });
        return created;
      }
    },

    deleteReleaseProject: async (id) => {
      if (isSupabaseConfigured()) {
        const { error } = await supabase!.from('release_projects').delete().eq('id', id);
        if (error) {
          console.error("Error deleting release project in Supabase:", error);
          throw new Error(error.message);
        }
        set((state) => ({ 
          releaseProjects: state.releaseProjects.filter((rp) => rp.id !== id),
          releases: state.releases.filter((r) => r.project_id !== id)
        }));
      } else {
        set((state) => {
          const nextProjects = state.releaseProjects.filter((rp) => rp.id !== id);
          const nextReleases = state.releases.filter((r) => r.project_id !== id);
          persist({ releaseProjects: nextProjects, releases: nextReleases });
          return { releaseProjects: nextProjects, releases: nextReleases };
        });
      }
    },

    // ----------------------------------------------------
    // TEST SUITES CRUD
    // ----------------------------------------------------
    addTestSuite: async (project_id, name, description) => {
      const newSuite: TestSuite = {
        id: isSupabaseConfigured() ? undefined : `ts-${Date.now()}` as any,
        project_id,
        name,
        description: description || '',
      };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!.from('test_suites').insert(newSuite).select();
        if (error) {
          console.error("Error adding test suite in Supabase:", error);
          throw new Error(error.message);
        }
        if (data && data[0]) {
          set((state) => ({ testSuites: [...state.testSuites, data[0]] }));
          return data[0];
        }
        return null;
      } else {
        const suiteToSave = { ...newSuite, id: `ts-${Date.now()}` };
        set((state) => {
          const next = [...state.testSuites, suiteToSave];
          persist({ testSuites: next });
          return { testSuites: next };
        });
        return suiteToSave;
      }
    },

    updateTestSuite: async (id, name, description) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('test_suites').update({ name, description }).eq('id', id);
        set((state) => ({
          testSuites: state.testSuites.map((ts) => ts.id === id ? { ...ts, name, description: description || '' } : ts),
        }));
      } else {
        set((state) => {
          const next = state.testSuites.map((ts) => ts.id === id ? { ...ts, name, description: description || '' } : ts);
          persist({ testSuites: next });
          return { testSuites: next };
        });
      }
    },

    deleteTestSuite: async (id) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('test_suites').delete().eq('id', id);
        set((state) => ({ testSuites: state.testSuites.filter((ts) => ts.id !== id) }));
      } else {
        set((state) => {
          const next = state.testSuites.filter((ts) => ts.id !== id);
          persist({ testSuites: next });
          return { testSuites: next };
        });
      }
    },

    // ----------------------------------------------------
    // TEST CASES CRUD
    // ----------------------------------------------------
    addTestCase: async (testCase) => {
      const suite = get().testSuites.find((s) => s.id === testCase.suite_id);
      const suiteCode = suite ? suite.name.split(' ')[0].toUpperCase() : 'TC';
      const code = getNextCode(`TC-${suiteCode}`, get().testCases);
      
      const newCase: TestCase = {
        ...testCase,
        id: isSupabaseConfigured() ? undefined : `tc-${Date.now()}` as any,
        code,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const dbCase = {
          ...newCase,
          created_by: toUuidOrNull(newCase.created_by)
        };
        const { data, error } = await supabase!.from('test_cases').insert(dbCase).select();
        if (error) {
          console.error("Error adding test case to Supabase:", error);
          throw new Error(error.message);
        }
        if (data) {
          set((state) => ({ testCases: [...state.testCases, data[0]] }));
        }
      } else {
        set((state) => {
          const next = [...state.testCases, newCase];
          persist({ testCases: next });
          return { testCases: next };
        });
      }
    },

    updateTestCase: async (id, updates) => {
      const payload = { ...updates, updated_at: new Date().toISOString() };
      if (isSupabaseConfigured()) {
        const dbPayload = {
          ...payload,
          created_by: updates.created_by !== undefined ? toUuidOrNull(updates.created_by) : undefined
        };
        Object.keys(dbPayload).forEach(key => (dbPayload as any)[key] === undefined && delete (dbPayload as any)[key]);
        const { error } = await supabase!.from('test_cases').update(dbPayload).eq('id', id);
        if (error) {
          console.error("Error updating test case in Supabase:", error);
          throw new Error(error.message);
        }
        set((state) => ({
          testCases: state.testCases.map((tc) => tc.id === id ? { ...tc, ...payload } : tc),
        }));
      } else {
        set((state) => {
          const next = state.testCases.map((tc) => tc.id === id ? { ...tc, ...payload } : tc);
          persist({ testCases: next });
          return { testCases: next };
        });
      }
    },

    deleteTestCase: async (id) => {
      if (isSupabaseConfigured()) {
        const { error } = await supabase!.from('test_cases').delete().eq('id', id);
        if (error) {
          console.error("Error deleting test case from Supabase:", error);
          throw new Error(error.message);
        }
        set((state) => ({ testCases: state.testCases.filter((tc) => tc.id !== id) }));
      } else {
        set((state) => {
          const next = state.testCases.filter((tc) => tc.id !== id);
          persist({ testCases: next });
          return { testCases: next };
        });
      }
    },

    bulkCloneTestCases: async (ids, targetSuiteId) => {
      const sourceCases = get().testCases.filter((tc) => ids.includes(tc.id));
      const newCases: TestCase[] = sourceCases.map((sc, idx) => {
        const currentList = [...get().testCases, ...newCases];
        const targetSuite = targetSuiteId || sc.suite_id;
        const suite = get().testSuites.find((s) => s.id === targetSuite);
        const suiteCode = suite ? suite.name.split(' ')[0].toUpperCase() : 'TC';
        const code = getNextCode(`TC-${suiteCode}`, currentList);
        return {
          ...sc,
          id: `tc-${Date.now()}-${idx}` as any,
          code,
          title: `${sc.title} (Clone)`,
          suite_id: targetSuiteId || sc.suite_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      if (isSupabaseConfigured()) {
        const writePayload = newCases.map(nc => ({
          ...nc,
          id: undefined,
          created_by: toUuidOrNull(nc.created_by)
        }));
        const { data, error } = await supabase!.from('test_cases').insert(writePayload).select();
        if (error) {
          console.error("Error bulk cloning test cases in Supabase:", error);
          throw new Error(error.message);
        }
        if (data) {
          set((state) => ({ testCases: [...state.testCases, ...data] }));
        }
      } else {
        set((state) => {
          const next = [...state.testCases, ...newCases];
          persist({ testCases: next });
          return { testCases: next };
        });
      }
    },

    bulkMoveTestCases: async (ids, targetSuiteId) => {
      if (isSupabaseConfigured()) {
        const { error } = await supabase!.from('test_cases').update({ suite_id: targetSuiteId, updated_at: new Date().toISOString() }).in('id', ids);
        if (error) {
          console.error("Error bulk moving test cases in Supabase:", error);
          throw new Error(error.message);
        }
        set((state) => ({
          testCases: state.testCases.map((tc) => ids.includes(tc.id) ? { ...tc, suite_id: targetSuiteId, updated_at: new Date().toISOString() } : tc),
        }));
      } else {
        set((state) => {
          const next = state.testCases.map((tc) => ids.includes(tc.id) ? { ...tc, suite_id: targetSuiteId, updated_at: new Date().toISOString() } : tc);
          persist({ testCases: next });
          return { testCases: next };
        });
      }
    },

    bulkDeleteTestCases: async (ids) => {
      if (isSupabaseConfigured()) {
        const { error } = await supabase!.from('test_cases').delete().in('id', ids);
        if (error) {
          console.error("Error bulk deleting test cases from Supabase:", error);
          throw new Error(error.message);
        }
        set((state) => ({ testCases: state.testCases.filter((tc) => !ids.includes(tc.id)) }));
      } else {
        set((state) => {
          const next = state.testCases.filter((tc) => !ids.includes(tc.id));
          persist({ testCases: next });
          return { testCases: next };
        });
      }
    },

    // ----------------------------------------------------
    // TEST RUNS CRUD
    // ----------------------------------------------------
    addTestRun: async (releaseId, title, testType, description) => {
      const runId = isSupabaseConfigured() ? undefined : `tr-${Date.now()}`;
      const newRun: TestRun = {
        id: runId as any,
        release_id: releaseId,
        title,
        description: description || '',
        test_type: testType,
        status: 'Draft',
        created_at: new Date().toISOString(),
      };

      // Load matching test cases
      const matchedCases = get().testCases.filter((tc) => tc.tags.includes(testType));

      if (isSupabaseConfigured()) {
        const { data: runRes, error: runErr } = await supabase!.from('test_runs').insert(newRun).select();
        if (runRes && runRes[0]) {
          const targetRun = runRes[0];
          // Bulk insert results
          if (matchedCases.length > 0) {
            const resultsPayload = matchedCases.map((tc) => ({
              test_run_id: targetRun.id,
              test_case_id: tc.id,
              result: 'Not Run' as TestResultValue,
              executed_at: new Date().toISOString(),
            }));
            const { data: resultsRes } = await supabase!.from('test_run_results').insert(resultsPayload).select();
            set((state) => ({
              testRuns: [targetRun, ...state.testRuns],
              testRunResults: [...state.testRunResults, ...(resultsRes || [])]
            }));
          } else {
            set((state) => ({ testRuns: [targetRun, ...state.testRuns] }));
          }
        }
      } else {
        set((state) => {
          const runToSave = { ...newRun, id: `tr-${Date.now()}` };
          const resultsToSave: TestRunResult[] = matchedCases.map((tc, idx) => ({
            id: `trr-${Date.now()}-${idx}`,
            test_run_id: runToSave.id,
            test_case_id: tc.id,
            result: 'Not Run',
            executed_by: 'user-qa-1',
            executed_at: new Date().toISOString(),
          }));
          const nextRuns = [runToSave, ...state.testRuns];
          const nextResults = [...state.testRunResults, ...resultsToSave];
          persist({ testRuns: nextRuns, testRunResults: nextResults });
          return { testRuns: nextRuns, testRunResults: nextResults };
        });
      }
    },

    updateTestRunStatus: async (id, status) => {
      if (isSupabaseConfigured()) {
        const { error } = await supabase!.from('test_runs').update({ status }).eq('id', id);
        if (error) {
          console.error("Error updating test run status in Supabase:", error);
          throw new Error(error.message);
        }
        set((state) => ({
          testRuns: state.testRuns.map((tr) => tr.id === id ? { ...tr, status } : tr),
        }));
      } else {
        set((state) => {
          const next = state.testRuns.map((tr) => tr.id === id ? { ...tr, status } : tr);
          persist({ testRuns: next });
          return { testRuns: next };
        });
      }
    },

    deleteTestRun: async (id) => {
      if (isSupabaseConfigured()) {
        const { error } = await supabase!.from('test_runs').delete().eq('id', id);
        if (error) {
          console.error("Error deleting test run from Supabase:", error);
          throw new Error(error.message);
        }
        set((state) => ({
          testRuns: state.testRuns.filter((tr) => tr.id !== id),
          testRunResults: state.testRunResults.filter((trr) => trr.test_run_id !== id),
        }));
      } else {
        set((state) => {
          const nextRuns = state.testRuns.filter((tr) => tr.id !== id);
          const nextResults = state.testRunResults.filter((trr) => trr.test_run_id !== id);
          persist({ testRuns: nextRuns, testRunResults: nextResults });
          return { testRuns: nextRuns, testRunResults: nextResults };
        });
      }
    },

    updateTestRunResult: async (runId, caseId, result, actualResult, notes, userId) => {
      const match = get().testRunResults.find((r) => r.test_run_id === runId && r.test_case_id === caseId);
      const payload = {
        result,
        actual_result: actualResult || '',
        notes: notes || '',
        executed_by: toUuidOrNull(userId || 'user-qa-1'),
        executed_at: new Date().toISOString(),
      };
 
      if (isSupabaseConfigured()) {
        if (match) {
          await supabase!.from('test_run_results').update(payload).eq('id', match.id);
          set((state) => ({
            testRunResults: state.testRunResults.map((r) => r.id === match.id ? { ...r, ...payload } : r),
          }));
        } else {
          const insertPayload = { ...payload, test_run_id: runId, test_case_id: caseId };
          const { data } = await supabase!.from('test_run_results').insert(insertPayload).select();
          if (data) {
            set((state) => ({ testRunResults: [...state.testRunResults, data[0]] }));
          }
        }
      } else {
        set((state) => {
          let next;
          if (match) {
            next = state.testRunResults.map((r) => r.id === match.id ? { ...r, ...payload } : r);
          } else {
            const newItem: TestRunResult = {
              id: `trr-${Date.now()}`,
              test_run_id: runId,
              test_case_id: caseId,
              result,
              actual_result: actualResult,
              notes,
              executed_by: userId || 'user-qa-1',
              executed_at: new Date().toISOString(),
            };
            next = [...state.testRunResults, newItem];
          }
          persist({ testRunResults: next });
          return { testRunResults: next };
        });
      }
    },

    resetTestRun: async (runId) => {
      if (isSupabaseConfigured()) {
        const { error: resultsErr } = await supabase!
          .from('test_run_results')
          .update({
            result: 'Not Run',
            actual_result: '',
            notes: '',
            executed_by: null,
            executed_at: new Date().toISOString(),
          })
          .eq('test_run_id', runId);
          
        if (resultsErr) {
          console.error("Error resetting test run results in Supabase:", resultsErr);
          throw new Error(resultsErr.message);
        }

        const { error: runErr } = await supabase!
          .from('test_runs')
          .update({ status: 'Draft' })
          .eq('id', runId);

        if (runErr) {
          console.error("Error updating test run status in Supabase:", runErr);
          throw new Error(runErr.message);
        }

        set((state) => ({
          testRunResults: state.testRunResults.map((r) => 
            r.test_run_id === runId 
              ? { ...r, result: 'Not Run' as TestResultValue, actual_result: '', notes: '', executed_by: null, executed_at: new Date().toISOString() } 
              : r
          ),
          testRuns: state.testRuns.map((tr) => tr.id === runId ? { ...tr, status: 'Draft' as TestRunStatus } : tr),
        }));
      } else {
        set((state) => {
          const nextResults = state.testRunResults.map((r) => 
            r.test_run_id === runId 
              ? { ...r, result: 'Not Run' as TestResultValue, actual_result: '', notes: '', executed_by: null, executed_at: new Date().toISOString() } 
              : r
          );
          const nextRuns = state.testRuns.map((tr) => tr.id === runId ? { ...tr, status: 'Draft' as TestRunStatus } : tr);
          persist({ testRuns: nextRuns, testRunResults: nextResults });
          return { testRuns: nextRuns, testRunResults: nextResults };
        });
      }
    },

    // ----------------------------------------------------
    // COMMENTS CRUD
    // ----------------------------------------------------
    addComment: async (entityType, entityId, userId, content) => {
      const newComment: Comment = {
        id: isSupabaseConfigured() ? undefined : `c-${Date.now()}` as any,
        entity_type: entityType,
        entity_id: entityId,
        user_id: userId,
        content,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const dbComment = {
          ...newComment,
          user_id: toUuidOrNull(newComment.user_id)
        };
        const { data, error } = await supabase!.from('comments').insert(dbComment).select();
        if (!error && data) {
          set((state) => ({ comments: [...state.comments, data[0]] }));
        }
      } else {
        set((state) => {
          const next = [...state.comments, newComment];
          persist({ comments: next });
          return { comments: next };
        });
      }
    },

    // ----------------------------------------------------
    // ACTIVITY LOGS CRUD
    // ----------------------------------------------------
    logActivity: async (userId, action, details) => {
      const newLog: ActivityLog = {
        id: isSupabaseConfigured() ? undefined : `l-${Date.now()}` as any,
        user_id: userId,
        action,
        details,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const dbLog = {
          ...newLog,
          user_id: toUuidOrNull(newLog.user_id)
        };
        await supabase!.from('activity_logs').insert(dbLog);
        // Silent reload of logs
        const { data } = await supabase!.from('activity_logs').select('*').order('created_at', { ascending: false });
        if (data) set({ activityLogs: data });
      } else {
        set((state) => {
          const next = [newLog, ...state.activityLogs];
          persist({ activityLogs: next });
          return { activityLogs: next };
        });
      }
    },

    // ----------------------------------------------------
    // USER FEEDBACKS CRUD
    // ----------------------------------------------------
    addUserFeedback: async (project_id, topic, message, email) => {
      const newUfb: UserFeedback = {
        id: isSupabaseConfigured() ? undefined : `ufb-${Date.now()}` as any,
        project_id,
        topic,
        message,
        email,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase!.from('user_feedbacks').insert(newUfb).select();
          if (error) throw error;
          if (data) {
            set((state) => ({ userFeedbacks: [data[0], ...state.userFeedbacks] }));
          }
        } catch (e) {
          console.warn("Table user_feedbacks write failed, saving to localStorage:", e);
          set((state) => {
            const next = [newUfb, ...state.userFeedbacks];
            persist({ userFeedbacks: next });
            return { userFeedbacks: next };
          });
        }
      } else {
        set((state) => {
          const next = [newUfb, ...state.userFeedbacks];
          persist({ userFeedbacks: next });
          return { userFeedbacks: next };
        });
      }
    },

    deleteUserFeedback: async (id) => {
      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase!.from('user_feedbacks').delete().eq('id', id);
          if (error) throw error;
          set((state) => ({
            userFeedbacks: state.userFeedbacks.filter((ufb) => ufb.id !== id),
          }));
        } catch (e) {
          console.warn("Table user_feedbacks delete failed, deleting from localStorage:", e);
          set((state) => {
            const next = state.userFeedbacks.filter((ufb) => ufb.id !== id);
            persist({ userFeedbacks: next });
            return { userFeedbacks: next };
          });
        }
      } else {
        set((state) => {
          const next = state.userFeedbacks.filter((ufb) => ufb.id !== id);
          persist({ userFeedbacks: next });
          return { userFeedbacks: next };
        });
      }
    },

    // ----------------------------------------------------
    // EXPLORATORY TESTING CRUD ACTIONS
    // ----------------------------------------------------
    addExploratorySession: async (session) => {
      const newSession: ExploratorySession = {
        ...session,
        id: isSupabaseConfigured() ? undefined : `es-${Date.now()}` as any,
        elapsed_seconds: 0,
        status: 'Draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!.from('exploratory_sessions').insert(newSession).select();
        if (!error && data && data[0]) {
          set((state) => ({ exploratorySessions: [data[0], ...state.exploratorySessions] }));
          return data[0];
        }
        console.error("Error inserting exploratory session:", error);
        return null;
      } else {
        const sessionWithId = { ...newSession, id: `es-${Date.now()}` };
        set((state) => {
          const next = [sessionWithId, ...state.exploratorySessions];
          persist({ exploratorySessions: next });
          return { exploratorySessions: next };
        });
        return sessionWithId;
      }
    },

    updateExploratorySession: async (id, updates) => {
      const payload = { ...updates, updated_at: new Date().toISOString() };
      if (isSupabaseConfigured()) {
        await supabase!.from('exploratory_sessions').update(payload).eq('id', id);
        set((state) => ({
          exploratorySessions: state.exploratorySessions.map((s) => s.id === id ? { ...s, ...payload } : s),
        }));
      } else {
        set((state) => {
          const next = state.exploratorySessions.map((s) => s.id === id ? { ...s, ...payload } : s);
          persist({ exploratorySessions: next });
          return { exploratorySessions: next };
        });
      }
    },

    addExploratoryNote: async (sessionId, noteText) => {
      const newNote: ExploratoryNote = {
        id: isSupabaseConfigured() ? undefined : `en-${Date.now()}` as any,
        session_id: sessionId,
        note_text: noteText,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!.from('exploratory_notes').insert(newNote).select();
        if (!error && data && data[0]) {
          set((state) => ({ exploratoryNotes: [...state.exploratoryNotes, data[0]] }));
        } else {
          console.error("Error inserting exploratory note:", error);
        }
      } else {
        const noteWithId = { ...newNote, id: `en-${Date.now()}` };
        set((state) => {
          const next = [...state.exploratoryNotes, noteWithId];
          persist({ exploratoryNotes: next });
          return { exploratoryNotes: next };
        });
      }
    },

    addExploratoryBug: async (bug) => {
      const newBug: ExploratoryBug = {
        ...bug,
        id: isSupabaseConfigured() ? undefined : `eb-${Date.now()}` as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!.from('exploratory_bugs').insert(newBug).select();
        if (!error && data && data[0]) {
          set((state) => ({ exploratoryBugs: [data[0], ...state.exploratoryBugs] }));
        } else {
          console.error("Error inserting exploratory bug:", error);
        }
      } else {
        const bugWithId = { ...newBug, id: `eb-${Date.now()}` };
        set((state) => {
          const next = [bugWithId, ...state.exploratoryBugs];
          persist({ exploratoryBugs: next });
          return { exploratoryBugs: next };
        });
      }
    },

    addExploratoryEvidence: async (evidence) => {
      const newEvidence: ExploratoryEvidence = {
        ...evidence,
        id: isSupabaseConfigured() ? undefined : `ee-${Date.now()}` as any,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!.from('exploratory_evidence').insert(newEvidence).select();
        if (!error && data && data[0]) {
          set((state) => ({ exploratoryEvidence: [data[0], ...state.exploratoryEvidence] }));
        } else {
          console.error("Error inserting exploratory evidence:", error);
        }
      } else {
        const evidenceWithId = { ...newEvidence, id: `ee-${Date.now()}` };
        set((state) => {
          const next = [evidenceWithId, ...state.exploratoryEvidence];
          persist({ exploratoryEvidence: next });
          return { exploratoryEvidence: next };
        });
      }
    },
  };
});
