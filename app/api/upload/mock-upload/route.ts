import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function PUT(req: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Mock file upload successful',
  });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Mock file upload successful',
  });
}
