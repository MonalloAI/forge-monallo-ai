import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
   
    const response = await fetch(
      `http://localhost:3003/api/worker-data/47`, 
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from API' },
      { status: 500 }
    );
  }
} 