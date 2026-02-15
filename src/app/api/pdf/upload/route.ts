import { NextRequest, NextResponse } from 'next/server';

// Runtime handled by OpenNext/Cloudflare adapter

const GAS_API_URL = process.env.GAS_API_URL || '';
const GAS_API_KEY = process.env.GAS_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    // Validate configuration
    if (!GAS_API_URL || GAS_API_URL === 'YOUR_GAS_WEB_APP_URL') {
      console.error('GAS_API_URL is not configured');
      return NextResponse.json({ error: 'Server configuration error: GAS API URL not set' }, { status: 500 });
    }
    if (!GAS_API_KEY || GAS_API_KEY === 'YOUR_SECRET_API_KEY') {
      console.error('GAS_API_KEY is not configured');
      return NextResponse.json({ error: 'Server configuration error: GAS API Key not set' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    const base64 = btoa(binary);

    const payload = {
      apiKey: GAS_API_KEY,
      fileName: file.name,
      mimeType: file.type,
      fileData: base64,
    };

    // First request with no redirect follow to check initial status
    let response = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      redirect: 'manual', 
    });

    if (response.status === 302) {
      const location = response.headers.get('location');
      if (location) {
        // Follow redirect with GET
        response = await fetch(location);
      }
    } else if (response.status === 401 || response.status === 403) {
       console.error('[PDF Upload] GAS Auth Error.');
       return NextResponse.json({ 
         error: 'GASへのアクセス権限がありません。デプロイ設定を確認してください。' 
       }, { status: 500 });
    }

    // Read response text
    const responseText = await response.text();

    // Check if response is HTML (GAS error page or login redirect that returned 200)
    if (responseText.trim().toLowerCase().startsWith('<!doctype') || responseText.trim().toLowerCase().startsWith('<html')) {
      console.error('[PDF Upload] GAS returned HTML instead of JSON.');
      return NextResponse.json({ 
        error: 'GAS APIがHTMLを返しました。設定を確認してください。' 
      }, { status: 500 });
    }

    // Try to parse JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[PDF Upload] Failed to parse GAS response as JSON');
      return NextResponse.json({ 
        error: 'GAS APIのレスポンスをパースできませんでした' 
      }, { status: 500 });
    }
    
    if (result.error) {
      console.error('[PDF Upload] GAS returned error:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    if (!result.fileId) {
      console.error('[PDF Upload] GAS response missing fileId');
      return NextResponse.json({ error: 'GAS APIからfileIdが返されませんでした' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[PDF Upload] Error:', error.message);
    return NextResponse.json({ 
      error: `PDFアップロードエラー: ${error.message}` 
    }, { status: 500 });
  }
}
