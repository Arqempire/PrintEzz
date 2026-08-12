import { NextRequest, NextResponse } from 'next/server';
import { updateShopHeartbeat, getShopJobs } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { shopId } = await req.json();

    if (!shopId) {
      return NextResponse.json({ error: 'shopId is required' }, { status: 400 });
    }

    const updatedShop = await updateShopHeartbeat(shopId);
    const jobs = await getShopJobs(shopId);
    const queuedJobs = jobs.filter((j) => j.status === 'queued');

    return NextResponse.json({
      success: true,
      shop: updatedShop,
      queuedJobsCount: queuedJobs.length,
      queuedJobs,
    });
  } catch (err: any) {
    console.error('Error updating agent heartbeat:', err);
    return NextResponse.json({ error: err.message || 'Heartbeat failed' }, { status: 500 });
  }
}
