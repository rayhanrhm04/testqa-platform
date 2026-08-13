import { NextResponse } from 'next/server';

type DispatchBody = {
  runId?: string;
  projectName?: string;
  environment?: string;
  browser?: string;
  specPattern?: string;
  testCaseCodes?: string[];
  baseUrl?: string;
  notes?: string;
};

const getRepoConfig = () => {
  const configuredRepo = process.env.GITHUB_AUTOMATION_REPOSITORY || process.env.GITHUB_REPOSITORY || '';
  const workflowFile = process.env.GITHUB_AUTOMATION_WORKFLOW || 'cypress-automation.yml';
  const ref = process.env.GITHUB_AUTOMATION_REF || 'staging';
  const token = process.env.GITHUB_AUTOMATION_TOKEN || process.env.GITHUB_TOKEN || '';

  return { configuredRepo, workflowFile, ref, token };
};

export async function POST(request: Request) {
  const body = (await request.json()) as DispatchBody;
  const { configuredRepo, workflowFile, ref, token } = getRepoConfig();

  const payload = {
    ref,
    inputs: {
      run_id: body.runId || '',
      project_name: body.projectName || '',
      environment: body.environment || 'Staging',
      browser: body.browser || 'Chrome',
      spec_pattern: body.specPattern || 'cypress/e2e/**/*.cy.ts',
      test_case_codes: (body.testCaseCodes || []).join(','),
      base_url: body.baseUrl || '',
      notes: body.notes || '',
    },
  };

  if (!configuredRepo || !token) {
    return NextResponse.json({
      mode: 'not_configured',
      message: 'GitHub Actions dispatch is not configured yet. Set GITHUB_AUTOMATION_TOKEN and GITHUB_AUTOMATION_REPOSITORY in Vercel.',
      workflowFile,
      payload,
    }, { status: 202 });
  }

  const response = await fetch(
    `https://api.github.com/repos/${configuredRepo}/actions/workflows/${workflowFile}/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({
      mode: 'dispatch_failed',
      message: 'Failed to trigger GitHub Actions workflow.',
      detail,
      workflowFile,
      payload,
    }, { status: response.status });
  }

  return NextResponse.json({
    mode: 'dispatched',
    message: 'GitHub Actions workflow dispatched.',
    workflowFile,
    payload,
  });
}
