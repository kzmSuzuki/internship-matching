const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || '';
};

export const emailService = {
  async send(to: string, subject: string, body: string) {
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, subject, body }),
      });
      const data = await res.json();
      if (!res.ok) {
         throw new Error(data.error || 'Failed to send email');
      }
    } catch (e) {
      console.error('Failed to send email:', e);
    }
  },

  async notifyOffer(studentEmail: string, studentName: string, companyName: string, jobTitle: string, message: string) {
    const subject = `【重要】${companyName}からマッチングオファーが届きました`;
    const body = `${studentName} 様\n\nお世話になっております、${companyName}です。\n\n以下の求人につきまして、ぜひ一度お話しさせていただきたく、マッチングオファーをお送りいたします。\n\n求人名: ${jobTitle}\n\n【企業からのメッセージ】\n${message}\n\n以下のリンクから詳細をご確認の上、承諾をお願いいたします。\n${getBaseUrl()}/student/applications\n\n-------------------\nInternship Matching App`;
    await this.send(studentEmail, subject, body);
  },

  async notifyRejection(studentEmail: string, studentName: string, companyName: string, jobTitle: string) {
    const subject = `【選考結果】${companyName}への応募について`;
    const body = `${studentName} 様\n\nこの度は、${companyName}の「${jobTitle}」へご応募いただき誠にありがとうございます。\n\n慎重に選考を行いました結果、誠に残念ながら今回はご期待に沿えない結果となりました。\n\n${studentName} 様の今後のご活躍をお祈り申し上げます。\n\n-------------------\nInternship Matching App`;
    await this.send(studentEmail, subject, body);
  }
};
