import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SYSTEM_INSTRUCTION = `
You are the Communications Intelligence AI for VEKTOR, an elite student engineering and technology collective at Thapar Institute of Engineering & Technology, Patiala.
VEKTOR core ethos: "We Don't Hire. We Select.", "Execution over everything", futuristic, disciplined, high-velocity, razor-sharp, uncompromising standards.

Your task is to write emails for the VEKTOR Admin Comms Studio.
Each email must strictly follow the VEKTOR aesthetic:
1. Tone: Depending on the requested tone, write with precision, authority, and clarity. Avoid cheesy corporate fluff or generic buzzwords.
2. Dynamic Variable: Use '{{name}}' wherever the applicant or recipient's name should appear, so our automated pipeline can substitute it for each recipient.
3. Templates: Choose the single best fitting templateType out of:
   - "general": For status updates, briefings, community announcements, and cohort-wide messages (Theme: Cyan/Blue).
   - "warning": For urgent actions required, missing documentation/repo links, immediate deadlines, compliance flags (Theme: Amber).
   - "reminder": For interview reminders, upcoming temporal checkpoints, evaluation warnings (Theme: Violet/Purple).
   - "success": For acceptance, stage cleared, invitation to next phase, onboarding coordinates (Theme: Emerald Green).
   - "rejected": For constructive rejection formulated with dignity, encouraging continuous iteration and future attempts (Theme: Red).
   - "custom": For open-ended specialized transmissions or custom announcements.

Output must be STRICT JSON with the following schema:
{
  "subject": "Clear, impactful email subject line",
  "body": "Formatted email body text. Use newlines between paragraphs. Include {{name}} placeholder.",
  "templateType": "general" | "warning" | "reminder" | "success" | "rejected" | "custom",
  "explanation": "Brief 1-sentence note explaining the tone and template choice"
}
`;

const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
];

async function callGemini(apiKey: string, promptText: string) {
  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: promptText }]
            }
          ],
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }]
          },
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          }
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const message = errJson?.error?.message || `Model ${model} returned HTTP ${res.status}`;
        
        // If authentication or permission fails, do not mask it by trying further models
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          throw new Error(message);
        }

        lastError = message;
        continue;
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        return JSON.parse(rawText);
      }
    } catch (err: any) {
      // If it's an auth error thrown explicitly, rethrow immediately
      if (err.message && (err.message.includes('API key') || err.message.includes('API_KEY'))) {
        throw err;
      }
      lastError = err.message || err;
    }
  }

  throw new Error(lastError || 'All Gemini candidate models failed to generate content.');
}

export async function POST(req: Request) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: 'GEMINI_API_KEY is not configured on the production server. Please ensure GEMINI_API_KEY is configured in your deployment environment variables.'
      }, { status: 500 });
    }

    const { prompt, tone, targetAudience, currentSubject, currentBody, mode } = await req.json();

    if (!prompt && mode !== 'polish') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    let userPrompt = '';
    if (mode === 'polish') {
      userPrompt = `Please polish and elevate this existing draft into the high-standard VEKTOR style.
Target Audience: ${targetAudience || 'Applicants'}
Tone Requirement: ${tone || 'VEKTOR Elite & Authoritative'}
Current Subject: ${currentSubject || '(none)'}
Current Body:
${currentBody || '(empty)'}

Additional Instructions: ${prompt || 'Make it sharper, authoritative, well-structured, and ensure {{name}} is used.'}
`;
    } else {
      userPrompt = `Generate a VEKTOR email based on the following instructions:
Request / Purpose: ${prompt}
Target Audience: ${targetAudience || 'All applicants'}
Desired Tone: ${tone || 'VEKTOR Elite & Authoritative'}
`;
    }

    const result = await callGemini(apiKey, userPrompt);

    return NextResponse.json({
      success: true,
      subject: result.subject || 'VEKTOR Core Transmission',
      body: result.body || '',
      templateType: result.templateType || 'general',
      explanation: result.explanation || ''
    });

  } catch (error: any) {
    console.error('Gemini Generation Error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to generate transmission with Gemini'
    }, { status: 500 });
  }
}
