import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import {
  DIPLOMADO_TECHNIQUES_TABLE,
  GOVERNANCE_CHECKS,
  PITCH_EXPOSURE_TEXT,
  USER_STORIES,
} from '../data/seedData';

export function PitchAndGovernanceView() {
  const [copiedPitch, setCopiedPitch] = useState(false);

  const handleCopyPitch = async () => {
    try {
      await navigator.clipboard.writeText(PITCH_EXPOSURE_TEXT);
      setCopiedPitch(true);
      window.setTimeout(() => setCopiedPitch(false), 2000);
    } catch {
      setCopiedPitch(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="border-b border-slate-200 pb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl [text-wrap:balance]">
          Paso 3 · Pitch para la Exposición (Semana 8)
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
          Resumen ejecutivo persuasivo del diseño junto con las historias de usuario, técnicas del diplomado y controles de privacidad (Ley 1581 de 2012).
        </p>
      </section>

      {/* Pitch principal */}
      <section
        aria-labelledby="heading-pitch-text"
        className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="heading-pitch-text"
              className="font-display text-base font-semibold text-slate-900"
            >
              Guion de Exposición Oral (Máximo 4 líneas)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Institución Universitaria Digital de Antioquia · Ingeniería de Software y Datos · 2026
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyPitch}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
          >
            {copiedPitch ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copiar Pitch
              </>
            )}
          </button>
        </div>

        <blockquote
          data-testid="pitch-quote"
          className="mt-5 rounded-lg bg-slate-50 p-5 text-base leading-relaxed text-slate-800 sm:text-lg"
        >
          “{PITCH_EXPOSURE_TEXT}”
        </blockquote>
      </section>

      {/* Historias de usuario */}
      <section aria-labelledby="heading-user-stories" className="space-y-4">
        <h2
          id="heading-user-stories"
          className="font-display text-lg font-semibold text-slate-900"
        >
          Historias de Usuario del Prototipo
        </h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {USER_STORIES.map((item) => (
            <article
              key={item.role}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <h3 className="font-display text-sm font-semibold text-blue-700">
                {item.role}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {item.story}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Tabla de técnicas del diplomado */}
      <section aria-labelledby="heading-techniques-table" className="space-y-4">
        <h2
          id="heading-techniques-table"
          className="font-display text-lg font-semibold text-slate-900"
        >
          Técnicas de IA Generativa Aplicadas (Diplomado)
        </h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="px-4 py-3">Técnica</th>
                <th className="px-4 py-3">Dónde la usa el prototipo</th>
                <th className="px-4 py-3">Por qué</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs leading-relaxed text-slate-700">
              {DIPLOMADO_TECHNIQUES_TABLE.map((row) => (
                <tr key={row.technique} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {row.technique}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.where}</td>
                  <td className="px-4 py-3 text-slate-600">{row.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cumplimiento y controles técnicos */}
      <section aria-labelledby="heading-governance" className="space-y-4">
        <h2
          id="heading-governance"
          className="font-display text-lg font-semibold text-slate-900"
        >
          Respaldo Normativo y Verificación Técnica (Actividad 1 → Actividad 2)
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {GOVERNANCE_CHECKS.map((item) => (
            <article
              key={item.topic}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <h3 className="font-display text-sm font-semibold text-slate-900">
                {item.topic}
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
                {item.detail}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
