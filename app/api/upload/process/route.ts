import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const fileName = file.name.toLowerCase();
    let pageCount = 1;
    let convertedBuffer: Uint8Array | null = null;
    let convertedFileName = file.name;

    if (fileName.endsWith('.pdf')) {
      try {
        const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        pageCount = pdfDoc.getPageCount();
      } catch (pdfErr) {
        console.warn('Failed to parse PDF page count with pdf-lib, falling back to 1 page:', pdfErr);
        pageCount = 1;
      }
    } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png')) {
      // Auto-convert non-PDF images to PDF server-side for clean printing
      try {
        const pdfDoc = await PDFDocument.create();
        let image;
        if (fileName.endsWith('.png')) {
          image = await pdfDoc.embedPng(bytes);
        } else {
          image = await pdfDoc.embedJpg(bytes);
        }

        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });

        const pdfBytes = await pdfDoc.save();
        convertedBuffer = pdfBytes;
        convertedFileName = `${fileName.replace(/\.[^/.]+$/, '')}.pdf`;
        pageCount = 1;
      } catch (imgErr) {
        console.warn('Error converting image to PDF:', imgErr);
        pageCount = 1;
      }
    } else {
      // Default fallback for DOCX or other formats
      pageCount = 1;
    }

    return NextResponse.json({
      success: true,
      fileName: convertedFileName,
      originalFileName: file.name,
      pageCount,
      isConverted: Boolean(convertedBuffer),
    });
  } catch (err: any) {
    console.error('Error processing upload file:', err);
    return NextResponse.json({ error: err.message || 'File processing failed' }, { status: 500 });
  }
}
