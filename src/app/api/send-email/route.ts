import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Helper to generate the base futuristic template
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
    const { to, applicantName, status, interviewDate, interviewLocationType, interviewLocation, customNote } = await req.json();

    if (!to) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    let subject = `VEKTOR Core: Status Update - ${status}`;
    let htmlContent = '';
    
    // Theme colors
    const colors = {
      brand: '#ffffff',
      success: '#10b981', // Emerald
      warning: '#f59e0b', // Amber
      danger: '#ef4444',  // Red
      accent: '#8b5cf6',  // Violet
      blue: '#3b82f6'     // Blue
    };

    if (status === 'Registered') {
      subject = `INITIATION: Application Received`;
      const innerHtml = `
        <h2 style="font-size: 24px; margin-bottom: 24px; color: #ffffff; font-weight: 500; letter-spacing: -0.5px;">Welcome to the Queue, <span style="color: ${colors.blue};">${applicantName}</span>.</h2>
        <p style="margin-bottom: 24px; line-height: 1.7;">Your application data has been successfully ingested into the VEKTOR Core mainframe. We are currently evaluating your profile against our rigorous standards.</p>
        
        <div style="background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); border-left: 4px solid ${colors.blue}; padding: 24px; border-radius: 8px; margin: 32px 0;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: ${colors.blue}; font-weight: 700; margin-bottom: 8px;">Current Status</div>
          <div style="font-size: 18px; font-weight: 600; color: #ffffff; letter-spacing: 1px;">AWAITING EVALUATION</div>
        </div>
        
        <p style="margin-bottom: 0; color: #a3a3a3;">You will receive another transmission once a decision has been formulated. Stay sharp.</p>
      `;
      htmlContent = generateTemplate('VEKTOR - Application Received', 'Admissions Processing', colors.brand, innerHtml);

    } else if (status === 'Accepted') {
      subject = `CONFIRMED: Welcome to VEKTOR`;
      const innerHtml = `
        <h2 style="font-size: 24px; margin-bottom: 24px; color: #ffffff; font-weight: 500; letter-spacing: -0.5px;">Congratulations, <span style="color: ${colors.success};">${applicantName}</span>.</h2>
        <p style="margin-bottom: 24px; line-height: 1.7;">Your profile has exceeded our baseline parameters. You have been officially <b style="color: ${colors.success}; font-weight: 600;">ACCEPTED</b> into the VEKTOR collective.</p>
        <p style="margin-bottom: 24px; line-height: 1.7;">You have proven your authority and potential. Prepare for the next phase of your evolution. Our core team will transmit onboarding coordinates shortly.</p>
        
        ${customNote ? `
        <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-left: 4px solid ${colors.success}; padding: 24px; border-radius: 8px; margin: 32px 0;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: ${colors.success}; font-weight: 700; margin-bottom: 8px;">Direct Comm from Core Team</div>
          <div style="font-size: 15px; color: #ffffff; line-height: 1.6;">${customNote}</div>
        </div>` : ''}
        
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05);">
          <p style="margin: 0; color: ${colors.success}; font-size: 14px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">&gt; ACCESS GRANTED</p>
        </div>
      `;
      htmlContent = generateTemplate('VEKTOR - Accepted', 'Final Decision', colors.success, innerHtml);

    } else if (status === 'Interview') {
        const formattedDate = interviewDate ? new Date(interviewDate).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' }) : 'To be assigned';
        
        let locHtml = '';
        if (interviewLocation) {
          const locLabel = interviewLocationType === 'virtual' ? 'Meeting URL' : 'Physical Location';
          locHtml = `
            <tr>
              <td style="background: rgba(139, 92, 246, 0.05); border: 1px solid rgba(139, 92, 246, 0.2); border-left: 4px solid ${colors.accent}; padding: 24px; border-radius: 8px; border-top: none; margin-top: 8px;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: ${colors.accent}; font-weight: 700; margin-bottom: 8px;">${locLabel}</div>
                <div style="font-size: 16px; font-weight: 500; color: #e5e5e5; letter-spacing: 0.5px;">${interviewLocation}</div>
              </td>
            </tr>
          `;
        }

        subject = `ACTION REQUIRED: Interview Scheduled`;
        const innerHtml = `
          <h2 style="font-size: 24px; margin-bottom: 24px; color: #ffffff; font-weight: 500; letter-spacing: -0.5px;">Next Stage Unlocked, <span style="color: ${colors.accent};">${applicantName}</span>.</h2>
          <p style="margin-bottom: 24px; line-height: 1.7;">Your application has progressed to the interactive evaluation phase. We need to verify your capabilities in real-time.</p>
          
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0; border-collapse: separate; border-spacing: 0 8px;">
            <tr>
              <td style="background: rgba(139, 92, 246, 0.05); border: 1px solid rgba(139, 92, 246, 0.2); border-left: 4px solid ${colors.accent}; padding: 24px; border-radius: 8px;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: ${colors.accent}; font-weight: 700; margin-bottom: 8px;">Temporal Coordinates</div>
                <div style="font-size: 18px; font-weight: 600; color: #ffffff; letter-spacing: 0.5px;">${formattedDate}</div>
              </td>
            </tr>
            ${locHtml}
          </table>
  
          <p style="margin-bottom: 24px; line-height: 1.7;">Ensure your neural links, visual sensors, and audio inputs are calibrated and functioning optimally.</p>
        
        ${customNote ? `
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); padding: 24px; border-radius: 8px; margin: 32px 0;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #888888; font-weight: 700; margin-bottom: 8px;">Additional Instructions</div>
          <div style="font-size: 15px; color: #e5e5e5; line-height: 1.6;">${customNote}</div>
        </div>` : ''}
      `;
      htmlContent = generateTemplate('VEKTOR - Interview', 'Evaluation Phase', colors.accent, innerHtml);

    } else if (status === 'Rejected') {
      subject = `DECISION: Application Status`;
      const innerHtml = `
        <h2 style="font-size: 24px; margin-bottom: 24px; color: #ffffff; font-weight: 500; letter-spacing: -0.5px;">Status Update, ${applicantName}.</h2>
        <p style="margin-bottom: 24px; line-height: 1.7;">We have finalized the analysis of your application payload.</p>
        <p style="margin-bottom: 24px; line-height: 1.7;">Due to current bandwidth limitations and intense competition, we are unable to process your inclusion into the current cohort.</p>
        
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); padding: 24px; border-radius: 8px; margin: 32px 0;">
          <p style="margin: 0; color: #a3a3a3; line-height: 1.6; font-size: 15px;">We recommend continuous iteration of your skills. The system will remain open for future cycles. Keep building.</p>
        </div>
        
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05);">
          <p style="margin: 0; color: #555555; font-size: 14px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">&gt; END TRANSMISSION</p>
        </div>
      `;
      htmlContent = generateTemplate('VEKTOR - Update', 'Final Decision', colors.brand, innerHtml);

    } else {
      subject = `UPDATE: VEKTOR Core Status - ${status}`;
      const innerHtml = `
        <h2 style="font-size: 24px; margin-bottom: 24px; color: #ffffff; font-weight: 500; letter-spacing: -0.5px;">Status Change: ${status}</h2>
        <p style="margin-bottom: 24px; line-height: 1.7;">Hello ${applicantName},</p>
        <p style="margin-bottom: 24px; line-height: 1.7;">Your application parameter has been modified to: <b style="color: #ffffff;">${status}</b>.</p>
        
        ${customNote ? `
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); padding: 24px; border-radius: 8px; margin: 32px 0;">
          <div style="font-size: 15px; color: #e5e5e5; line-height: 1.6;">${customNote}</div>
        </div>` : ''}
      `;
      htmlContent = generateTemplate('VEKTOR - Update', 'System Notification', colors.brand, innerHtml);
    }

    // Configure Nodemailer with Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || 'bhumit07205@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD || 'nusr wbbv pftt efsw'
      }
    });

    // Send the email
    const info = await transporter.sendMail({
      from: `"VEKTOR Core" <${process.env.GMAIL_USER || 'bhumit07205@gmail.com'}>`,
      to: to,
      subject: subject,
      html: htmlContent,
    });

    return NextResponse.json({ success: true, message: `Ultra-premium email sent to ${to}`, data: info });
    
  } catch (err: any) {
    console.error('Error sending email via Nodemailer:', err);
    return NextResponse.json({ error: err.message || 'Failed to send email' }, { status: 500 });
  }
}
