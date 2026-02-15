/**
 * Sends an email via the server-side API proxy.
 * @param to Recipient email address
 * @param subject Email subject
 * @param body Email body (text)
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, body }),
    });

    if (!res.ok) {
      console.error('Failed to send email:', await res.text());
      return false;
    }

    // console.log('Email sent successfully via /api/send-email');
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
