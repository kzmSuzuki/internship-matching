import { NextRequest, NextResponse } from 'next/server';

// Runtime handled by OpenNext/Cloudflare adapter

const GAS_API_URL = process.env.GAS_API_URL || '';
const GAS_API_KEY = process.env.GAS_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    // Validate configuration
    if (!GAS_API_URL || !GAS_API_KEY) {
      console.error('GAS API Configuration missing');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payload = {
      apiKey: GAS_API_KEY,
      action: 'send_email',
      to,
      subject,
      body,
    };

    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      redirect: 'follow', // Follow redirects for GAS
    });

    const responseText = await response.text();
    
    // Check for HTML response (error page)
    if (responseText.trim().toLowerCase().startsWith('<!doctype') || responseText.trim().toLowerCase().startsWith('<html')) {
        console.error('[Email Send] GAS returned HTML');
        return NextResponse.json({ error: 'Email service error' }, { status: 500 });
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
       console.error('[Email Send] Failed to parse response');
       return NextResponse.json({ error: 'Invalid response from email service' }, { status: 500 });
    }

    if (result.error) {
       console.error('[Email Send] GAS Error:', result.error);
       return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Email Send] API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
