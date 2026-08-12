import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return new NextResponse('Mock document content placeholder', {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="mock-document.pdf"',
    },
  });
}
