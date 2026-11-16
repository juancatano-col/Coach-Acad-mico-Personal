import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { buildCoachPayload, validateDecisionTimeWindow } from './src/utils/prioritizer.ts';
import { SYSTEM_PROMPT_TEXT } from './src/data/seedData.ts';
import type { AcademicTask, CoachDecision, StudentContextState } from './src/types/coach.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const configured = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');
    res.json({ ok: true, geminiConfigured: configured });
  });

  app.post('/api/coach', async (req, res) => {
    try {
      const { message, contextState, tasks } = req.body as {
        message?: string;
        contextState?: StudentContextState;
        tasks?: AcademicTask[];
      };

      if (!message || !message.trim()) {
        res.status(400).json({
          error: 'Escribe un mensaje describiendo tu nivel de energía o tiempo disponible.',
        });
        return;
      }

      if (!contextState || !Array.isArray(tasks)) {
        res.status(400).json({
          error: 'Falta el contexto del estudiante o la lista de tareas.',
        });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'No hay una clave GEMINI_API_KEY activa en el servidor. Configúrala en Settings > Secrets o usa "Evaluar con Reglas Locales" para probar la lógica determinista.',
        });
        return;
      }

      const payload = buildCoachPayload(contextState, tasks, message);

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analiza el siguiente estado en tiempo real (formato ISO 8601 America/Bogota UTC-5) y entrega la única micro-instrucción cerrada en JSON:\n\n${JSON.stringify(payload, null, 2)}`,
        config: {
          systemInstruction: SYSTEM_PROMPT_TEXT,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              selectedTaskId: {
                type: Type.STRING,
                description: 'ID de la única tarea elegida, o cadena vacía si debe descansar.',
              },
              selectedTaskTitle: {
                type: Type.STRING,
                description: 'Título de la tarea elegida, o vacío si descansa.',
              },
              selectedCourse: {
                type: Type.STRING,
                description: 'Curso de la tarea elegida.',
              },
              selectedLoad: {
                type: Type.STRING,
                description: 'high, medium, low, o none si descansa.',
              },
              blockStart: {
                type: Type.STRING,
                description: 'Hora de inicio en formato HH:MM (24h America/Bogota).',
              },
              blockEnd: {
                type: Type.STRING,
                description: 'Hora de fin en formato HH:MM (24h America/Bogota, nunca mayor a 22:30 si es noche).',
              },
              assignedMinutes: {
                type: Type.INTEGER,
                description: 'Minutos netos asignados al bloque.',
              },
              breakMinutes: {
                type: Type.INTEGER,
                description: 'Minutos de pausa Pomodoro (0 o 5).',
              },
              cutoffProtected: {
                type: Type.BOOLEAN,
                description: 'True si se recortó o detuvo por el límite nocturno de las 22:30.',
              },
              ruleApplied: {
                type: Type.STRING,
                description: 'Regla de negocio aplicada en una frase breve.',
              },
              instructionMessage: {
                type: Type.STRING,
                description: 'Instrucción única cerrada, directa y empática para mostrar al estudiante en el chat.',
              },
              discardedTasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    taskId: { type: Type.STRING },
                    title: { type: Type.STRING },
                    cognitiveLoad: { type: Type.STRING },
                    reason: { type: Type.STRING },
                  },
                  required: ['taskId', 'title', 'cognitiveLoad', 'reason'],
                },
              },
            },
            required: [
              'blockStart',
              'blockEnd',
              'assignedMinutes',
              'breakMinutes',
              'cutoffProtected',
              'ruleApplied',
              'instructionMessage',
              'discardedTasks',
            ],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({
          error: 'Gemini devolvió una respuesta vacía. Intenta reformular tu mensaje.',
        });
        return;
      }

      const parsed = JSON.parse(rawText);
      const validLoad =
        parsed.selectedLoad === 'high' ||
        parsed.selectedLoad === 'medium' ||
        parsed.selectedLoad === 'low'
          ? parsed.selectedLoad
          : null;

      const rawDecision: CoachDecision = {
        selectedTaskId: parsed.selectedTaskId || null,
        selectedTaskTitle: parsed.selectedTaskTitle || null,
        selectedCourse: parsed.selectedCourse || null,
        selectedLoad: validLoad,
        blockStart: parsed.blockStart || contextState.currentTimeHHMM,
        blockEnd: parsed.blockEnd || contextState.currentTimeHHMM,
        assignedMinutes: Number(parsed.assignedMinutes) || 0,
        breakMinutes: Number(parsed.breakMinutes) || 0,
        cutoffProtected: Boolean(parsed.cutoffProtected),
        ruleApplied: parsed.ruleApplied || 'Evaluación generada por Gemini.',
        instructionMessage: parsed.instructionMessage || '',
        discardedTasks: Array.isArray(parsed.discardedTasks)
          ? parsed.discardedTasks
          : [],
        source: 'gemini-ai',
      };

      const safeDecision = validateDecisionTimeWindow(rawDecision, contextState, tasks);

      res.json({
        decision: safeDecision,
        payload,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error inesperado al consultar Gemini API.';
      console.error('Error en /api/coach:', errorMessage);
      res.status(500).json({
        error: `Error al consultar Gemini API: ${errorMessage}`,
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Coach Académico Personal running on http://localhost:${PORT}`);
  });
}

startServer();
