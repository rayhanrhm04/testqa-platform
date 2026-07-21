import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    const { url, method, headers, body, timeoutMs } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = Number(timeoutMs) > 0 ? Math.min(Number(timeoutMs), 120000) : 30000;
    timeoutId = setTimeout(() => controller.abort(), timeout);

    const options: any = {
      method: method || 'GET',
      headers: headers || {},
      signal: controller.signal,
    };

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method) && body) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const start = performance.now();
    const res = await fetch(url, options);
    const duration = performance.now() - start;

    let resBody = '';
    
    try {
      resBody = await res.text();
    } catch (e) {
      resBody = '';
    }

    const resHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      resHeaders[key] = value;
    });

    return NextResponse.json({
      status: res.status,
      headers: resHeaders,
      body: resBody,
      duration_ms: Math.round(duration),
      duration_exact_ms: Number(duration.toFixed(2)),
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 0,
      error: err.name === 'AbortError' ? 'Request timeout exceeded' : err.message || 'Failed to proxy request',
    }, { status: 500 });
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
