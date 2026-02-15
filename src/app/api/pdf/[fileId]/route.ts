import { NextRequest, NextResponse } from 'next/server';

// Runtime handled by OpenNext/Cloudflare adapter

const GAS_API_URL = process.env.GAS_API_URL || '';
const GAS_API_KEY = process.env.GAS_API_KEY || '';

export async function GET(req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    // --- Security Check ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];

    // Verify token using Firebase Auth REST API
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      console.error('Missing NEXT_PUBLIC_FIREBASE_API_KEY');
       return NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 });
    }

    const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
    const verifyRes = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    if (!verifyRes.ok) {
       return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    // ---------------------

    // Validate GAS config
    if (!GAS_API_URL) {
      return NextResponse.json({ error: 'GAS API URL not configured' }, { status: 500 });
    }

    const { fileId } = await params;
    
    // Fetch from GAS
    const url = new URL(GAS_API_URL);
    url.searchParams.append('apiKey', GAS_API_KEY);
    url.searchParams.append('fileId', fileId);
    
    // console.log(`[PDF Fetch] Requesting fileId=${fileId}`);

    const response = await fetch(url.toString(), { 
        redirect: 'follow',
        cache: 'no-store' 
    });

    // Read as text first for debugging
    const responseText = await response.text();

    // Check for HTML response (GAS error/login page)
    if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
      console.error('[PDF Fetch] GAS returned HTML instead of JSON');
      return NextResponse.json({ error: 'GAS API error' }, { status: 500 });
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error('[PDF Fetch] Failed to parse GAS response');
      return NextResponse.json({ error: 'Invalid GAS response' }, { status: 500 });
    }
    
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    // Return as binary PDF
    if (result.data) {
        // Remove any newlines or whitespace from base64 string
        const base64Clean = result.data.replace(/[\r\n\s]/g, '');
        const binaryString = atob(base64Clean);
        const len = binaryString.length;
        
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        return new NextResponse(bytes, {
            headers: {
                'Content-Type': result.mimeType || 'application/pdf',
                'Content-Disposition': `inline; filename="${result.fileName || 'document.pdf'}"`,
                'Cache-Control': 'no-store, max-age=0',
            }
        });
    }

    return NextResponse.json({ error: 'No data found' }, { status: 404 });
  } catch (error: any) {
    console.error('[PDF Fetch] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
