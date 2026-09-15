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
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #0a0a0a; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; overflow: hidden; margin: 0 auto; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
          <tr>
            <td style="padding: 48px 48px 32px 48px; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: left;">
              <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; margin-bottom: 8px; color: ${accentColor}; text-shadow: 0 0 20px ${accentColor}40;">VEKTOR</div>
              <div style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">${subtitle}</div>
            </td>
          </tr>
          <tr><td style="padding: 48px; color: #d4d4d4; font-size: 16px;">${contentHtml}</td></tr>
          <tr>
            <td style="padding: 32px 48px; background-color: #050505; border-top: 1px solid rgba(255,255,255,0.03);">
              <div style="font-size: 12px; color: #555555; text-transform: uppercase; letter-spacing: 1px;">VEKTOR Core Autonomous Systems</div>
              <div style="margin-top: 8px; font-size: 11px; color: #333333;">&copy; ${new Date().getFullYear()} VEKTOR Collective. All rights reserved.</div>
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
    const { type, recipients, ccEmails, assignment, attachments } = await req.json();
    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients provided' }, { status: 400 });
    }
    const colors = { orange: '#f97316', amber: '#f59e0b', green: '#10b981', red: '#ef4444', blue: '#3b82f6' };
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || 'vektorprojects07@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD || 'nusr wbbv pftt efsw',
      },
    });

    // Parse attachments identical to Comms Studio (/api/send-bulk-email) with URL/path fallback
    const rawAttachments = (Array.isArray(attachments) && attachments.length > 0)
      ? attachments
      : (Array.isArray(assignment?.attachments) && assignment.attachments.length > 0)
        ? assignment.attachments
        : (Array.isArray(assignment?.attachmentUrls) && assignment.attachmentUrls.length > 0)
          ? assignment.attachmentUrls
          : [];

    const mailAttachments = rawAttachments.length > 0
      ? rawAttachments.map((att: any) => {
          const filename = att.filename || att.name || 'attachment.pdf';
          const contentType = att.contentType || att.type || 'application/octet-stream';
          if (att.content || att.base64) {
            const rawContent = att.content || att.base64;
            return {
              filename,
              content: Buffer.from(rawContent.replace(/^data:.*?;base64,/, ''), 'base64'),
              contentType,
            };
          }
          if (att.url || att.path) {
            return {
              filename,
              path: att.url || att.path,
              contentType,
            };
          }
          return null;
        }).filter(Boolean)
      : undefined;

    const dueDateFormatted = assignment?.dueDate
      ? new Date(assignment.dueDate).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: 'UTC' })
      : 'No deadline specified';

    let subject = '';
    let htmlContent = '';

    if (type === 'announce' || type === 'update') {
      const isUpdate = type === 'update';
      const accent = isUpdate ? colors.blue : colors.orange;
      subject = isUpdate ? `[UPDATED] Directive Modified: ${assignment.title}` : `[ASSIGNMENT] ${assignment.title}`;
      const innerHtml = `
        <h2 style="font-size:24px;margin-bottom:24px;color:#fff;font-weight:500;">
          ${isUpdate ? 'Directive Updated, <span style="color:' + colors.blue + ';">Operative</span>.' : 'New Assignment Deployed, <span style="color:' + colors.orange + ';">Operative</span>.'}
        </h2>
        <p style="margin-bottom:24px;line-height:1.7;">
          ${isUpdate ? 'The specifications for this directive have been updated by VEKTOR Core. Verify your deliverables accordingly.' : 'The following directive has been issued by VEKTOR Core. Your execution is expected.'}
        </p>
        <div style="background:${isUpdate ? 'rgba(59,130,246,0.05)' : 'rgba(249,115,22,0.05)'};border:1px solid ${isUpdate ? 'rgba(59,130,246,0.25)' : 'rgba(249,115,22,0.25)'};border-left:4px solid ${accent};padding:24px;border-radius:8px;margin:24px 0;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:${accent};font-weight:700;margin-bottom:8px;">${isUpdate ? 'Updated Directive' : 'Directive'}</div>
          <div style="font-size:20px;font-weight:600;color:#fff;margin-bottom:12px;">${assignment.title}</div>
          <div style="font-size:15px;color:#d4d4d4;line-height:1.7;">${assignment.description.replace(/\n/g,'<br>')}</div>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;border-collapse:separate;border-spacing:0 8px;">
          <tr><td style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.2);border-left:4px solid ${colors.red};padding:20px;border-radius:8px;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:${colors.red};font-weight:700;margin-bottom:6px;">Deadline</div>
            <div style="font-size:17px;font-weight:600;color:#fff;">${dueDateFormatted}</div>
          </td></tr>
          ${assignment.submissionLink ? `<tr><td style="background:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.2);border-left:4px solid ${colors.blue};padding:20px;border-radius:8px;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:${colors.blue};font-weight:700;margin-bottom:6px;">Submission Portal</div>
            <a href="${assignment.submissionLink}" style="font-size:15px;color:${colors.blue};text-decoration:none;">${assignment.submissionLink}</a>
          </td></tr>` : ''}
        </table>
        ${((assignment.attachmentUrls && assignment.attachmentUrls.length > 0) || (mailAttachments && mailAttachments.length > 0)) ? `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:20px;margin:24px 0;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#a3a3a3;font-weight:700;margin-bottom:12px;">Attached Materials & Briefs (${(assignment.attachmentUrls || mailAttachments).length})</div>
          ${assignment.attachmentUrls && assignment.attachmentUrls.length > 0
            ? assignment.attachmentUrls.map((att: { name: string; url: string }) => `
              <div style="margin-bottom:8px;">
                <a href="${att.url || '#'}" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;text-decoration:none;font-size:14px;font-weight:600;">
                  📎 ${att.name} &rarr;
                </a>
              </div>
            `).join('')
            : (mailAttachments || []).map((att: any) => `
              <div style="margin-bottom:8px;color:#e5e5e5;font-size:14px;font-weight:500;">
                📎 ${att.filename}
              </div>
            `).join('')
          }
        </div>` : ''}
        ${assignment.tags && assignment.tags.length > 0 ? `
        <div style="margin-top:16px;">
          ${assignment.tags.map((t: string) => `<span style="display:inline-block;background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.3);color:${colors.orange};font-size:11px;padding:3px 10px;border-radius:999px;margin-right:6px;letter-spacing:1px;text-transform:uppercase;">${t}</span>`).join('')}
        </div>` : ''}
        <p style="margin-top:32px;color:#a3a3a3;font-size:14px;">Complete the directive before the deadline. Stay sharp.</p>`;
      htmlContent = generateTemplate(isUpdate ? 'VEKTOR - Directive Updated' : 'VEKTOR - Assignment', 'Directive System', accent, innerHtml);

    } else if (type === 'reminder') {
      subject = `[REMINDER] Pending: ${assignment.title}`;
      const innerHtml = `
        <h2 style="font-size:24px;margin-bottom:24px;color:#fff;font-weight:500;">Reminder: Submission Pending, Operative.</h2>
        <p style="margin-bottom:24px;line-height:1.7;">Our systems detect you have <b style="color:${colors.amber};">not yet submitted</b> this directive. The deadline is approaching.</p>
        <div style="background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.25);border-left:4px solid ${colors.amber};padding:24px;border-radius:8px;margin:24px 0;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:${colors.amber};font-weight:700;margin-bottom:8px;">Pending Directive</div>
          <div style="font-size:20px;font-weight:600;color:#fff;margin-bottom:8px;">${assignment.title}</div>
          <div style="font-size:13px;color:#888;">Deadline: <span style="color:${colors.red};font-weight:600;">${dueDateFormatted}</span></div>
        </div>
        ${((assignment.attachmentUrls && assignment.attachmentUrls.length > 0) || (mailAttachments && mailAttachments.length > 0)) ? `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;margin:16px 0;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#a3a3a3;font-weight:700;margin-bottom:8px;">Materials</div>
          ${assignment.attachmentUrls && assignment.attachmentUrls.length > 0
            ? assignment.attachmentUrls.map((att: { name: string; url: string }) => `
              <div style="margin-bottom:4px;"><a href="${att.url || '#'}" target="_blank" style="color:#38bdf8;text-decoration:none;font-size:13px;">📎 ${att.name}</a></div>
            `).join('')
            : (mailAttachments || []).map((att: any) => `
              <div style="margin-bottom:4px;color:#e5e5e5;font-size:13px;">📎 ${att.filename}</div>
            `).join('')
          }
        </div>` : ''}
        ${assignment.submissionLink ? `<div style="margin-top:24px;text-align:center;"><a href="${assignment.submissionLink}" style="display:inline-block;background:${colors.amber};color:#000;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:1px;text-transform:uppercase;">Submit Now</a></div>` : ''}
        <p style="margin-top:32px;color:#a3a3a3;font-size:14px;">Automated reminder from VEKTOR Core. Act now.</p>`;
      htmlContent = generateTemplate('VEKTOR - Reminder', 'Directive System', colors.amber, innerHtml);

    } else if (type === 'submission_confirmed') {
      subject = `[CONFIRMED] Submission Received: ${assignment.title}`;
      const innerHtml = `
        <h2 style="font-size:24px;margin-bottom:24px;color:#fff;font-weight:500;">Submission Confirmed, Operative.</h2>
        <p>Your submission for the directive has been logged by VEKTOR Core systems.</p>
        <div style="background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.2);border-left:4px solid ${colors.green};padding:24px;border-radius:8px;margin:24px 0;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:${colors.green};font-weight:700;margin-bottom:8px;">Directive</div>
          <div style="font-size:20px;font-weight:600;color:#fff;">${assignment.title}</div>
        </div>
        <p style="color:${colors.green};font-weight:600;font-size:14px;letter-spacing:1px;text-transform:uppercase;">&gt; SUBMISSION LOGGED</p>`;
      htmlContent = generateTemplate('VEKTOR - Submission Confirmed', 'Directive System', colors.green, innerHtml);
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const validCc = Array.isArray(ccEmails)
      ? ccEmails.filter(e => typeof e === 'string' && e.trim().length > 0 && e.includes('@'))
      : [];

    const sendPromises = (recipients as { email: string; name: string }[]).map(r =>
      transporter.sendMail({
        from: `"VEKTOR Core" <${process.env.GMAIL_USER || 'vektorprojects07@gmail.com'}>`,
        to: r.email,
        cc: validCc.length > 0 ? validCc.join(',') : undefined,
        subject,
        html: htmlContent.replace(/Operative\./g, `${r.name || 'Operative'}.`),
        attachments: mailAttachments && mailAttachments.length > 0 ? (mailAttachments as any) : undefined,
      })
    );

    const results = await Promise.allSettled(sendPromises);
    const failures = results.filter(res => res.status === 'rejected') as PromiseRejectedResult[];

    if (failures.length > 0) {
      console.error('Some assignment emails failed:', failures.map(f => f.reason));
      if (failures.length === results.length) {
        throw new Error(failures[0]?.reason?.message || 'All email deliveries failed');
      }
    }

    return NextResponse.json({
      success: true,
      message: `Emails sent: ${results.length - failures.length} succeeded, ${failures.length} failed.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Assignment email error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
