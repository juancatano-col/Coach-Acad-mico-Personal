import type { ActiveTab } from '../types/coach';

interface HeaderBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onRunQuickCheck: () => void;
}

const NAV_ITEMS: Array<{ id: ActiveTab; label: string }> = [
  { id: 'prototype', label: 'Prototipo Vivo' },
  { id: 'flow', label: 'Flujo IA' },
  { id: 'specs', label: 'Especificación UI' },
  { id: 'pitch', label: 'Pitch Semana 8' },
];

export function HeaderBar({
  activeTab,
  onSelectTab,
  onRunQuickCheck,
}: HeaderBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-4 py-3 sm:px-6 md:gap-8">
        <button
          type="button"
          onClick={() => onSelectTab('prototype')}
          className="font-display text-left text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
        >
          Coach Académico
        </button>

        <nav
          aria-label="Secciones del prototipo"
          className="hidden items-center gap-6 md:flex"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative px-2 py-1.5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-2 -bottom-3 h-0.5 bg-blue-600"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onRunQuickCheck}
            className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-blue-700 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:px-4"
          >
            Evaluar Bloque
          </button>
        </div>
      </div>

      {/* Navegación móvil visible sin recorte */}
      <nav
        aria-label="Secciones del prototipo móvil"
        className="flex items-center gap-4 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                isActive ? 'text-blue-600 font-semibold' : 'text-slate-600'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
