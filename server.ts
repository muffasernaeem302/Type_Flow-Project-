import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_VOICES = new Set(['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr']);

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error('GEMINI_API_KEY is not configured. Check your Settings > Secrets panel.');
    (err as Error & { status?: number }).status = 503;
    throw err;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractHttpStatus(err: unknown): number {
  if (err && typeof err === 'object') {
    const maybeStatus = (err as { status?: number; statusCode?: number }).status ??
      (err as { statusCode?: number }).statusCode;
    if (typeof maybeStatus === 'number' && maybeStatus >= 400 && maybeStatus < 600) {
      return maybeStatus;
    }
  }
  return 500;
}

function normalizeTypeableText(raw: string): string {
  return raw
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .trim();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Feature 3: AI 7-Day Trend & Bottleneck Analysis
  app.post('/api/ai/analyze-trends', async (req: Request, res: Response) => {
    try {
      const { weeklySummary, recentRuns, topWeakKeys, slowestWords } = req.body ?? {};

      if (!Array.isArray(recentRuns) || recentRuns.length === 0) {
        res.status(400).json({ error: 'Complete at least one typing session before running trend analysis.' });
        return;
      }

      const ai = getGeminiClient();

      const promptPayload = JSON.stringify({
        weeklySummary,
        recentRuns: recentRuns.slice(0, 20),
        topWeakKeys: Array.isArray(topWeakKeys) ? topWeakKeys.slice(0, 12) : [],
        slowestWords: Array.isArray(slowestWords) ? slowestWords.slice(0, 10) : [],
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analyze this typist's 7-day performance telemetry and recent runs:\n${promptPayload}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are an expert typing coach analyzing real user WPM, accuracy, cadence consistency, weak keys, and word hesitation telemetry. Be concise, specific to the numbers provided, and never invent data. Keep headline under 16 words, bottleneck under 35 words, and give exactly 3 concrete drill steps.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: {
                type: Type.STRING,
                description: 'Concise 1-sentence summary of the user trajectory.',
              },
              bottleneck: {
                type: Type.STRING,
                description: 'Primary speed, accuracy, consistency, or finger bottleneck spotted in the metrics.',
              },
              actionPlan: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Three concrete next training recommendations.',
              },
              recommendedMode: {
                type: Type.STRING,
                description: 'One of: weak_keys, words, time, dictation',
              },
              focusKeys: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Up to 5 single characters/keys to target next.',
              },
            },
            required: ['headline', 'bottleneck', 'actionPlan', 'recommendedMode', 'focusKeys'],
          },
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);
      res.json(parsed);
    } catch (err) {
      console.error('AI analyze-trends error:', err);
      const status = extractHttpStatus(err);
      const message = err instanceof Error ? err.message : 'Unable to analyze trends right now.';
      res.status(status).json({ error: message });
    }
  });

  // Feature 5: AI Audio Dictation Passage + TTS Generation
  app.post('/api/ai/dictation', async (req: Request, res: Response) => {
    try {
      const {
        topic = '',
        difficulty = 'medium',
        voiceName = 'Kore',
        customText = '',
      } = req.body ?? {};

      const safeVoice = ALLOWED_VOICES.has(voiceName) ? voiceName : 'Kore';
      const safeDifficulty =
        difficulty === 'easy' || difficulty === 'hard' ? difficulty : 'medium';

      const ai = getGeminiClient();

      let passageTitle = 'Audio Dictation Drill';
      let passageAuthor = `Voice: ${safeVoice}`;
      let passageContent = typeof customText === 'string' ? normalizeTypeableText(customText) : '';

      if (!passageContent) {
        const wordTarget =
          safeDifficulty === 'easy' ? '22 to 28' : safeDifficulty === 'hard' ? '38 to 48' : '30 to 38';
        const topicPrompt =
          typeof topic === 'string' && topic.trim()
            ? `Topic: "${topic.trim().slice(0, 100)}".`
            : 'Choose an engaging topic from technology, science, everyday storytelling, or philosophy.';

        const textResponse = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `${topicPrompt} Difficulty: ${safeDifficulty}. Length: ${wordTarget} words. Write a clear, natural paragraph ideal for audio dictation typing practice. Use standard ASCII punctuation only (no markdown, bullets, emojis, numbers as digits unless natural, or curly quotes).`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              'You create crisp, spoken-word dictation passages for typing practice. Output clean prose that sounds natural when read aloud and has no formatting symbols.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: 'Short 3-6 word title for the dictation passage.',
                },
                content: {
                  type: Type.STRING,
                  description: 'The clean spoken passage text to dictate and type.',
                },
              },
              required: ['title', 'content'],
            },
          },
        });

        const parsedPassage = JSON.parse((textResponse.text ?? '{}').trim());
        passageTitle = parsedPassage.title ? String(parsedPassage.title).trim() : 'AI Dictation';
        passageContent = normalizeTypeableText(String(parsedPassage.content || ''));
      }

      if (!passageContent) {
        res.status(500).json({ error: 'Generated dictation passage was empty. Please try again.' });
        return;
      }

      const ttsResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: passageContent,
                speechMetadata: {
                  style: 'Clear, articulate, steady dictation pace with natural phrasing',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: safeVoice },
            },
          },
        },
      });

      const base64Audio =
        ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        res.status(502).json({ error: 'Audio synthesis did not return playable audio. Please try again.' });
        return;
      }

      res.json({
        passage: {
          id: `dictation-${Date.now()}`,
          title: passageTitle,
          author: passageAuthor,
          difficulty: safeDifficulty,
          category: 'dictation',
          content: passageContent,
        },
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
        voiceName: safeVoice,
      });
    } catch (err) {
      console.error('AI dictation error:', err);
      const status = extractHttpStatus(err);
      const message = err instanceof Error ? err.message : 'Unable to generate dictation audio.';
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TypeFlow server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start TypeFlow server:', err);
  process.exit(1);
});
