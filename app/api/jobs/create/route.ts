import { NextRequest, NextResponse } from 'next/server';
import { calculatePrintPrice, isShopOnline } from '@/lib/pricing';
import { getShopById, savePrintJob } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      shopId,
      customerId,
      fileUrl,
      fileName,
      pageCount,
      copies,
      colorMode,
      duplex,
      pageRange,
    } = body;

    if (!shopId || !fileName) {
      return NextResponse.json({ error: 'shopId and fileName are required' }, { status: 400 });
    }

    // 1. Check shop existence and online status
    const shop = await getShopById(shopId);
    if (!shop) {
      return NextResponse.json({ error: 'Print shop not found' }, { status: 404 });
    }

    if (!isShopOnline(shop.last_seen)) {
      return NextResponse.json(
        { error: 'Shop is currently offline. Please check with the shopkeeper before placing orders.' },
        { status: 503 }
      );
    }

    // 2. Compute price server-side for integrity
    const breakdown = calculatePrintPrice(shop, pageCount || 1, copies || 1, colorMode || 'bw');

    // 3. Create print job with unique customer_id and job ID
    const newJob = await savePrintJob({
      shop_id: shop.id,
      customer_id: customerId || `usr_${Date.now().toString(36)}`,
      file_url: fileUrl || null,
      file_name: fileName,
      page_count: breakdown.page_count,
      copies: breakdown.copies,
      color_mode: breakdown.color_mode,
      duplex: Boolean(duplex),
      page_range: pageRange || 'all',
      price: breakdown.total_price,
      status: 'pending',
      payment_status: 'unpaid',
    });

    // 4. Initialize Razorpay / UPI order parameters
    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_demo_key';
    const razorpayOrderId = `order_${newJob.id.substring(0, 16)}`;

    return NextResponse.json({
      success: true,
      job: newJob,
      breakdown,
      payment: {
        provider: 'razorpay',
        key: razorpayKey,
        orderId: razorpayOrderId,
        amount: Math.round(breakdown.total_price * 100), // in paise
        currency: 'INR',
      },
    });
  } catch (err: any) {
    console.error('Error creating print job:', err);
    return NextResponse.json({ error: err.message || 'Failed to create job' }, { status: 500 });
  }
}
