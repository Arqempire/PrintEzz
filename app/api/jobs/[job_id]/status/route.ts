import { NextRequest, NextResponse } from 'next/server';
import { getPrintJobById } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ job_id: string }> }
) {
  try {
    const { job_id } = await params;
    if (!job_id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const job = await getPrintJobById(job_id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (err: any) {
    console.error('Error fetching job status:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch job status' }, { status: 500 });
  }
}
