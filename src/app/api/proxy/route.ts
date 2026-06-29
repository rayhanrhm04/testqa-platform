import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url, method, headers, body } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const options: any = {
      method: method || 'GET',
      headers: headers || {},
    };

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method) && body) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const start = Date.now();
    const res = await fetch(url, options);
    const duration = Date.now() - start;

    const contentType = res.headers.get('content-type') || '';
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
      duration_ms: duration,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 0,
      error: err.message || 'Failed to proxy request',
    }, { status: 500 });
  }
}
