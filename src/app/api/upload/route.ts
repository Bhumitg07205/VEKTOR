import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') || 'resume.pdf';
    
    // Upload the raw body directly to Vercel Blob
    const blob = await put(filename, request.body as ReadableStream, {
      access: 'public',
    });

    return NextResponse.json({ url: blob.url });
  } catch (error: any) {
    console.error('Blob upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
