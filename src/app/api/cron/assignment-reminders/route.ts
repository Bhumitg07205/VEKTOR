import { NextResponse } from 'next/server';

// Vercel Cron Job: runs daily at 9am UTC
// Checks all active assignments past their due date and sends reminders to non-submitters
export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow if no secret is set (development) or if it matches
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Fetch all assignments from our internal API
    // We call the Firebase admin SDK here via our existing DB functions
    // Since this is server-side, we import directly
    const { getAssignments, getSubmissionsForAssignment } = await import('@/lib/firebase/db');
    const { getApplicants } = await import('@/lib/firebase/db');

    const [assignments, allApplicants] = await Promise.all([
      getAssignments(),
      getApplicants(),
    ]);

    const members = allApplicants.filter(a => a.status === 'Accepted' && a.email);
    const now = new Date();
    let totalReminders = 0;

    for (const assignment of assignments) {
      if (!assignment.isActive) continue;
      const dueDate = new Date(assignment.dueDate);
      // Only send reminders for assignments due in the future or up to 3 days past
      const daysPast = (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysPast > 3) continue;

      // Get submissions for this assignment
      const submissions = await getSubmissionsForAssignment(assignment.id);
      const submittedEmails = new Set(submissions.map(s => s.memberEmail.toLowerCase()));

      // Determine recipients
      let targetMembers = members;
      if (assignment.recipientType === 'specific' && assignment.specificRecipients.length > 0) {
        targetMembers = members.filter(m => assignment.specificRecipients.includes(m.email));
      }

      // Filter to non-submitters only
      const nonSubmitters = targetMembers.filter(m => !submittedEmails.has(m.email.toLowerCase()));

      if (nonSubmitters.length === 0) continue;

      // Fire reminder email
      await fetch(`${baseUrl}/api/send-assignment-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'reminder',
          recipients: nonSubmitters.map(m => ({ email: m.email, name: m.name })),
          ccEmails: assignment.ccAdmins || [],
          assignment: {
            title: assignment.title,
            description: assignment.description,
            dueDate: assignment.dueDate,
            submissionLink: assignment.submissionLink,
          },
        }),
      });

      totalReminders += nonSubmitters.length;
    }

    return NextResponse.json({
      success: true,
      message: `Auto-reminder cron complete. Sent ${totalReminders} reminder emails.`,
      timestamp: now.toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Cron error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
