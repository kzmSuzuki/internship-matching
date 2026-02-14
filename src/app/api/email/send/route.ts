import { NextResponse } from 'next/server';



export async function POST(req: Request) {
  try {
    const { to, subject, body } = await req.json();
    
    // Environment variables (Cloudflare Pages uses process.env)
    const GAS_API_URL = process.env.GAS_API_URL;
    const GAS_API_KEY = process.env.GAS_API_KEY;

    if (!GAS_API_URL || !GAS_API_KEY) {
      console.error('GAS_API_URL or GAS_API_KEY is missing');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    const payload = {
      apiKey: GAS_API_KEY,
      action: 'send_email',
      to,
      subject,
      body
    };

    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
