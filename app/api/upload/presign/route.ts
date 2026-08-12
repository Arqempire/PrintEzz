import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl } from '@/lib/storage';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileName, contentType } = body;

    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName and contentType are required' }, { status: 400 });
    }

    const { uploadUrl, fileKey, publicUrl } = await getPresignedUploadUrl(fileName, contentType);

    return NextResponse.json({
      uploadUrl,
      fileKey,
      publicUrl,
    });
  } catch (err: any) {
    console.error('Error generating presigned URL:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate upload URL' }, { status: 500 });
  }
}
