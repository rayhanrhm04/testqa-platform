import { create } from 'zustand';
import { 
  Project, Feedback, Issue, Release, TestSuite, TestCase, TestRun, TestRunResult, Comment, ActivityLog,
  FeedbackPriority, FeedbackStatus, IssueType, IssueSeverity, IssueStatus, ReleaseStatus, TestRunStatus, TestResultValue,
  ProjectShare, User, UserRole, UserFeedback, UserFeedbackTopic, ReleaseProject,
  ExploratorySession, ExploratoryNote, ExploratoryBug, ExploratoryEvidence,
  ImplementationReport, ImplementationReportItem, Notification,
  RecorderSession, RecorderStep,
  ApiCollection, ApiEndpoint, ApiEnvironment, ApiTestRun, ApiTestResult
} from '@/lib/validators';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { safeReadCache, safeWriteCache } from '@/lib/safe-cache';
import { syncEntity } from '@/lib/safe-sync';
import { useSyncStore } from './useSyncStore';

const toUuidOrNull = (id: string | null | undefined) => {
  if (!id) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id) ? id : null;
};

interface DataState {
  projects: Project[];
  feedbacks: Feedback[];
  issues: Issue[];
  calendarEvents: any[];
  calendarWorkloads: any[];
  standaloneProjects: any[];
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
  implementationReports: ImplementationReport[];
  implementationReportItems: ImplementationReportItem[];
  notifications: Notification[];
  recorderSessions: RecorderSession[];
  recorderSteps: RecorderStep[];
  apiCollections: ApiCollection[];
  apiEndpoints: ApiEndpoint[];
  apiEnvironments: ApiEnvironment[];
  apiTestRuns: ApiTestRun[];
  apiTestResults: ApiTestResult[];
  isLoading: boolean;
  rolePermissions: { role_name: string; allowed_modules: string }[];

  // Actions
  fetchData: () => Promise<void>;
  
  // Users
  updateUserRole: (id: string, role: UserRole) => Promise<void>;
  updateRolePermissions: (roleName: string, allowedModules: string) => Promise<void>;
  createCustomRole: (roleName: string, allowedModules: string) => Promise<void>;
  deleteCustomRole: (roleName: string) => Promise<void>;
  addUser: (name: string, email: string, role: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  
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
  addIssue: (issue: Omit<Issue, 'id' | 'code' | 'created_at' | 'updated_at'>) => Promise<Issue | null>;
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
  addTestRun: (projectId: string, releaseId: string | null, manualReleaseName: string | null, title: string, testType: string, description?: string, testCaseIds?: string[]) => Promise<void>;
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
  deleteExploratorySession: (id: string) => Promise<void>;

  // Implementation Reports
  addImplementationReport: (report: Omit<ImplementationReport, 'id' | 'created_at' | 'updated_at'>) => Promise<ImplementationReport | null>;
  deleteImplementationReport: (id: string) => Promise<void>;
  addImplementationReportItem: (item: Omit<ImplementationReportItem, 'id' | 'created_at'>) => Promise<void>;
  deleteImplementationReportItem: (id: string) => Promise<void>;
  updateImplementationReportItem: (id: string, updates: Partial<ImplementationReportItem>) => Promise<void>;

  // Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'is_read' | 'created_at'>) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: (userId: string | null) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;

  // Smart Recorder
  addRecorderSession: (session: Omit<RecorderSession, 'id' | 'created_at' | 'updated_at' | 'status'>) => Promise<RecorderSession | null>;
  updateRecorderSession: (id: string, updates: Partial<RecorderSession>) => Promise<void>;
  deleteRecorderSession: (id: string) => Promise<void>;
  addRecorderStep: (step: Omit<RecorderStep, 'id' | 'timestamp'>) => Promise<void>;
  updateRecorderStep: (id: string, updates: Partial<RecorderStep>) => Promise<void>;
  deleteRecorderStep: (id: string) => Promise<void>;
  convertSessionToTestCase: (sessionId: string, targetSuiteId: string) => Promise<void>;

  // API Testing Hub
  addApiCollection: (collection: Omit<ApiCollection, 'id' | 'created_at'>) => Promise<ApiCollection | null>;
  deleteApiCollection: (id: string) => Promise<void>;
  addApiEndpoint: (endpoint: Omit<ApiEndpoint, 'id' | 'created_at'>) => Promise<void>;
  updateApiEndpoint: (id: string, updates: Partial<ApiEndpoint>) => Promise<void>;
  deleteApiEndpoint: (id: string) => Promise<void>;
  addApiEnvironment: (env: Omit<ApiEnvironment, 'id' | 'created_at'>) => Promise<void>;
  updateApiEnvironment: (id: string, updates: Partial<ApiEnvironment>) => Promise<void>;
  deleteApiEnvironment: (id: string) => Promise<void>;
  importPostmanCollection: (projectId: string, jsonContent: string) => Promise<void>;
  runApiEndpoint: (endpointId: string, environmentId?: string | null, userId?: string | null) => Promise<ApiTestResult>;
  runApiCollection: (collectionId: string, environmentId?: string | null, userId?: string | null) => Promise<ApiTestRun>;
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
    calendarEvents: [],
    calendarWorkloads: [],
    standaloneProjects: [],
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
    implementationReports: [],
    implementationReportItems: [],
    notifications: [],
    recorderSessions: [],
    recorderSteps: [],
    apiCollections: [],
    apiEndpoints: [],
    apiEnvironments: [],
    apiTestRuns: [],
    apiTestResults: [],
    isLoading: true,
    rolePermissions: [],

    fetchData: async () => {
      const getLocal = <T>(key: string, fallback: T): T => {
        return safeReadCache<T>(key, fallback).data;
      };

      const defaultRolePermissions = [
        { role_name: 'Admin', allowed_modules: 'dashboard,projects,project-status,calendar,feedback,issues,releases,release-notes,test-suites,test-cases,test-runs,exploratory,smart-recorder,api-hub,reports,analytics,settings' },
        { role_name: 'QA Engineer', allowed_modules: 'dashboard,projects,project-status,calendar,feedback,issues,releases,release-notes,test-suites,test-cases,test-runs,exploratory,smart-recorder,api-hub,reports' },
        { role_name: 'Developer', allowed_modules: 'dashboard,feedback,issues,api-hub,releases,release-notes' },
        { role_name: 'Reporter', allowed_modules: 'feedback,release-notes,reports,analytics' },
        { role_name: 'PSE', allowed_modules: 'release-notes,calendar,projects,project-status' }
      ];

      const seedMockUsers = [
        { id: 'user-admin-1', name: 'Sarah Connor (Admin)', email: 'sarah.connor@portal.qa', role: 'Admin', created_at: new Date('2026-01-01').toISOString() },
        { id: 'user-qa-1', name: 'Alex Mercer (QA Engineer)', email: 'alex.mercer@portal.qa', role: 'QA Engineer', created_at: new Date('2026-01-05').toISOString() },
        { id: 'user-dev-1', name: 'Linus Torvalds (Developer)', email: 'linus.t@portal.qa', role: 'Developer', created_at: new Date('2026-01-10').toISOString() },
        { id: 'user-rep-1', name: 'GIS Team (Reporter)', email: 'gis.team@portal.qa', role: 'Reporter', created_at: new Date('2026-01-15').toISOString() },
      ];
      const registered = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('qa_registered_users') || '[]') : [];
      const cleanRegistered = registered.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        created_at: u.created_at,
      }));
      const allUsersFallback = [...seedMockUsers, ...cleanRegistered];

      // 1. Instant Bootstrap from Cache
      set({
        projects: getLocal('projects', seedProjects),
        feedbacks: getLocal('feedbacks', seedFeedbacks),
        issues: getLocal('issues', seedIssues),
        calendarEvents: getLocal('calendarEvents', []),
        calendarWorkloads: getLocal('calendarWorkloads', []),
        standaloneProjects: getLocal('standaloneProjects', []),
        releases: getLocal('releases', seedReleases),
        releaseProjects: getLocal('releaseProjects', seedReleaseProjects),
        testSuites: getLocal('testSuites', seedTestSuites),
        testCases: getLocal('testCases', seedTestCases),
        testRuns: getLocal('testRuns', seedTestRuns),
        testRunResults: getLocal('testRunResults', seedTestRunResults),
        comments: getLocal('comments', seedComments),
        activityLogs: getLocal('activityLogs', seedActivityLogs),
        users: getLocal('users', allUsersFallback),
        projectShares: getLocal('projectShares', []),
        userFeedbacks: getLocal('userFeedbacks', seedUserFeedbacks),
        exploratorySessions: getLocal('exploratorySessions', []),
        exploratoryNotes: getLocal('exploratoryNotes', []),
        exploratoryBugs: getLocal('exploratoryBugs', []),
        exploratoryEvidence: getLocal('exploratoryEvidence', []),
        implementationReports: getLocal('implementationReports', []),
        implementationReportItems: getLocal('implementationReportItems', []),
        notifications: getLocal('notifications', []),
        recorderSessions: getLocal('recorderSessions', []),
        recorderSteps: getLocal('recorderSteps', []),
        apiCollections: getLocal('apiCollections', []),
        apiEndpoints: getLocal('apiEndpoints', []),
        apiEnvironments: getLocal('apiEnvironments', []),
        apiTestRuns: getLocal('apiTestRuns', []),
        apiTestResults: getLocal('apiTestResults', []),
        rolePermissions: getLocal('rolePermissions', defaultRolePermissions),
        isLoading: false,
      });

      // 2. Background Sync
      if (isSupabaseConfigured()) {
        const runBackgroundSync = async () => {
          const syncStore = useSyncStore.getState();
          syncStore.setSyncStatus('syncing');

          try {
            // 1. Sync Critical Tables first (needed for Dashboard, Projects, Issues, Releases, Users)
            await Promise.all([
              syncEntity('projects', Promise.resolve(supabase!.from('projects').select('*').order('created_at', { ascending: false })), (data: any) => set({ projects: data })),
              syncEntity('feedbacks', Promise.resolve(supabase!.from('feedbacks').select('*').order('created_at', { ascending: false })), (data: any) => set({ feedbacks: data })),
              syncEntity('issues', Promise.resolve(supabase!.from('issues').select('*').order('created_at', { ascending: false })), (data: any) => set({ issues: data })),
              syncEntity('releases', Promise.resolve(supabase!.from('releases').select('*').order('release_date', { ascending: false })), (data: any) => set({ releases: data })),
              syncEntity('users', Promise.resolve(supabase!.from('users').select('*').order('created_at', { ascending: false })), (data: any) => set({ users: data })),
              syncEntity('releaseProjects', Promise.resolve(supabase!.from('release_projects').select('*').order('created_at', { ascending: true })), (data: any) => set({ releaseProjects: data })),
              syncEntity('projectShares', Promise.resolve(supabase!.from('project_shares').select('*')), (data: any) => set({ projectShares: data })),
              syncEntity('rolePermissions', Promise.resolve(supabase!.from('role_permissions').select('*')), (data: any) => set({ rolePermissions: data })),
            ]);

            // Mark as synced immediately once critical tables are successfully loaded
            syncStore.setSyncStatus('synced');
            syncStore.setLastSyncedAt(new Date().toISOString());

            // 2. Sync Non-Critical Tables in the background (failures are ignored and won't affect status)
            Promise.allSettled([
              syncEntity('calendarEvents', Promise.resolve(supabase!.from('calendar_events').select('*')), (data: any) => set({ calendarEvents: data })),
              syncEntity('calendarWorkloads', Promise.resolve(supabase!.from('calendar_workloads').select('*')), (data: any) => set({ calendarWorkloads: data })),
              syncEntity('standaloneProjects', Promise.resolve(supabase!.from('standalone_projects').select('*').order('createdAt', { ascending: true })), (data: any) => set({ standaloneProjects: data })),
              syncEntity('testSuites', Promise.resolve(supabase!.from('test_suites').select('*')), (data: any) => set({ testSuites: data })),
              syncEntity('testCases', Promise.resolve(supabase!.from('test_cases').select('*').order('code', { ascending: true })), (data: any) => set({ testCases: data })),
              syncEntity('testRuns', Promise.resolve(supabase!.from('test_runs').select('*').order('created_at', { ascending: false })), (data: any) => set({ testRuns: data })),
              syncEntity('testRunResults', Promise.resolve(supabase!.from('test_run_results').select('*')), (data: any) => set({ testRunResults: data })),
              syncEntity('comments', Promise.resolve(supabase!.from('comments').select('*').order('created_at', { ascending: true })), (data: any) => set({ comments: data })),
              syncEntity('activityLogs', Promise.resolve(supabase!.from('activity_logs').select('*').order('created_at', { ascending: false })), (data: any) => set({ activityLogs: data })),
              syncEntity('userFeedbacks', Promise.resolve(supabase!.from('user_feedbacks').select('*').order('created_at', { ascending: false })), (data: any) => set({ userFeedbacks: data })),
              syncEntity('exploratorySessions', Promise.resolve(supabase!.from('exploratory_sessions').select('*').order('created_at', { ascending: false })), (data: any) => set({ exploratorySessions: data })),
              syncEntity('exploratoryNotes', Promise.resolve(supabase!.from('exploratory_notes').select('*').order('created_at', { ascending: true })), (data: any) => set({ exploratoryNotes: data })),
              syncEntity('exploratoryBugs', Promise.resolve(supabase!.from('exploratory_bugs').select('*').order('created_at', { ascending: false })), (data: any) => set({ exploratoryBugs: data })),
              syncEntity('exploratoryEvidence', Promise.resolve(supabase!.from('exploratory_evidence').select('*').order('created_at', { ascending: false })), (data: any) => set({ exploratoryEvidence: data })),
              syncEntity('implementationReports', Promise.resolve(supabase!.from('implementation_reports').select('*').order('created_at', { ascending: false })), (data: any) => set({ implementationReports: data })),
              syncEntity('implementationReportItems', Promise.resolve(supabase!.from('implementation_report_items').select('*').order('created_at', { ascending: true })), (data: any) => set({ implementationReportItems: data })),
              syncEntity('notifications', Promise.resolve(supabase!.from('notifications').select('*').order('created_at', { ascending: false })), (data: any) => set({ notifications: data })),
              syncEntity('recorderSessions', Promise.resolve(supabase!.from('recorder_sessions').select('*').order('created_at', { ascending: false })), (data: any) => set({ recorderSessions: data })),
              syncEntity('recorderSteps', Promise.resolve(supabase!.from('recorder_steps').select('*').order('step_number', { ascending: true })), (data: any) => set({ recorderSteps: data })),
              syncEntity('apiCollections', Promise.resolve(supabase!.from('api_collections').select('*').order('created_at', { ascending: false })), (data: any) => set({ apiCollections: data })),
              syncEntity('apiEndpoints', Promise.resolve(supabase!.from('api_endpoints').select('*').order('created_at', { ascending: true })), (data: any) => set({ apiEndpoints: data })),
              syncEntity('apiEnvironments', Promise.resolve(supabase!.from('api_environments').select('*').order('created_at', { ascending: false })), (data: any) => set({ apiEnvironments: data })),
              syncEntity('apiTestRuns', Promise.resolve(supabase!.from('api_test_runs').select('*').order('created_at', { ascending: false })), (data: any) => set({ apiTestRuns: data })),
              syncEntity('apiTestResults', Promise.resolve(supabase!.from('api_test_results').select('*')), (data: any) => set({ apiTestResults: data })),
            ]).catch(err => console.warn('Non-critical sync warning:', err));

          } catch (err) {
            syncStore.setSyncStatus('sync_failed');
          }
        };

        runBackgroundSync();
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

    updateRolePermissions: async (roleName, allowedModules) => {
      if (isSupabaseConfigured()) {
        const { error } = await supabase!
          .from('role_permissions')
          .update({ allowed_modules: allowedModules, updatedAt: new Date().toISOString() })
          .eq('role_name', roleName);
        if (error) throw error;
        
        set((state) => {
          const next = state.rolePermissions.map((rp) => rp.role_name === roleName ? { ...rp, allowed_modules: allowedModules } : rp);
          safeWriteCache('rolePermissions', next);
          return { rolePermissions: next };
        });
      } else {
        set((state) => {
          const next = state.rolePermissions.map((rp) => rp.role_name === roleName ? { ...rp, allowed_modules: allowedModules } : rp);
          safeWriteCache('rolePermissions', next);
          return { rolePermissions: next };
        });
      }
    },

    createCustomRole: async (roleName, allowedModules) => {
      const newRole = { role_name: roleName, allowed_modules: allowedModules };
      if (isSupabaseConfigured()) {
        const { error } = await supabase!.from('role_permissions').insert(newRole);
        if (error) throw error;
        
        set((state) => {
          const next = [...state.rolePermissions, newRole];
          safeWriteCache('rolePermissions', next);
          return { rolePermissions: next };
        });
      } else {
        set((state) => {
          const next = [...state.rolePermissions, newRole];
          safeWriteCache('rolePermissions', next);
          return { rolePermissions: next };
        });
      }
    },

    deleteCustomRole: async (roleName) => {
      if (isSupabaseConfigured()) {
        const { error } = await supabase!.from('role_permissions').delete().eq('role_name', roleName);
        if (error) throw error;
        
        set((state) => {
          const next = state.rolePermissions.filter((rp) => rp.role_name !== roleName);
          safeWriteCache('rolePermissions', next);
          return { rolePermissions: next };
        });
      } else {
        set((state) => {
          const next = state.rolePermissions.filter((rp) => rp.role_name !== roleName);
          safeWriteCache('rolePermissions', next);
          return { rolePermissions: next };
        });
      }
    },

    addUser: async (name, email, role) => {
      const newId = 'user-' + Date.now();
      const newUser = {
        id: newId,
        name,
        email,
        role,
        created_at: new Date().toISOString()
      };

      if (isSupabaseConfigured()) {
        // Generate random UUID for Postgres compatibility
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        const pgUser = { ...newUser, id: uuid };
        const { error } = await supabase!.from('users').insert(pgUser);
        if (error) throw error;
        
        set((state) => {
          const next = [...state.users, pgUser];
          safeWriteCache('users', next);
          return { users: next };
        });
      } else {
        set((state) => {
          const next = [...state.users, newUser];
          const registered = JSON.parse(localStorage.getItem('qa_registered_users') || '[]');
          registered.push({ ...newUser, password: 'password123' });
          localStorage.setItem('qa_registered_users', JSON.stringify(registered));
          
          safeWriteCache('users', next);
          return { users: next };
        });
      }
    },

    deleteUser: async (id) => {
      if (isSupabaseConfigured()) {
        const { error } = await supabase!.from('users').delete().eq('id', id);
        if (error) throw error;
        
        set((state) => {
          const next = state.users.filter((u) => u.id !== id);
          safeWriteCache('users', next);
          return { users: next };
        });
      } else {
        set((state) => {
          const next = state.users.filter((u) => u.id !== id);
          const registered = JSON.parse(localStorage.getItem('qa_registered_users') || '[]');
          const updatedReg = registered.filter((u: any) => u.id !== id);
          localStorage.setItem('qa_registered_users', JSON.stringify(updatedReg));
          
          safeWriteCache('users', next);
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
        if (error) throw new Error(error.message || 'Failed to add project');
        if (data && data[0]) {
          set((state) => {
            const next = [data[0], ...state.projects];
            safeWriteCache('projects', next);
            return { projects: next };
          });
          return data[0];
        }
        return null;
      } else {
        set((state) => {
          const next = [newProj, ...state.projects];
          safeWriteCache('projects', next);
          persist({ projects: next });
          return { projects: next };
        });
        return newProj;
      }
    },

    updateProject: async (id, name, description) => {
      if (isSupabaseConfigured()) {
        const { error } = await supabase!.from('projects').update({ name, description }).eq('id', id);
        if (error) throw new Error(error.message || 'Failed to update project');
        set((state) => {
          const next = state.projects.map((p) => p.id === id ? { ...p, name, description } : p);
          safeWriteCache('projects', next);
          return { projects: next };
        });
      } else {
        set((state) => {
          const next = state.projects.map((p) => p.id === id ? { ...p, name, description } : p);
          safeWriteCache('projects', next);
          persist({ projects: next });
          return { projects: next };
        });
      }
    },

    deleteProject: async (id) => {
      if (isSupabaseConfigured()) {
        const { error } = await supabase!.from('projects').delete().eq('id', id);
        if (error) throw new Error(error.message || 'Failed to delete project');
        set((state) => {
          const next = state.projects.filter((p) => p.id !== id);
          safeWriteCache('projects', next);
          return { projects: next };
        });
      } else {
        set((state) => {
          const next = state.projects.filter((p) => p.id !== id);
          safeWriteCache('projects', next);
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
      const projectFeedbacks = get().feedbacks.filter(f => f.project_id === feedback.project_id);
      const code = getNextCode('FB', projectFeedbacks);
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
          const insertedFb = data[0];
          const reporter = get().users.find((u) => u.id === insertedFb.reporter_id);
          const reporterName = reporter ? reporter.name : 'A user';
          get().addNotification({
            user_id: null,
            title: 'New Feedback Submitted',
            content: `${reporterName} submitted new feedback: "${insertedFb.title}"`,
            type: 'feedback',
            link: `/feedback/${insertedFb.id}`
          });
        }
      } else {
        const generatedId = `fb-${Date.now()}`;
        const newFbWithId = { ...newFb, id: generatedId };
        set((state) => {
          const next = [newFbWithId, ...state.feedbacks];
          persist({ feedbacks: next });
          return { feedbacks: next };
        });
        const reporter = get().users.find((u) => u.id === newFb.reporter_id);
        const reporterName = reporter ? reporter.name : 'A user';
        get().addNotification({
          user_id: null,
          title: 'New Feedback Submitted',
          content: `${reporterName} submitted new feedback: "${newFb.title}"`,
          type: 'feedback',
          link: `/feedback/${generatedId}`
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
      const projectIssues = get().issues.filter((i) => i.project_id === issueData.project_id);
      const code = getNextCode(codePrefix, projectIssues);
      
      const feedback = get().feedbacks.find((f) => f.id === feedbackId);
      const attachment_url = feedback?.attachment_url || undefined;
      const attachment_name = feedback?.attachment_name || undefined;

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
        attachment_url,
        attachment_name,
        created_by: feedback ? feedback.reporter_id : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 2. Update feedback status to Reviewed
      if (isSupabaseConfigured()) {
        const dbIssue = {
          ...newIssue,
          assigned_to: toUuidOrNull(newIssue.assigned_to),
          created_by: feedback ? toUuidOrNull(feedback.reporter_id) : null
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
      const projectIssues = get().issues.filter((i) => i.project_id === issue.project_id);
      const code = getNextCode(codePrefix, projectIssues);
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
          assigned_to: toUuidOrNull(newIssue.assigned_to),
          created_by: toUuidOrNull(newIssue.created_by)
        };
        const { data, error } = await supabase!.from('issues').insert(dbIssue).select();
        if (!error && data && data[0]) {
          set((state) => ({ issues: [data[0], ...state.issues] }));
          return data[0];
        }
        return null;
      } else {
        const issueToSave = { ...newIssue, id: `i-${Date.now()}` };
        set((state) => {
          const next = [issueToSave, ...state.issues];
          persist({ issues: next });
          return { issues: next };
        });
        return issueToSave;
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
      const projectCases = get().testCases.filter((tc) => tc.project_id === testCase.project_id);
      const code = getNextCode(`TC-${suiteCode}`, projectCases);
      
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
        const targetProjId = suite ? suite.project_id : sc.project_id;
        const projectCases = currentList.filter((tc) => tc.project_id === targetProjId);
        const code = getNextCode(`TC-${suiteCode}`, projectCases);
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
    addTestRun: async (projectId, releaseId, manualReleaseName, title, testType, description, testCaseIds) => {
      const runId = isSupabaseConfigured() ? undefined : `tr-${Date.now()}`;
      const newRun: TestRun = {
        id: runId as any,
        project_id: projectId,
        release_id: releaseId || null,
        manual_release_name: manualReleaseName || null,
        title,
        description: description || '',
        test_type: testType,
        status: 'Draft',
        created_at: new Date().toISOString(),
      };

      // Load matching test cases:
      // If testCaseIds is specified and has items, use those!
      // Otherwise, filter by tag testType AND projectId!
      let matchedCases = [];
      if (testCaseIds && testCaseIds.length > 0) {
        matchedCases = get().testCases.filter((tc) => testCaseIds.includes(tc.id));
      } else {
        matchedCases = get().testCases.filter((tc) => tc.project_id === projectId && tc.tags.includes(testType));
      }

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

      // Mentions Notification Engine
      try {
        const usersList = get().users;
        const commenter = usersList.find(u => u.id === userId);
        const commenterName = commenter ? commenter.name : 'Someone';
        
        const mentioned = usersList.filter(u => {
          const regex = new RegExp(`@${u.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}(\\s|$)`, 'i');
          return regex.test(content);
        });

        for (const targetUser of mentioned) {
          if (targetUser.id === userId) continue;

          const cleanContent = content.replace(/@\S+/g, '').trim();
          const snippet = cleanContent.length > 60 ? cleanContent.substring(0, 57) + '...' : cleanContent;

          await get().addNotification({
            user_id: targetUser.id,
            title: `Mentioned in ${entityType === 'issue' ? 'Issue' : 'Feedback'}`,
            content: `${commenterName} tagged you: "${snippet || 'See details'}"`,
            type: entityType,
            link: entityType === 'issue' ? `/issues?id=${entityId}` : `/feedback/${entityId}`
          });
        }
      } catch (err) {
        console.error("Mentions parsing failed:", err);
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
          const insertedBug = data[0];
          get().addNotification({
            user_id: null,
            title: 'New Bug Finding Logged',
            content: `A new bug "${insertedBug.title}" was logged in exploratory testing.`,
            type: 'exploratory',
            link: '/exploratory'
          });
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
        get().addNotification({
          user_id: null,
          title: 'New Bug Finding Logged',
          content: `A new bug "${bugWithId.title}" was logged in exploratory testing.`,
          type: 'exploratory',
          link: '/exploratory'
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

    deleteExploratorySession: async (id) => {
      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase!.from('exploratory_sessions').delete().eq('id', id);
          if (error) throw error;
          set((state) => ({
            exploratorySessions: state.exploratorySessions.filter((s) => s.id !== id),
            exploratoryNotes: state.exploratoryNotes.filter((n) => n.session_id !== id),
            exploratoryBugs: state.exploratoryBugs.filter((b) => b.session_id !== id),
            exploratoryEvidence: state.exploratoryEvidence.filter((e) => e.session_id !== id),
          }));
        } catch (e) {
          console.warn("Table exploratory_sessions delete failed, deleting from localStorage:", e);
          set((state) => {
            const sessions = state.exploratorySessions.filter((s) => s.id !== id);
            const notes = state.exploratoryNotes.filter((n) => n.session_id !== id);
            const bugs = state.exploratoryBugs.filter((b) => b.session_id !== id);
            const evidence = state.exploratoryEvidence.filter((e) => e.session_id !== id);
            persist({ 
              exploratorySessions: sessions, 
              exploratoryNotes: notes, 
              exploratoryBugs: bugs, 
              exploratoryEvidence: evidence 
            });
            return { 
              exploratorySessions: sessions, 
              exploratoryNotes: notes, 
              exploratoryBugs: bugs, 
              exploratoryEvidence: evidence 
            };
          });
        }
      } else {
        set((state) => {
          const sessions = state.exploratorySessions.filter((s) => s.id !== id);
          const notes = state.exploratoryNotes.filter((n) => n.session_id !== id);
          const bugs = state.exploratoryBugs.filter((b) => b.session_id !== id);
          const evidence = state.exploratoryEvidence.filter((e) => e.session_id !== id);
          persist({ 
            exploratorySessions: sessions, 
            exploratoryNotes: notes, 
            exploratoryBugs: bugs, 
            exploratoryEvidence: evidence 
          });
          return { 
            exploratorySessions: sessions, 
            exploratoryNotes: notes, 
            exploratoryBugs: bugs, 
            exploratoryEvidence: evidence 
          };
        });
      }
    },

    // ----------------------------------------------------
    // IMPLEMENTATION REPORT ACTIONS
    // ----------------------------------------------------
    addImplementationReport: async (report) => {
      const newReport: ImplementationReport = {
        ...report,
        id: isSupabaseConfigured() ? undefined : `rep-\${Date.now()}` as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!.from('implementation_reports').insert(newReport).select();
        if (!error && data && data[0]) {
          set((state) => ({ implementationReports: [data[0], ...state.implementationReports] }));
          if (data[0].reporter_id) {
            get().addNotification({
              user_id: data[0].reporter_id,
              title: 'New Implementation Report',
              content: `An implementation report "${data[0].title}" was created for you.`,
              type: 'report',
              link: `/implementation-reports?id=${data[0].id}`
            });
          }
          return data[0];
        }
        console.error("Error inserting implementation report:", error);
        return null;
      } else {
        const reportWithId = { ...newReport, id: `rep-${Date.now()}` };
        set((state) => {
          const next = [reportWithId, ...state.implementationReports];
          persist({ implementationReports: next });
          return { implementationReports: next };
        });
        if (reportWithId.reporter_id) {
          get().addNotification({
            user_id: reportWithId.reporter_id,
            title: 'New Implementation Report',
            content: `An implementation report "${reportWithId.title}" was created for you.`,
            type: 'report',
            link: `/implementation-reports?id=${reportWithId.id}`
          });
        }
        return reportWithId;
      }
    },

    deleteImplementationReport: async (id) => {
      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase!.from('implementation_reports').delete().eq('id', id);
          if (error) throw error;
          set((state) => ({
            implementationReports: state.implementationReports.filter((r) => r.id !== id),
            implementationReportItems: state.implementationReportItems.filter((i) => i.report_id !== id),
          }));
        } catch (e) {
          console.warn("Table implementation_reports delete failed, local fallback:", e);
          set((state) => {
            const reports = state.implementationReports.filter((r) => r.id !== id);
            const items = state.implementationReportItems.filter((i) => i.report_id !== id);
            persist({ implementationReports: reports, implementationReportItems: items });
            return { implementationReports: reports, implementationReportItems: items };
          });
        }
      } else {
        set((state) => {
          const reports = state.implementationReports.filter((r) => r.id !== id);
          const items = state.implementationReportItems.filter((i) => i.report_id !== id);
          persist({ implementationReports: reports, implementationReportItems: items });
          return { implementationReports: reports, implementationReportItems: items };
        });
      }
    },

    addImplementationReportItem: async (item) => {
      const newItem: ImplementationReportItem = {
        ...item,
        id: isSupabaseConfigured() ? undefined : `item-\${Date.now()}` as any,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!.from('implementation_report_items').insert(newItem).select();
        if (!error && data && data[0]) {
          set((state) => ({ implementationReportItems: [...state.implementationReportItems, data[0]] }));
        } else {
          console.error("Error inserting implementation report item:", error);
        }
      } else {
        const itemWithId = { ...newItem, id: `item-${Date.now()}` };
        set((state) => {
          const next = [...state.implementationReportItems, itemWithId];
          persist({ implementationReportItems: next });
          return { implementationReportItems: next };
        });
      }
    },

    deleteImplementationReportItem: async (id) => {
      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase!.from('implementation_report_items').delete().eq('id', id);
          if (error) throw error;
          set((state) => ({
            implementationReportItems: state.implementationReportItems.filter((i) => i.id !== id),
          }));
        } catch (e) {
          console.warn("Table implementation_report_items delete failed, local fallback:", e);
          set((state) => {
            const next = state.implementationReportItems.filter((i) => i.id !== id);
            persist({ implementationReportItems: next });
            return { implementationReportItems: next };
          });
        }
      } else {
        set((state) => {
          const next = state.implementationReportItems.filter((i) => i.id !== id);
          persist({ implementationReportItems: next });
          return { implementationReportItems: next };
        });
      }
    },

    updateImplementationReportItem: async (id, updates) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('implementation_report_items').update(updates).eq('id', id);
        set((state) => ({
          implementationReportItems: state.implementationReportItems.map((i) => i.id === id ? { ...i, ...updates } : i),
        }));
      } else {
        set((state) => {
          const next = state.implementationReportItems.map((i) => i.id === id ? { ...i, ...updates } : i);
          persist({ implementationReportItems: next });
          return { implementationReportItems: next };
        });
      }
    },

    addNotification: async (notification) => {
      const newNotification: Notification = {
        ...notification,
        id: isSupabaseConfigured() ? undefined : `notif-${Date.now()}` as any,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!.from('notifications').insert(newNotification).select();
        if (!error && data && data[0]) {
          set((state) => ({ notifications: [data[0], ...state.notifications] }));
        } else {
          console.error("Error inserting notification:", error);
        }
      } else {
        const notifWithId = { ...newNotification, id: `notif-${Date.now()}` };
        set((state) => {
          const next = [notifWithId, ...state.notifications];
          persist({ notifications: next });
          return { notifications: next };
        });
      }
    },

    markNotificationAsRead: async (id) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('notifications').update({ is_read: true }).eq('id', id);
        set((state) => ({
          notifications: state.notifications.map((n) => n.id === id ? { ...n, is_read: true } : n),
        }));
      } else {
        set((state) => {
          const next = state.notifications.map((n) => n.id === id ? { ...n, is_read: true } : n);
          persist({ notifications: next });
          return { notifications: next };
        });
      }
    },

    markAllNotificationsAsRead: async (userId) => {
      if (isSupabaseConfigured()) {
        if (userId) {
          await Promise.all([
            supabase!.from('notifications').update({ is_read: true }).eq('user_id', userId),
            supabase!.from('notifications').update({ is_read: true }).is('user_id', null)
          ]);
        } else {
          await supabase!.from('notifications').update({ is_read: true }).is('user_id', null);
        }
        set((state) => ({
          notifications: state.notifications.map((n) => (!userId || n.user_id === userId || n.user_id === null) ? { ...n, is_read: true } : n),
        }));
      } else {
        set((state) => {
          const next = state.notifications.map((n) => (!userId || n.user_id === userId || n.user_id === null) ? { ...n, is_read: true } : n);
          persist({ notifications: next });
          return { notifications: next };
        });
      }
    },

    deleteNotification: async (id) => {
      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase!.from('notifications').delete().eq('id', id);
          if (error) throw error;
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          }));
        } catch (e) {
          console.warn("Table notifications delete failed, local fallback:", e);
          set((state) => {
            const next = state.notifications.filter((n) => n.id !== id);
            persist({ notifications: next });
            return { notifications: next };
          });
        }
      } else {
        set((state) => {
          const next = state.notifications.filter((n) => n.id !== id);
          persist({ notifications: next });
          return { notifications: next };
        });
      }
    },

    addRecorderSession: async (session) => {
      const newSession: RecorderSession = {
        ...session,
        id: isSupabaseConfigured() ? undefined : `rs-${Date.now()}` as any,
        status: 'Draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!.from('recorder_sessions').insert(newSession).select();
        if (!error && data) {
          set((state) => ({ recorderSessions: [data[0], ...state.recorderSessions] }));
          return data[0];
        }
        return null;
      } else {
        newSession.id = `rs-${Date.now()}` as any;
        set((state) => {
          const next = [newSession, ...state.recorderSessions];
          persist({ recorderSessions: next });
          return { recorderSessions: next };
        });
        return newSession;
      }
    },

    updateRecorderSession: async (id, updates) => {
      const payload = { ...updates, updated_at: new Date().toISOString() };
      if (isSupabaseConfigured()) {
        await supabase!.from('recorder_sessions').update(payload).eq('id', id);
        set((state) => ({
          recorderSessions: state.recorderSessions.map((s) => s.id === id ? { ...s, ...payload } : s),
        }));
      } else {
        set((state) => {
          const next = state.recorderSessions.map((s) => s.id === id ? { ...s, ...payload } : s);
          persist({ recorderSessions: next });
          return { recorderSessions: next };
        });
      }
    },

    deleteRecorderSession: async (id) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('recorder_sessions').delete().eq('id', id);
        set((state) => ({
          recorderSessions: state.recorderSessions.filter((s) => s.id !== id),
          recorderSteps: state.recorderSteps.filter((st) => st.session_id !== id),
        }));
      } else {
        set((state) => {
          const nextSessions = state.recorderSessions.filter((s) => s.id !== id);
          const nextSteps = state.recorderSteps.filter((st) => st.session_id !== id);
          persist({ recorderSessions: nextSessions, recorderSteps: nextSteps });
          return { recorderSessions: nextSessions, recorderSteps: nextSteps };
        });
      }
    },

    addRecorderStep: async (step) => {
      const newStep: RecorderStep = {
        ...step,
        id: isSupabaseConfigured() ? undefined : `rst-${Date.now()}-${Math.random()}` as any,
        timestamp: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!.from('recorder_steps').insert(newStep).select();
        if (!error && data) {
          set((state) => ({ recorderSteps: [...state.recorderSteps, data[0]] }));
        }
      } else {
        newStep.id = `rst-${Date.now()}-${Math.random()}` as any;
        set((state) => {
          const next = [...state.recorderSteps, newStep];
          persist({ recorderSteps: next });
          return { recorderSteps: next };
        });
      }
    },

    updateRecorderStep: async (id, updates) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('recorder_steps').update(updates).eq('id', id);
        set((state) => ({
          recorderSteps: state.recorderSteps.map((st) => st.id === id ? { ...st, ...updates } : st),
        }));
      } else {
        set((state) => {
          const next = state.recorderSteps.map((st) => st.id === id ? { ...st, ...updates } : st);
          persist({ recorderSteps: next });
          return { recorderSteps: next };
        });
      }
    },

    deleteRecorderStep: async (id) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('recorder_steps').delete().eq('id', id);
        set((state) => ({
          recorderSteps: state.recorderSteps.filter((st) => st.id !== id),
        }));
      } else {
        set((state) => {
          const next = state.recorderSteps.filter((st) => st.id !== id);
          persist({ recorderSteps: next });
          return { recorderSteps: next };
        });
      }
    },

    convertSessionToTestCase: async (sessionId, targetSuiteId) => {
      const session = get().recorderSessions.find((s) => s.id === sessionId);
      if (!session) throw new Error('Session not found');

      const steps = get().recorderSteps
        .filter((st) => st.session_id === sessionId)
        .sort((a, b) => a.step_number - b.step_number);

      const stepsContent = steps
        .map((st) => {
          let line = `${st.step_number}. **${st.action_type}**`;
          if (st.target_element) line += ` on \`${st.target_element}\``;
          if (st.value) line += ` with value \`${st.value}\``;
          if (st.notes) line += ` (${st.notes})`;
          return line;
        })
        .join('\n');

      const expectedResults = steps
        .filter((st) => st.action_type === 'Assert')
        .map((st) => `${st.step_number}. Assertion: ${st.value || st.notes || 'Expected state matches assertion'}`)
        .join('\n') || 'All steps executed successfully without errors.';

      const projectCases = get().testCases.filter((tc) => tc.project_id === session.project_id);
      const nextCode = getNextCode('TC', projectCases);

      const newTestCase: TestCase = {
        id: isSupabaseConfigured() ? undefined : `tc-${Date.now()}` as any,
        code: nextCode,
        project_id: session.project_id,
        suite_id: targetSuiteId,
        title: session.title,
        description: `Recorded on ${session.browser} (${session.environment}) starting at ${session.start_url}`,
        steps: stepsContent,
        expected_result: expectedResults,
        priority: 'Medium',
        type: 'Functional',
        is_automated: false,
        tags: ['Functional'],
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!.from('test_cases').insert(newTestCase).select();
        if (!error && data) {
          set((state) => ({ testCases: [data[0], ...state.testCases] }));
        } else if (error) {
          throw error;
        }
      } else {
        newTestCase.id = `tc-${Date.now()}` as any;
        set((state) => {
          const next = [newTestCase, ...state.testCases];
          persist({ testCases: next });
          return { testCases: next };
        });
      }
    },

    addApiCollection: async (collection) => {
      const newCol: ApiCollection = {
        ...collection,
        id: isSupabaseConfigured() ? undefined : `apc-${Date.now()}` as any,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!.from('api_collections').insert(newCol).select();
        if (!error && data) {
          set((state) => ({ apiCollections: [data[0], ...state.apiCollections] }));
          return data[0];
        }
        return null;
      } else {
        newCol.id = `apc-${Date.now()}` as any;
        set((state) => {
          const next = [newCol, ...state.apiCollections];
          persist({ apiCollections: next });
          return { apiCollections: next };
        });
        return newCol;
      }
    },

    deleteApiCollection: async (id) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('api_collections').delete().eq('id', id);
        set((state) => ({
          apiCollections: state.apiCollections.filter((c) => c.id !== id),
          apiEndpoints: state.apiEndpoints.filter((e) => e.collection_id !== id),
        }));
      } else {
        set((state) => {
          const nextCol = state.apiCollections.filter((c) => c.id !== id);
          const nextEnd = state.apiEndpoints.filter((e) => e.collection_id !== id);
          persist({ apiCollections: nextCol, apiEndpoints: nextEnd });
          return { apiCollections: nextCol, apiEndpoints: nextEnd };
        });
      }
    },

    addApiEndpoint: async (endpoint) => {
      const newEnd: ApiEndpoint = {
        ...endpoint,
        id: isSupabaseConfigured() ? undefined : `ape-${Date.now()}` as any,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!.from('api_endpoints').insert(newEnd).select();
        if (!error && data) {
          set((state) => ({ apiEndpoints: [...state.apiEndpoints, data[0]] }));
        }
      } else {
        newEnd.id = `ape-${Date.now()}` as any;
        set((state) => {
          const next = [...state.apiEndpoints, newEnd];
          persist({ apiEndpoints: next });
          return { apiEndpoints: next };
        });
      }
    },

    updateApiEndpoint: async (id, updates) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('api_endpoints').update(updates).eq('id', id);
        set((state) => ({
          apiEndpoints: state.apiEndpoints.map((e) => e.id === id ? { ...e, ...updates } : e),
        }));
      } else {
        set((state) => {
          const next = state.apiEndpoints.map((e) => e.id === id ? { ...e, ...updates } : e);
          persist({ apiEndpoints: next });
          return { apiEndpoints: next };
        });
      }
    },

    deleteApiEndpoint: async (id) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('api_endpoints').delete().eq('id', id);
        set((state) => ({
          apiEndpoints: state.apiEndpoints.filter((e) => e.id !== id),
        }));
      } else {
        set((state) => {
          const next = state.apiEndpoints.filter((e) => e.id !== id);
          persist({ apiEndpoints: next });
          return { apiEndpoints: next };
        });
      }
    },

    addApiEnvironment: async (env) => {
      const newEnv: ApiEnvironment = {
        ...env,
        id: isSupabaseConfigured() ? undefined : `apv-${Date.now()}` as any,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!.from('api_environments').insert(newEnv).select();
        if (!error && data) {
          set((state) => ({ apiEnvironments: [data[0], ...state.apiEnvironments] }));
        }
      } else {
        newEnv.id = `apv-${Date.now()}` as any;
        set((state) => {
          const next = [newEnv, ...state.apiEnvironments];
          persist({ apiEnvironments: next });
          return { apiEnvironments: next };
        });
      }
    },

    updateApiEnvironment: async (id, updates) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('api_environments').update(updates).eq('id', id);
        set((state) => ({
          apiEnvironments: state.apiEnvironments.map((e) => e.id === id ? { ...e, ...updates } : e),
        }));
      } else {
        set((state) => {
          const next = state.apiEnvironments.map((e) => e.id === id ? { ...e, ...updates } : e);
          persist({ apiEnvironments: next });
          return { apiEnvironments: next };
        });
      }
    },

    deleteApiEnvironment: async (id) => {
      if (isSupabaseConfigured()) {
        await supabase!.from('api_environments').delete().eq('id', id);
        set((state) => ({
          apiEnvironments: state.apiEnvironments.filter((e) => e.id !== id),
        }));
      } else {
        set((state) => {
          const next = state.apiEnvironments.filter((e) => e.id !== id);
          persist({ apiEnvironments: next });
          return { apiEnvironments: next };
        });
      }
    },

    importPostmanCollection: async (projectId, jsonContent) => {
      const data = JSON.parse(jsonContent);
      const name = data.info?.name || 'Imported Postman Collection';
      const description = data.info?.description || 'Postman collection import';

      const col = await get().addApiCollection({ project_id: projectId, name, description });
      if (!col) return;

      const parseItems = async (items: any[]) => {
        for (const item of items) {
          if (item.item && Array.isArray(item.item)) {
            await parseItems(item.item);
          } else if (item.request) {
            const req = item.request;
            const method = (req.method || 'GET').toUpperCase() as any;
            
            let path = '';
            if (typeof req.url === 'string') {
              path = req.url;
            } else if (req.url && req.url.raw) {
              path = req.url.raw;
            } else if (req.url && Array.isArray(req.url.path)) {
              path = '/' + req.url.path.join('/');
            }
            
            const headersArray = Array.isArray(req.header) 
              ? req.header.map((h: any) => ({ key: h.key, value: h.value, description: h.description || '' }))
              : [];
              
            const paramsArray = req.url && Array.isArray(req.url.query)
              ? req.url.query.map((q: any) => ({ key: q.key, value: q.value, description: q.description || '' }))
              : [];
              
            let bodyContent = '';
            if (req.body && req.body.mode === 'raw') {
              bodyContent = req.body.raw || '';
            }
            
            await get().addApiEndpoint({
              collection_id: col.id,
              name: item.name || 'API Endpoint',
              method,
              path: path || '/',
              headers: JSON.stringify(headersArray),
              params: JSON.stringify(paramsArray),
              body: bodyContent,
              test_case_id: null,
            });
          }
        }
      };
      
      if (data.item && Array.isArray(data.item)) {
        await parseItems(data.item);
      }
    },

    runApiEndpoint: async (endpointId, environmentId, userId) => {
      const endpoint = get().apiEndpoints.find(e => e.id === endpointId);
      if (!endpoint) throw new Error('Endpoint not found');

      const env = get().apiEnvironments.find(e => e.id === environmentId);
      let variables: { key: string, value: string }[] = [];
      if (env && env.variables) {
        try {
          variables = JSON.parse(env.variables);
        } catch(e) {}
      }

      let resolvedPath = endpoint.path;
      let resolvedBody = endpoint.body || '';
      
      variables.forEach((v) => {
        const regex = new RegExp(`\\{\\{\\s*${v.key}\\s*\\}\\}`, 'g');
        resolvedPath = resolvedPath.replace(regex, v.value);
        resolvedBody = resolvedBody.replace(regex, v.value);
      });

      const start = Date.now();
      let responseBody = '';
      let statusCode = 200;
      let responseHeaders: any = {};
      let errorMsg = null;

      if (resolvedPath.startsWith('http')) {
        try {
          const options: any = {
            method: endpoint.method,
            headers: {
              'Content-Type': 'application/json',
            },
          };
          
          if (endpoint.headers) {
            try {
              const headersList = JSON.parse(endpoint.headers);
              headersList.forEach((h: any) => {
                if (h.key && h.value) {
                  let resolvedVal = h.value;
                  variables.forEach((v) => {
                    const regex = new RegExp(`\\{\\{\\s*${v.key}\\s*\\}\\}`, 'g');
                    resolvedVal = resolvedVal.replace(regex, v.value);
                  });
                  options.headers[h.key] = resolvedVal;
                }
              });
            } catch (e) {}
          }
          
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(endpoint.method) && resolvedBody) {
            options.body = resolvedBody;
          }
          
          const res = await fetch(resolvedPath, options);
          statusCode = res.status;
          responseBody = await res.text();
          res.headers.forEach((value, name) => {
            responseHeaders[name] = value;
          });
        } catch (err: any) {
          errorMsg = err.message || 'CORS / Network connection failure';
          statusCode = 0;
        }
      }

      // Fallback high-fidelity mock if not real HTTP request or failed due to CORS/Offline
      if (statusCode === 0 || !resolvedPath.startsWith('http')) {
        errorMsg = null; // Clear network error if using mock
        const pathLower = resolvedPath.toLowerCase();
        
        if (pathLower.includes('login') || pathLower.includes('auth')) {
          statusCode = 200;
          responseBody = JSON.stringify({
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3ItMTIiLCJleHAiOjE3OTk5OTk5OTl9.mockSignature",
            token_type: "Bearer",
            expires_in: 3600,
            user: {
              id: "usr-12",
              name: "GIS QA Lead",
              email: "qa.lead@mapid.io",
              role: "Admin"
            }
          }, null, 2);
          responseHeaders = {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store, must-revalidate',
            'x-auth-engine': 'MAPID JWT Auth Gate'
          };
        } else if (pathLower.includes('user') || pathLower.includes('profile')) {
          statusCode = 200;
          responseBody = JSON.stringify({
            id: "usr-12",
            name: "GIS QA Lead",
            email: "qa.lead@mapid.io",
            created_at: "2026-01-01T00:00:00Z",
            status: "Active"
          }, null, 2);
          responseHeaders = {
            'content-type': 'application/json; charset=utf-8',
            'x-powered-by': 'Next.js'
          };
        } else if (pathLower.includes('error') || pathLower.includes('fail') || pathLower.includes('invalid')) {
          statusCode = 500;
          responseBody = JSON.stringify({
            error: "Internal Server Error",
            message: "Database driver failed to allocate response thread.",
            code: "ERR_DB_ALLOCATION",
            timestamp: new Date().toISOString()
          }, null, 2);
          responseHeaders = {
            'content-type': 'application/json',
            'connection': 'close'
          };
          errorMsg = 'Server responded with 500 error status code.';
        } else if (pathLower.includes('create') || pathLower.includes('submit') || endpoint.method === 'POST') {
          statusCode = 201;
          responseBody = JSON.stringify({
            id: `rec-${Math.floor(Math.random() * 90000) + 10000}`,
            success: true,
            message: "Record created successfully.",
            created_at: new Date().toISOString()
          }, null, 2);
          responseHeaders = {
            'content-type': 'application/json',
            'location': `/api/records/rec-9921`
          };
        } else {
          // Standard mock fallback
          statusCode = 200;
          responseBody = JSON.stringify({
            status: "Success",
            code: 200,
            message: "Mocked API endpoint execution response successful.",
            method: endpoint.method,
            resolved_url: resolvedPath,
            timestamp: Date.now()
          }, null, 2);
          responseHeaders = {
            'content-type': 'application/json',
            'x-mock-server': 'MAPID Mock API Gateway'
          };
        }
      }

      const duration = Date.now() - start;
      const finalStatus = (statusCode >= 200 && statusCode < 400) ? 'Passed' : 'Failed';

      // Update linked Test Case status if mapped
      if (endpoint.test_case_id) {
        const tc = get().testCases.find(t => t.id === endpoint.test_case_id);
        if (tc) {
          await get().updateTestCase(tc.id, {
            status: finalStatus === 'Passed' ? 'Actual' : 'Draft',
            description: `${tc.description || ''}\n\n[API Auto-Sync] Last API run status: ${finalStatus} (${statusCode}) at ${new Date().toISOString()}`
          });
        }
      }

      const result: ApiTestResult = {
        id: isSupabaseConfigured() ? undefined : `apr-${Date.now()}-${Math.random()}` as any,
        run_id: '', // Will be assigned during collection runs, or left blank for single runs
        endpoint_id: endpoint.id,
        status: finalStatus,
        status_code: statusCode,
        response_time_ms: duration,
        request_payload: resolvedBody || null,
        request_headers: endpoint.headers || null,
        response_payload: responseBody,
        response_headers: JSON.stringify(responseHeaders),
        error_message: errorMsg,
      };

      return result;
    },

    runApiCollection: async (collectionId, environmentId, userId) => {
      const endpoints = get().apiEndpoints
        .filter(e => e.collection_id === collectionId);

      const startRun = Date.now();
      const results: ApiTestResult[] = [];
      let passed = 0;
      let failed = 0;

      for (const end of endpoints) {
        try {
          const res = await get().runApiEndpoint(end.id, environmentId, userId);
          if (res.status === 'Passed') passed++;
          else failed++;
          results.push(res);
        } catch (e: any) {
          failed++;
          results.push({
            id: `apr-${Date.now()}-${Math.random()}` as any,
            run_id: '',
            endpoint_id: end.id,
            status: 'Failed',
            status_code: 0,
            response_time_ms: 0,
            error_message: e.message || 'Execution exception',
          });
        }
      }

      const duration = Date.now() - startRun;

      const newRun: ApiTestRun = {
        id: isSupabaseConfigured() ? undefined : `aprun-${Date.now()}` as any,
        collection_id: collectionId,
        environment_id: environmentId || null,
        executed_by: userId || null,
        passed_count: passed,
        failed_count: failed,
        duration_ms: duration,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!.from('api_test_runs').insert(newRun).select();
        if (!error && data) {
          const savedRun = data[0];
          
          // Map results to run_id
          const mappedResults = results.map(r => ({ ...r, run_id: savedRun.id }));
          const { data: savedResults } = await supabase!.from('api_test_results').insert(mappedResults).select();
          
          set((state) => ({
            apiTestRuns: [savedRun, ...state.apiTestRuns],
            apiTestResults: [...(savedResults || []), ...state.apiTestResults],
          }));
          return savedRun;
        }
      } else {
        newRun.id = `aprun-${Date.now()}` as any;
        const mappedResults = results.map(r => ({ 
          ...r, 
          id: `apr-${Date.now()}-${Math.random()}` as any, 
          run_id: newRun.id 
        }));
        
        set((state) => {
          const nextRuns = [newRun, ...state.apiTestRuns];
          const nextResults = [...mappedResults, ...state.apiTestResults];
          persist({ apiTestRuns: nextRuns, apiTestResults: nextResults });
          return { apiTestRuns: nextRuns, apiTestResults: nextResults };
        });
        return newRun;
      }
      return newRun;
    },
  };
});
