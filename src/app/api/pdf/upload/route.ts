import { NextRequest, NextResponse } from 'next/server';

// Runtime handled by OpenNext/Cloudflare adapter

const GAS_API_URL = process.env.GAS_API_URL || 'YOUR_GAS_WEB_APP_URL';
const GAS_API_KEY = process.env.GAS_API_KEY || 'YOUR_SECRET_API_KEY';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    const base64 = btoa(binary);

    // Send to GAS
    const payload = {
      apiKey: GAS_API_KEY,
      fileName: file.name,
      mimeType: file.type,
      fileData: base64,
    };

    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error('GAS API Error');
    }

    const result = await response.json();
    
    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('PDF Upload Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
