import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { summonerName, tagLine, region, queueType } = body;

    // Basic validation
    if (!summonerName || !tagLine || !region || queueType === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Forward the request to the Python backend
    // Using the deployed backend on Render
    const backendResponse = await fetch('https://mmr-backnd.vercel.app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summoner_name: summonerName, // Ensure snake_case for Python backend
        tag_line: tagLine,         // Ensure snake_case for Python backend
        region: region,
        queue_type: queueType,     // Ensure snake_case for Python backend
      }),
    });

    const responseData = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error('Backend error:', backendResponse.status, responseData);
      return NextResponse.json({ success: false, error: responseData.error || `Backend request failed with status ${backendResponse.status}` }, { status: backendResponse.status });
    }

    return NextResponse.json({
      success: true,
      data: responseData
    }, { status: 200 });

  } catch (error) {
    console.error('API route error:', error);
    let errorMessage = 'Internal server error in Next.js API route';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Check for fetch errors (e.g., backend not running)
    if (error && typeof error === 'object' && 'cause' in error && error.cause && typeof error.cause === 'object' && 'code' in error.cause && error.cause.code === 'ECONNREFUSED') {
      errorMessage = 'Connection to backend failed. Ensure the Python server is running.';
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
