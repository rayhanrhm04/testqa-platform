'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { ChevronLeft, Plus, Play, Sparkles, FolderIcon, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormGroup, Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import Link from 'next/link';

export default function CreateTestRunPage() {
  const router = useRouter();
  const { releases, testCases, addTestRun, logActivity } = useDataStore();
  const { currentUser, activeRole } = useAuthStore();
  const { addToast } = useUIStore();

  if (activeRole !== 'Admin' && activeRole !== 'QA Engineer') {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500 mb-2" />
        <h3 className="text-base font-bold text-foreground">Access Denied</h3>
        <p className="text-xs text-muted-foreground mt-1">You do not have permission to initiate a test run campaign.</p>
        <Link href="/test-runs" className="mt-4">
          <Button variant="outline" size="sm">Back to Test Runs</Button>
        </Link>
      </div>
    );
  }

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [releaseId, setReleaseId] = React.useState('');
  const [testType, setTestType] = React.useState('Regression');

  React.useEffect(() => {
    if (releases.length > 0 && !releaseId) {
      setReleaseId(releases[0].id);
    }
  }, [releases, releaseId]);

  // Dynamically count matching cases
  const matchingCasesCount = React.useMemo(() => {
    return testCases.filter((tc) => tc.tags.includes(testType)).length;
  }, [testCases, testType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !releaseId || !testType) {
      addToast('Title, Release, and Test Type are required.', 'warning');
      return;
    }

    if (matchingCasesCount === 0) {
      addToast(`No test cases match the tag "${testType}". Please select another.`, 'warning');
      return;
    }

    try {
      await addTestRun(releaseId, title, testType, description);
      if (currentUser) {
        await logActivity(currentUser.id, `Created test run campaign: ${title}`);
      }
      addToast('Test run created! Test cases loaded.', 'success');
      router.push('/test-runs');
    } catch (err) {
      addToast('Failed to create run.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-xl text-left">
      {/* Back button */}
      <div>
        <Link href="/test-runs" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold">
          <ChevronLeft className="h-4 w-4" />
          Back to Test Runs
        </Link>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">Initiate Test Campaign</h2>
          <p className="text-xs text-muted-foreground mt-1">Select a release, choose test types, and we will automatically index cases.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormGroup label="Run Title">
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="e.g. Smoke Run v2.56.02" 
            />
          </FormGroup>

          <FormGroup label="Description / Scope Details">
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Provide context on changes to test, device configurations..." 
              rows={3} 
            />
          </FormGroup>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormGroup label="Select Release target">
              <Select value={releaseId} onChange={(e) => setReleaseId(e.target.value)}>
                {releases.map(r => (
                  <option key={r.id} value={r.id}>v{r.version} ({r.status})</option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup label="Test type filters">
              <Select value={testType} onChange={(e) => setTestType(e.target.value)}>
                <option value="Smoke">Smoke</option>
                <option value="Regression">Regression</option>
                <option value="Functional">Functional</option>
              </Select>
            </FormGroup>
          </div>

          {/* Diagnostic status box */}
          <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg text-xs">
            <Sparkles className="h-5 w-5 text-primary shrink-0 animate-pulse" />
            <div className="space-y-0.5">
              <p className="font-bold text-foreground">Matching Test Cases Detected</p>
              <p className="text-muted-foreground">
                We indexed <strong className="text-primary">{matchingCasesCount} cases</strong> with the tag <strong className="text-foreground">"{testType}"</strong>.
              </p>
            </div>
          </div>

          {/* Action footer */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Link href="/test-runs">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={matchingCasesCount === 0} className="font-semibold cursor-pointer">
              <Play className="h-3.5 w-3.5 mr-1" />
              Launch Campaign
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
