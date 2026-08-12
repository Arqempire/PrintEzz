import { NextRequest, NextResponse } from 'next/server';
import { getPrintJobById, savePrintJob } from '@/lib/supabase/server';
import { JobStatus } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, status, failureReason, retentionExtended } = body as {
      jobId: string;
      status?: JobStatus;
      failureReason?: string;
      retentionExtended?: boolean;
    };

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const job = await getPrintJobById(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Print job not found' }, { status: 404 });
    }

    const updates: Partial<typeof job> = { ...job };

    if (status) {
      updates.status = status;
      if (status === 'failed' || status === 'needs_attention') {
        updates.failure_reason = failureReason || 'Printer timeout or hardware alert';
        updates.delete_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      } else if (status === 'done') {
        updates.delete_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      }
    }

    if (retentionExtended !== undefined) {
      updates.retention_extended = retentionExtended;
    }

    const updatedJob = await savePrintJob(updates);

    return NextResponse.json({
      success: true,
      job: updatedJob,
    });
  } catch (err: any) {
    console.error('Error updating print job status:', err);
    return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 });
  }
}
