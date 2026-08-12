import { NextRequest, NextResponse } from 'next/server';
import { getPrintJobById, savePrintJob } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { jobId } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const job = await getPrintJobById(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const updatedJob = await savePrintJob({
      ...job,
      status: 'queued',
      payment_id: `pay_sim_${Date.now()}`,
      payment_status: 'paid',
    });

    return NextResponse.json({
      success: true,
      job: updatedJob,
      message: 'Payment simulation successful. Job moved to QUEUED.',
    });
  } catch (err: any) {
    console.error('Error simulating payment:', err);
    return NextResponse.json({ error: err.message || 'Payment simulation failed' }, { status: 500 });
  }
}
