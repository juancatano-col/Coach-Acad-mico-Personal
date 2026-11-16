import { useState } from 'react';
import { Check, Copy, Play } from 'lucide-react';
import {
  FIGMA_SCREENS_SPEC,
  SYSTEM_PROMPT_TEXT,
  TEST_CASES_EVIDENCE,
} from '../data/seedData';
import type { TestCaseEvidence } from '../types/coach';
import { formatTime12h } from '../utils/prioritizer';

interface UiSpecAndPromptViewProps {
  onLoadTestCase: (testCase: TestCaseEvidence) => void;
}

export function UiSpecAndPromptView({ onLoadTestCase }: UiSpecAndPromptViewProps) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(SYSTEM_PROMPT_TEXT);
      setCopiedPrompt(true);
      window.setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      setCopiedPrompt(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="border-b border-slate-200 pb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl [text-wrap:balance]">
          Paso 2 · Diseño del Prototipo Simulado
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-600">
          Formato híbrido recomendado para tu exposición: System Prompt de configuración para Google AI Studio / Bot de Telegram, dos interacciones verificadas de prueba y especificación de pantallas para Figma o Canva.
        </p>
      </section>

      {/* System Prompt exacto */}
      <section
        aria-labelledby="heading-system-prompt"
        className="rounded-xl border border-slate-200 bg-white p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="heading-system-prompt"
              className="font-display text-base font-semibold text-slate-900"
            >
              System Prompt exacto (Google AI Studio / Telegram Bot)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Instrucciones de sistema configuradas con razonamiento acotado y salida determinista en español.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyPrompt}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
          >
            {copiedPrompt ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copiar System Prompt
              </>
            )}
          </button>
        </div>

        <pre
          data-testid="system-prompt-block"
          className="mt-4 overflow-x-auto rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-100"
        >
          {SYSTEM_PROMPT_TEXT}
        </pre>
      </section>

      {/* 2 Ejemplos de interacción probados */}
      <section aria-labelledby="heading-test-evidence" className="space-y-4">
        <div>
          <h2
            id="heading-test-evidence"
            className="font-display text-lg font-semibold text-slate-900"
          >
            Evidencia de Prueba · 2 Interacciones Validadas
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Casos ejecutados para demostrar cómo cambia la decisión de la IA según fatiga y ubicación.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {TEST_CASES_EVIDENCE.map((testCase) => (
            <article
              key={testCase.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-semibold text-slate-900">
                      {testCase.label}
                    </h3>
                    <p className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums">
                      {testCase.scenarioSummary}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLoadTestCase(testCase)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0"
                  >
                    <Play className="h-3 w-3" aria-hidden="true" />
                    Probar caso
                  </button>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold text-slate-500">Usuario envía:</p>
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-800">
                    “{testCase.userPrompt}”
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-blue-700">
                    Coach responde ({formatTime12h(testCase.expectedDecision.blockStart)} –{' '}
                    {formatTime12h(testCase.expectedDecision.blockEnd)}):
                  </p>
                  <p className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 text-sm leading-relaxed text-slate-800">
                    {testCase.expectedDecision.instructionMessage}
                  </p>
                </div>
              </div>

              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                Regla verificada: {testCase.expectedDecision.ruleApplied}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Especificación de Pantallas para Figma / Canva */}
      <section aria-labelledby="heading-figma-specs" className="space-y-4">
        <div>
          <h2
            id="heading-figma-specs"
            className="font-display text-lg font-semibold text-slate-900"
          >
            Especificación de Pantallas Simuladas (Guía para Figma / Canva)
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Componentes exactos requeridos en cada vista si decides diagramar los mockups estáticos adicionales.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {FIGMA_SCREENS_SPEC.map((screen) => (
            <article
              key={screen.screenNumber}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <p className="text-xs font-semibold text-blue-700">{screen.screenNumber}</p>
              <h3 className="mt-1 font-display text-base font-semibold text-slate-900">
                {screen.name}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{screen.goal}</p>

              <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-700">
                {screen.elements.map((el, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono text-slate-400 tabular-nums">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <span>{el}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
