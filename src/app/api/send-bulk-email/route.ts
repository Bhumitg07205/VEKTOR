import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const generateTemplate = (title: string, subtitle: string, accentColor: string, contentHtml: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
</head>
<body style="background-color: #000000; color: #ffffff; font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px 20px; line-height: 1.6; -webkit-font-smoothing: antialiased;">
  
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #000000;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #0a0a0a; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; overflow: hidden; margin: 0 auto; box-shadow: 0 20px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05);">
          
          <!-- Header Area -->
          <tr>
            <td style="padding: 48px 48px 32px 48px; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: left; background: radial-gradient(circle at top left, rgba(255,255,255,0.03) 0%, transparent 50%);">
              <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; margin-bottom: 8px; color: ${accentColor}; text-shadow: 0 0 20px ${accentColor}40;">VEKTOR</div>
              <div style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">${subtitle}</div>
            </td>
          </tr>

          <!-- Content Area -->
          <tr>
            <td style="padding: 48px; color: #d4d4d4; font-size: 16px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="padding: 32px 48px; background-color: #050505; border-top: 1px solid rgba(255,255,255,0.03); text-align: left;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size: 12px; color: #555555; text-transform: uppercase; letter-spacing: 1px;">
                    VEKTOR Core Autonomous Systems
                  </td>
                  <td style="font-size: 12px; color: #444444; text-align: right;">
                    DO NOT REPLY
                  </td>
                </tr>
              </table>
              <div style="margin-top: 16px; font-size: 11px; color: #333333; line-height: 1.5;">
                This transmission is secured and uniquely generated for the intended recipient.
                <br>&copy; ${new Date().getFullYear()} VEKTOR Collective. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`;

export async function POST(req: Request) {
  try {
    const { recipients, subject, messageText, templateType } = await req.json();

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'Recipients array is required' }, { status: 400 });
    }
    if (!subject || !messageText) {
      return NextResponse.json({ error: 'Subject and Message Text are required' }, { status: 400 });
    }

    // Configure Nodemailer with Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || 'bhumit07205@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD || 'nusr wbbv pftt efsw'
      }
    });

    const sendPromises = recipients.map(async (recipient: { email: string; name: string }) => {
      // Replace {{name}} with the applicant's real name in the body
      let personalizedText = messageText.replace(/{{name}}/gi, recipient.name);
      
      let innerHtml = '';
      let accentColor = '#ffffff';

      let formattedText = templateType === 'custom' ? personalizedText : personalizedText.replace(/\n/g, '<br>');

      if (templateType === 'warning') {
        accentColor = '#f59e0b';
        innerHtml = `
          <h2 style="font-size: 24px; margin-bottom: 24px; color: #ffffff; font-weight: 500; letter-spacing: -0.5px;">Action Required, ${recipient.name}.</h2>
          <div style="background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); border-left: 4px solid #f59e0b; padding: 24px; border-radius: 8px; margin: 32px 0;">
            <div style="font-size: 15px; color: #ffffff; line-height: 1.6;">${formattedText}</div>
          </div>
        `;
      } else if (templateType === 'reminder') {
        accentColor = '#8b5cf6';
        innerHtml = `
          <h2 style="font-size: 24px; margin-bottom: 24px; color: #ffffff; font-weight: 500; letter-spacing: -0.5px;">Reminder for ${recipient.name}.</h2>
          <div style="font-size: 15px; color: #d4d4d4; line-height: 1.6;">${formattedText}</div>
        `;
      } else if (templateType === 'general') {
        accentColor = '#3b82f6';
        innerHtml = `
          <h2 style="font-size: 24px; margin-bottom: 24px; color: #ffffff; font-weight: 500; letter-spacing: -0.5px;">Update for ${recipient.name}.</h2>
          <div style="font-size: 15px; color: #d4d4d4; line-height: 1.6;">${formattedText}</div>
        `;
      } else if (templateType === 'success') {
        accentColor = '#22c55e';
        innerHtml = `
          <h2 style="font-size: 24px; margin-bottom: 24px; color: #ffffff; font-weight: 500; letter-spacing: -0.5px;">Offer for ${recipient.name}.</h2>
          <div style="background: rgba(34, 197, 94, 0.05); border: 1px solid rgba(34, 197, 94, 0.2); border-left: 4px solid #22c55e; padding: 24px; border-radius: 8px; margin: 32px 0;">
            <div style="font-size: 15px; color: #ffffff; line-height: 1.6;">${formattedText}</div>
          </div>
        `;
      } else if (templateType === 'rejected') {
        accentColor = '#ef4444';
        innerHtml = `
          <h2 style="font-size: 24px; margin-bottom: 24px; color: #ffffff; font-weight: 500; letter-spacing: -0.5px;">Status Update, ${recipient.name}.</h2>
          <div style="font-size: 15px; color: #d4d4d4; line-height: 1.6;">${formattedText}</div>
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); padding: 24px; border-radius: 8px; margin: 32px 0;">
            <p style="margin: 0; color: #a3a3a3; line-height: 1.6; font-size: 15px;">We recommend continuous iteration of your skills. Keep building.</p>
          </div>
        `;
      } else {
        innerHtml = personalizedText;
      }

      const formattedHtml = generateTemplate(
        subject,
        'Direct Communication',
        accentColor,
        innerHtml
      );

      return transporter.sendMail({
        from: `"VEKTOR Core" <${process.env.GMAIL_USER || 'bhumit07205@gmail.com'}>`,
        to: recipient.email,
        subject: subject,
        html: formattedHtml,
      });
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, message: `Emails sent to ${recipients.length} recipients` });
    
  } catch (err: any) {
    console.error('Error sending bulk emails via Nodemailer:', err);
    return NextResponse.json({ error: err.message || 'Failed to send bulk emails' }, { status: 500 });
  }
}
