import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const GAS_API_URL = process.env.GAS_API_URL || 'YOUR_GAS_WEB_APP_URL';
const GAS_API_KEY = process.env.GAS_API_KEY || 'YOUR_SECRET_API_KEY';

export async function GET(req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const { fileId } = await params;
    
    // Fetch from GAS
    // Note: GAS `doGet` expects query parameters
    const url = `${GAS_API_URL}?apiKey=${GAS_API_KEY}&fileId=${fileId}`;
    
    const response = await fetch(url);
    if (!response.ok) {
         throw new Error('GAS API Error');
    }

    const result = await response.json();
    
    if (result.error) {
         return NextResponse.json({ error: result.error }, { status: 404 });
    }

    // Return the base64 data directly or construct a stream?
    // For simple viewer iframe src="data:application/pdf;base64,...", we can return the base64 or serve as binary.
    // If we want to serve as binary (normal PDF):
    if (result.data) {
        const binaryString = atob(result.data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        return new NextResponse(bytes, {
            headers: {
                'Content-Type': result.mimeType || 'application/pdf',
                'Content-Disposition': `inline; filename="${result.fileName}"`,
            }
        });
    }

    return NextResponse.json({ error: 'No data found' }, { status: 404 });
  } catch (error: any) {
    console.error('PDF Fetch Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
