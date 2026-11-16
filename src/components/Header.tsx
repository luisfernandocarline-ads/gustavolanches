import { ShoppingBag } from 'lucide-react';

export type AppTab = 'pdv' | 'pedidos' | 'modelo' | 'consultas';

interface HeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  cartCount: number;
  activeOrdersCount: number;
}

const NAV_ITEMS: Array<{ id: AppTab; label: string }> = [
  { id: 'pdv', label: 'PDV & Cardápio' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'modelo', label: 'Modelo ER' },
  { id: 'consultas', label: 'Consultas SQL' },
];

export function Header({ activeTab, onSelectTab, cartCount, activeOrdersCount }: HeaderProps) {
  return (
    <header className="bg-white border-b border-stone-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#pdv"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('pdv');
          }}
          className="text-lg font-extrabold tracking-tight text-stone-900 whitespace-nowrap shrink-0 rounded-sm"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Gustavo Lanches
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-2 text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer rounded-sm ${
                  isActive
                    ? 'text-[#B91C1C] font-semibold'
                    : 'text-stone-600 font-medium hover:text-stone-900'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
                {item.id === 'pedidos' && activeOrdersCount > 0 ? (
                  <span className="ml-1 font-mono tabular-nums text-xs">({activeOrdersCount})</span>
                ) : null}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-[17px] h-[2px] bg-[#B91C1C]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary CTA */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => {
              onSelectTab('pdv');
              setTimeout(() => {
                document.getElementById('checkout-panel')?.scrollIntoView({ behavior: 'smooth' });
              }, 60);
            }}
            className="inline-flex items-center gap-2 min-h-10 px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span>{cartCount > 0 ? `Comanda (${cartCount})` : 'Novo Pedido'}</span>
          </button>
        </div>
      </div>

      {/* Mobile secondary nav strip (non-sticky, accessible touch height >= 44px) */}
      <nav
        aria-label="Navegação móvel"
        className="md:hidden border-t border-stone-200 px-2 flex items-center justify-between gap-1 overflow-x-auto bg-stone-50/70"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`min-h-[44px] px-1.5 py-2 text-[11px] whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                isActive
                  ? 'text-[#B91C1C] border-[#B91C1C] font-semibold'
                  : 'text-stone-700 border-transparent font-medium hover:text-stone-900'
              }`}
            >
              {item.label}
              {item.id === 'pedidos' && activeOrdersCount > 0 ? ` (${activeOrdersCount})` : ''}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
