import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const generateTemplate = (title: string, subtitle: string, accentColor: string, contentHtml: string) => `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="background-color:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:40px 20px;line-height:1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#000;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a0a;border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;margin:0 auto;">
        <tr><td style="padding:48px 48px 32px;border-bottom:1px solid rgba(255,255,255,0.05);">
          <div style="font-size:32px;font-weight:800;letter-spacing:6px;color:${accentColor};text-shadow:0 0 20px ${accentColor}40;">VEKTOR</div>
          <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:3px;margin-top:8px;">${subtitle}</div>
        </td></tr>
        <tr><td style="padding:48px;color:#d4d4d4;font-size:16px;">${contentHtml}</td></tr>
        <tr><td style="padding:24px 48px;background:#050505;border-top:1px solid rgba(255,255,255,0.03);">
          <div style="font-size:11px;color:#333;">&copy; ${new Date().getFullYear()} VEKTOR Collective. All rights reserved.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

export async function POST(req: Request) {
  try {
    const { type, recipients, ccEmails, session } = await req.json();
    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients provided' }, { status: 400 });
    }
    const colors = { blue: '#3b82f6', green: '#10b981', red: '#ef4444', amber: '#f59e0b', purple: '#8b5cf6' };
    const accent = session.type === 'online' ? colors.blue : colors.green;
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || 'vektorprojects07@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD || 'nusr wbbv pftt efsw',
      },
    });

    const sessionDateFormatted = session.date && session.time
      ? new Date(`${session.date}T${session.time}:00`).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
      : 'TBD';

    let subject = '';
    let htmlContent = '';

    if (type === 'invite') {
      subject = `[CLASS] ${session.title} — ${sessionDateFormatted}`;
      const innerHtml = `
        <h2 style="font-size:24px;margin-bottom:24px;color:#fff;font-weight:500;">Class Scheduled, <span style="color:${accent};">Operative</span>.</h2>
        <p style="line-height:1.7;margin-bottom:24px;">A VEKTOR session has been scheduled. Your attendance is expected.</p>
        <div style="background:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.2);border-left:4px solid ${accent};padding:24px;border-radius:8px;margin:24px 0;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:${accent};font-weight:700;margin-bottom:12px;">Session Brief</div>
          <div style="font-size:22px;font-weight:600;color:#fff;margin-bottom:8px;">${session.title}</div>
          ${session.description ? `<div style="font-size:15px;color:#d4d4d4;line-height:1.7;margin-top:8px;">${session.description.replace(/\n/g,'<br>')}</div>` : ''}
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;border-collapse:separate;border-spacing:0 8px;">
          <tr><td style="background:rgba(139,92,246,0.05);border:1px solid rgba(139,92,246,0.2);border-left:4px solid ${colors.purple};padding:20px;border-radius:8px;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:${colors.purple};font-weight:700;margin-bottom:6px;">Date & Time</div>
            <div style="font-size:17px;font-weight:600;color:#fff;">${sessionDateFormatted}</div>
            ${session.duration ? `<div style="font-size:13px;color:#888;margin-top:4px;">Duration: ${session.duration} minutes</div>` : ''}
          </td></tr>
          ${session.type === 'online' && session.meetLink ? `<tr><td style="background:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.2);border-left:4px solid ${colors.blue};padding:20px;border-radius:8px;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:${colors.blue};font-weight:700;margin-bottom:6px;">Meeting Link</div>
            <a href="${session.meetLink}" style="font-size:15px;color:${colors.blue};">${session.meetLink}</a>
          </td></tr>` : ''}
          ${session.type === 'offline' && session.location ? `<tr><td style="background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.2);border-left:4px solid ${colors.green};padding:20px;border-radius:8px;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:${colors.green};font-weight:700;margin-bottom:6px;">Location</div>
            <div style="font-size:17px;font-weight:600;color:#fff;">${session.location}</div>
          </td></tr>` : ''}
          <tr><td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);padding:16px 20px;border-radius:8px;">
            <span style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#888;font-weight:700;">Format: </span>
            <span style="font-size:14px;color:#fff;font-weight:600;">${session.type === 'online' ? 'Online / Virtual' : 'Offline / In-Person'}</span>
          </td></tr>
        </table>
        ${session.tags && session.tags.length > 0 ? `<div style="margin-top:8px;">${session.tags.map((t:string)=>`<span style="display:inline-block;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);color:${colors.blue};font-size:11px;padding:3px 10px;border-radius:999px;margin-right:6px;text-transform:uppercase;">${t}</span>`).join('')}</div>` : ''}
        <p style="margin-top:32px;color:#a3a3a3;font-size:14px;">Mark your calendar. Attendance is mandatory. Stay synchronized.</p>`;
      htmlContent = generateTemplate('VEKTOR - Class Scheduled', 'Session Command', accent, innerHtml);

    } else if (type === 'update') {
      subject = `[UPDATED] Class Rescheduled: ${session.title}`;
      const innerHtml = `
        <h2 style="font-size:24px;margin-bottom:24px;color:#fff;font-weight:500;">Session Rescheduled, Operative.</h2>
        <p>The following class has been updated. Recalibrate your schedule accordingly.</p>
        <div style="background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.25);border-left:4px solid ${colors.amber};padding:24px;border-radius:8px;margin:24px 0;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:${colors.amber};font-weight:700;margin-bottom:8px;">Updated Session</div>
          <div style="font-size:20px;font-weight:600;color:#fff;margin-bottom:8px;">${session.title}</div>
          <div style="font-size:15px;color:#fff;font-weight:500;">${sessionDateFormatted}</div>
          ${session.type === 'online' && session.meetLink ? `<div style="margin-top:12px;font-size:13px;color:#888;">Meet: <a href="${session.meetLink}" style="color:${colors.blue};">${session.meetLink}</a></div>` : ''}
          ${session.type === 'offline' && session.location ? `<div style="margin-top:12px;font-size:13px;color:#888;">Location: <span style="color:#fff;">${session.location}</span></div>` : ''}
        </div>`;
      htmlContent = generateTemplate('VEKTOR - Session Updated', 'Session Command', colors.amber, innerHtml);

    } else if (type === 'cancelled') {
      subject = `[CANCELLED] Class Cancelled: ${session.title}`;
      const innerHtml = `
        <h2 style="font-size:24px;margin-bottom:24px;color:#fff;font-weight:500;">Session Cancelled, Operative.</h2>
        <p>The following VEKTOR session has been officially cancelled. Stand by for further transmissions.</p>
        <div style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.2);border-left:4px solid ${colors.red};padding:24px;border-radius:8px;margin:24px 0;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:${colors.red};font-weight:700;margin-bottom:8px;">Cancelled Session</div>
          <div style="font-size:14px;color:#888;">Originally: ${sessionDateFormatted}</div>
          ${session.cancelReason ? `<div style="font-size:14px;color:#fca5a5;margin-top:10px;padding:10px;background:rgba(239,68,68,0.1);border-radius:6px;border-left:3px solid #ef4444;"><b>Cancellation Reason:</b> ${session.cancelReason}</div>` : ''}
        </div>
        <p style="color:${colors.red};font-weight:600;text-transform:uppercase;letter-spacing:1px;">&gt; SESSION TERMINATED</p>`;
      htmlContent = generateTemplate('VEKTOR - Session Cancelled', 'Session Command', colors.red, innerHtml);
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const validCc = Array.isArray(ccEmails)
      ? ccEmails.filter(e => typeof e === 'string' && e.trim().length > 0 && e.includes('@'))
      : [];

    const sends = (recipients as { email: string; name: string }[]).map(r =>
      transporter.sendMail({
        from: `"VEKTOR Core" <${process.env.GMAIL_USER || 'vektorprojects07@gmail.com'}>`,
        to: r.email,
        cc: validCc.length > 0 ? validCc.join(',') : undefined,
        subject,
        html: htmlContent.replace(/Operative\./g, `${r.name || 'Operative'}.`),
      })
    );

    const results = await Promise.allSettled(sends);
    const failures = results.filter(res => res.status === 'rejected') as PromiseRejectedResult[];

    if (failures.length > 0) {
      console.error('Some class session emails failed:', failures.map(f => f.reason));
      if (failures.length === results.length) {
        throw new Error(failures[0]?.reason?.message || 'All email deliveries failed');
      }
    }

    return NextResponse.json({
      success: true,
      message: `Class emails sent: ${results.length - failures.length} succeeded, ${failures.length} failed.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Class email error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
