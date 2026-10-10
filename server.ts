import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side Gemini initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Multi-Agent GD Next Turn Endpoint
app.post('/api/gd/turn', async (req, res) => {
  try {
    const {
      topic,
      format,
      languageMode,
      participants,
      stage,
      transcript,
      userName = 'Candidate',
      lastUserSpokeAgoSeconds = 0,
      targetSpeakerId,
    } = req.body;

    const transcriptText = Array.isArray(transcript) && transcript.length > 0
      ? transcript
          .slice(-12)
          .map((t: any) => `[${t.speakerName || 'Speaker'}]: ${t.text}`)
          .join('\n')
      : 'No prior turns yet. Discussion is starting.';

    const participantsList = participants
      .map((p: any) => `- ID: "${p.id}", Name: "${p.name}", Role: "${p.archetype}", Personality: "${p.persona}"`)
      .join('\n');

    let stageInstruction = '';
    if (stage === 'intro') {
      stageInstruction = `The current stage is "INTRO". The moderator MUST speak first to introduce the topic, explain the 3-minute/5-minute time limit, set ground rules (no personal attacks, clear logic, inclusive floor), and give 30 seconds for candidates to structure their thoughts or invite someone to begin.`;
    } else if (stage === 'summary') {
      stageInstruction = `The current stage is "SUMMARY/CLOSING ROUND". Time is almost up. Either the moderator invites closing remarks or one candidate gives their crisp 15-20 second final synthesis. Make sure they do NOT introduce brand new arguments, but summarize key trade-offs.`;
    } else {
      stageInstruction = `The current stage is "ACTIVE DISCUSSION". Candidates should actively engage with what the previous speakers said, cite names ("As Rohan mentioned...", "While I agree with Ananya's data..."), challenge points respectfully, and present fresh angles.
If the candidate (${userName}) hasn't spoken in a while (${lastUserSpokeAgoSeconds > 40 ? 'over 40 seconds' : 'recently'}), a diplomatic or analytical peer may occasionally prompt them ("What are your thoughts on this, ${userName}?").`;
    }

    const languageInstruction =
      languageMode === 'hinglish'
        ? 'Language Style: Hinglish (Natural Indian campus mix of English with casual Hindi conversational phrases like "Ground reality dekhein toh...", "I totally agree with that point ya", "Haan bilkul, but let\'s look at implementation", "Sahi baat hai, but..."). Keep it highly authentic to Indian top colleges/B-Schools.'
        : 'Language Style: Professional, sharp campus placement English. Conversational, not scripted or essay-like. Short, punchy turns (25-45 words).';

    const systemInstruction = `You are the AI conversation coordinator for a hyper-realistic Campus Placement Group Discussion (GD) simulation.
You have a panel of distinct candidate archetypes and a moderator.

Topic: "${topic?.title || 'Group Discussion Topic'}"
Category: ${topic?.category || 'General'}
Topic Context: "${topic?.description || ''}"
Format: ${format || 'Standard'}
Candidate (User): "${userName}"

Roster of AI participants:
${participantsList}

${stageInstruction}
${languageInstruction}

IMPORTANT RULES:
1. Choose ONE AI participant from the roster who naturally would jump in next. ${targetSpeakerId ? `Specifically, make participant ID "${targetSpeakerId}" speak.` : 'Do NOT pick the same speaker who just spoke last.'}
2. The speech should sound completely natural: 1 to 3 spoken sentences (between 25 and 55 words max). Keep it conversational, spontaneous, with authentic spoken flow (e.g. slight conversational transitions: "Look,", "I see where you are coming from, but...", "That's a valid metric, yet...").
3. They MUST acknowledge or build upon what previous speakers said, referring to other participants by name.
4. Output valid JSON adhering to the schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Recent Transcript:\n${transcriptText}\n\nDecide the next turn and output the JSON response.`,
      config: {
        systemInstruction,
        temperature: 0.85,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            speakerId: { type: Type.STRING, description: 'ID of the chosen speaker from the roster' },
            speakerName: { type: Type.STRING, description: 'Name of chosen speaker' },
            text: { type: Type.STRING, description: 'The exact spoken line (25-50 words)' },
            emotion: { type: Type.STRING, description: 'Speaking tone: assertive, analytical, diplomatic, skeptical, provocative, or moderating' },
            directReplyTo: { type: Type.STRING, description: 'Name of the participant they are directly addressing or referencing, or null' },
            involvesUser: { type: Type.BOOLEAN, description: 'True if this turn asks or directly invites the user' },
            thoughtProcess: { type: Type.STRING, description: 'Brief reason why this participant jumps in now' },
          },
          required: ['speakerId', 'speakerName', 'text', 'emotion'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/gd/turn:', err);
    res.status(500).json({ error: err.message || 'Failed to generate GD turn' });
  }
});

// Text-to-Speech Endpoint using gemini-3.8-flash-lite-tts
app.post('/api/gd/tts', async (req, res) => {
  try {
    const { text, voice = 'Puck', speakerRole = 'candidate' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    // Supported prebuilt voices: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    const allowedVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const chosenVoice = allowedVoices.includes(voice) ? voice : 'Puck';

    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.slice(0, 400),
              speechMetadata: {
                style: speakerRole === 'moderator' ? 'Calm, authoritative, professional moderator' : 'Natural, conversational, engaging participant',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (base64Audio) {
      return res.json({
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
        voiceUsed: chosenVoice,
      });
    }

    return res.status(500).json({ error: 'No audio returned from Gemini TTS', fallback: true });
  } catch (err: any) {
    console.warn('TTS error (falling back to client synthesis):', err?.message);
    res.status(500).json({ error: err.message || 'TTS generation failed', fallback: true });
  }
});

// Comprehensive Post-GD Feedback Endpoint
app.post('/api/gd/feedback', async (req, res) => {
  try {
    const {
      topic,
      userName = 'Candidate',
      durationSeconds = 300,
      transcript = [],
      speakingMetrics = {},
    } = req.body;

    const fullTranscriptFormatted = transcript
      .map((t: any, idx: number) => `[Turn ${idx + 1} | ${t.timestamp || '0:00'}] ${t.speakerName} (${t.isUser ? 'USER/CANDIDATE' : 'AI'}): "${t.text}"`)
      .join('\n');

    const systemInstruction = `You are a Senior Campus Placement Evaluator and IIM/Top-tier B-School GD Assessor.
You are evaluating candidate "${userName}" on their performance in a competitive Group Discussion.

Topic: "${topic?.title}"
Topic Scope: "${topic?.description}"
Duration: ${durationSeconds} seconds
Candidate Speaking Stats:
- Total Candidate Turns: ${speakingMetrics?.userTurnsCount || 0}
- Candidate Spoken Seconds: ${speakingMetrics?.userSpokenDuration || 0}
- Interruptions initiated: ${speakingMetrics?.interruptionsCount || 0}
- Estimated Share of Airtime: ${speakingMetrics?.userAirtimePercentage || 0}%

CRITICAL ASSESSMENT GUIDELINES:
1. Be radically honest, constructive, and highly specific to campus recruitment standards (e.g. Day 1 placement drives at consulting, FMCG, banking, tech firms).
2. EVERY strength and weakness MUST be backed by a direct verbatim quote from the transcript, with the turn index and timestamp.
3. Provide a dedicated "What You Could Have Said" section with 3 tactical missed opportunities where the candidate remained silent or had a weak entry, providing the exact model phrasing they could have deployed.
4. Score the candidate across 6 core criteria on a scale of 0 to 100:
   - Initiation & First Impression (0-100)
   - Content Depth & Structured Thinking (MECE, PESTLE, Root-Cause) (0-100)
   - Active Listening & Building on Peers (0-100)
   - Assertiveness & Floor Control (0-100)
   - Articulation & Communication Impact (0-100)
   - Conclusion & Synthesis Ability (0-100)
5. Provide a realistic Placement Verdict: "Selected for PI", "Borderline / Waitlist", or "Not Recommended / Needs Work".`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Here is the full transcript of the discussion:\n\n${fullTranscriptFormatted}\n\nEvaluate ${userName}'s performance in detail according to the JSON schema.`,
      config: {
        systemInstruction,
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.INTEGER, description: 'Overall GD score from 0 to 100' },
            percentile: { type: Type.INTEGER, description: 'Percentile benchmark compared to campus cohort (e.g., 82)' },
            verdict: { type: Type.STRING, description: '"Selected for Personal Interview", "Borderline / Waitlist", or "Not Selected"' },
            summaryAssessment: { type: Type.STRING, description: 'Executive summary paragraph of candidate performance' },
            criteriaScores: {
              type: Type.OBJECT,
              properties: {
                initiation: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER },
                    feedback: { type: Type.STRING },
                    quotedEvidence: { type: Type.STRING },
                  },
                  required: ['score', 'feedback'],
                },
                contentDepth: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER },
                    feedback: { type: Type.STRING },
                    frameworksIdentified: { type: Type.ARRAY, items: { type: Type.STRING } },
                    quotedEvidence: { type: Type.STRING },
                  },
                  required: ['score', 'feedback'],
                },
                activeListening: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER },
                    feedback: { type: Type.STRING },
                    quotedEvidence: { type: Type.STRING },
                  },
                  required: ['score', 'feedback'],
                },
                assertiveness: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER },
                    feedback: { type: Type.STRING },
                    quotedEvidence: { type: Type.STRING },
                  },
                  required: ['score', 'feedback'],
                },
                articulation: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER },
                    feedback: { type: Type.STRING },
                    quotedEvidence: { type: Type.STRING },
                  },
                  required: ['score', 'feedback'],
                },
                synthesisAndConclusion: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER },
                    feedback: { type: Type.STRING },
                    quotedEvidence: { type: Type.STRING },
                  },
                  required: ['score', 'feedback'],
                },
              },
              required: ['initiation', 'contentDepth', 'activeListening', 'assertiveness', 'articulation', 'synthesisAndConclusion'],
            },
            keyStrengths: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  analysis: { type: Type.STRING },
                  quote: { type: Type.STRING },
                  timestamp: { type: Type.STRING },
                },
                required: ['title', 'analysis', 'quote'],
              },
            },
            criticalImprovements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  critique: { type: Type.STRING },
                  quote: { type: Type.STRING },
                  timestamp: { type: Type.STRING },
                },
                required: ['title', 'critique'],
              },
            },
            missedOpportunitiesReplay: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timestamp: { type: Type.STRING },
                  roomContext: { type: Type.STRING, description: 'What other candidates were saying at this moment' },
                  missedOpening: { type: Type.STRING, description: 'Why this was a prime strategic window to intervene' },
                  suggestedIntervention: { type: Type.STRING, description: 'Verbatim phrasing candidate could have spoken' },
                  strategicRationale: { type: Type.STRING, description: 'Why this phrased intervention would impress interviewers' },
                },
                required: ['timestamp', 'roomContext', 'missedOpening', 'suggestedIntervention', 'strategicRationale'],
              },
            },
            interviewerNote: { type: Type.STRING, description: 'Confidential evaluator note from panel head' },
          },
          required: [
            'overallScore',
            'percentile',
            'verdict',
            'summaryAssessment',
            'criteriaScores',
            'keyStrengths',
            'criticalImprovements',
            'missedOpportunitiesReplay',
          ],
        },
      },
    });

    const report = JSON.parse(response.text || '{}');
    res.json(report);
  } catch (err: any) {
    console.error('Error generating feedback report:', err);
    res.status(500).json({ error: err.message || 'Failed to generate feedback report' });
  }
});

// Real-time Silent Coach Nudge Endpoint (lightweight & fast)
app.post('/api/gd/nudge', async (req, res) => {
  try {
    const { transcript, lastUserSpokeAgoSeconds, topic, userAirtimePercentage } = req.body;
    const recent = (transcript || []).slice(-4).map((t: any) => `${t.speakerName}: "${t.text}"`).join(' | ');

    const prompt = `Give ONE crisp, 8-15 word tactical coaching nudge to the user who is currently in a live GD on "${topic?.title}".
User's airtime share is ${userAirtimePercentage}%. User has not spoken for ${lastUserSpokeAgoSeconds} seconds.
Recent dialogue snippet: ${recent}.
Examples of nudges:
- "Jump in now: agree with Ananya's point on cost, then add the regulatory risk."
- "Floor is opening up! State a quick concrete metric."
- "Rohan is dominating. Politely interrupt: 'If I can add a quick dimension...'"
Return JSON with { "nudge": "..." }`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nudge: { type: Type.STRING },
            urgency: { type: Type.STRING, description: 'low, medium, high' },
          },
          required: ['nudge'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    res.json({ nudge: 'Look for an opportunity to synthesize recent points with a fresh example.', urgency: 'medium' });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GDPrep Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
