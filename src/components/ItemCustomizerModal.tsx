import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import type { CartItem, CartItemAdicional, Ingrediente, Produto } from '../types/database';
import { calculateItemSubtotal, formatBRL } from '../utils/orderMath';

interface ItemCustomizerModalProps {
  produto: Produto | null;
  editingItem?: CartItem | null;
  adicionaisDisponiveis: Ingrediente[];
  onClose: () => void;
  onConfirm: (item: CartItem, editingTempId?: string) => void;
}

export function ItemCustomizerModal({
  produto,
  editingItem = null,
  adicionaisDisponiveis,
  onClose,
  onConfirm,
}: ItemCustomizerModalProps) {
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  const [selectedAdds, setSelectedAdds] = useState<Record<number, number>>({});
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!produto) return;
    if (editingItem) {
      setQuantidade(editingItem.quantidade);
      setObservacao(editingItem.observacao);
      const map: Record<number, number> = {};
      for (const add of editingItem.adicionais) {
        map[add.id_ingrediente] = add.quantidade;
      }
      setSelectedAdds(map);
    } else {
      setQuantidade(1);
      setObservacao('');
      setSelectedAdds({});
    }
  }, [produto, editingItem]);

  useEffect(() => {
    if (!produto) return;
    closeBtnRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [produto, onClose]);

  if (!produto) return null;

  const adicionaisList: CartItemAdicional[] = adicionaisDisponiveis
    .filter((ing) => (selectedAdds[ing.id_ingrediente] ?? 0) > 0)
    .map((ing) => ({
      id_ingrediente: ing.id_ingrediente,
      nome: ing.nome,
      quantidade: selectedAdds[ing.id_ingrediente],
      preco_adicional: ing.preco_adicional ?? 0,
    }));

  const subtotal = calculateItemSubtotal(produto.preco, quantidade, adicionaisList);

  const updateAddQty = (idIngrediente: number, delta: number) => {
    setSelectedAdds((prev) => {
      const next = Math.max(0, (prev[idIngrediente] ?? 0) + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[idIngrediente];
        return copy;
      }
      return { ...prev, [idIngrediente]: next };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(
      {
        tempId:
          editingItem?.tempId ??
          `${produto.id_produto}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        id_produto: produto.id_produto,
        nome: produto.nome,
        preco_unitario: produto.preco,
        quantidade,
        observacao: observacao.trim(),
        adicionais: adicionaisList,
      },
      editingItem?.tempId
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/55 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customizer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-stone-200 rounded-t-2xl sm:rounded-xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
        {/* Sticky Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-stone-200 flex items-start justify-between gap-4 shrink-0 bg-white">
          <div className="min-w-0">
            <p className="text-xs text-stone-600 font-medium">
              {produto.categoria_nome} · <span className="font-mono tabular-nums">{formatBRL(produto.preco)}</span>
            </p>
            <h2 id="customizer-title" className="text-lg font-bold text-stone-900 mt-0.5">
              {editingItem ? `Editar: ${produto.nome}` : produto.nome}
            </h2>
            {produto.descricao && (
              <p className="text-sm text-stone-600 mt-1 leading-relaxed">{produto.descricao}</p>
            )}
            {produto.ingredientes && produto.ingredientes.length > 0 && (
              <p className="text-xs text-stone-500 mt-1.5">
                Composição: {produto.ingredientes.join(' · ')}
              </p>
            )}
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar personalização"
            className="min-w-10 min-h-10 flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Form wraps scrollable middle and fixed footer */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6">
            {/* Quantidade */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <span className="text-sm font-semibold text-stone-900 block">Quantidade</span>
                <span className="text-xs text-stone-600 tabular-nums">
                  Unitário: {formatBRL(produto.preco)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                  disabled={quantidade <= 1}
                  aria-label="Diminuir quantidade"
                  className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center border border-stone-300 rounded-lg hover:bg-stone-100 text-stone-800 disabled:opacity-40 cursor-pointer"
                >
                  <Minus className="w-4 h-4" aria-hidden="true" />
                </button>
                <span
                  aria-live="polite"
                  className="w-8 text-center font-mono font-semibold tabular-nums text-stone-900"
                >
                  {quantidade}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantidade((q) => q + 1)}
                  aria-label="Aumentar quantidade"
                  className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center border border-stone-300 rounded-lg hover:bg-stone-100 text-stone-800 cursor-pointer"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Adicionais */}
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-sm font-semibold text-stone-900">Adicionais</h3>
                <span className="text-xs text-stone-600">Opcional · cobrado por unidade extra</span>
              </div>
              <div className="divide-y divide-stone-200 border border-stone-200 rounded-lg">
                {adicionaisDisponiveis.map((ing) => {
                  const qty = selectedAdds[ing.id_ingrediente] ?? 0;
                  return (
                    <div
                      key={ing.id_ingrediente}
                      className={`px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                        qty > 0 ? 'bg-red-50/40' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-stone-900 block truncate">
                          {ing.nome}
                        </span>
                        <span className="text-xs text-stone-600 font-mono tabular-nums">
                          +{formatBRL(ing.preco_adicional)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateAddQty(ing.id_ingrediente, -1)}
                          disabled={qty === 0}
                          aria-label={`Remover adicional ${ing.nome}`}
                          className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center border border-stone-300 rounded-md hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <span className="w-6 text-center text-sm font-mono tabular-nums text-stone-900">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateAddQty(ing.id_ingrediente, 1)}
                          aria-label={`Adicionar ${ing.nome}`}
                          className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center border border-stone-300 rounded-md hover:bg-stone-100 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Observação */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="item-observacao" className="text-sm font-semibold text-stone-900">
                  Observação para a cozinha
                </label>
                <span className="text-xs font-mono tabular-nums text-stone-500">
                  {observacao.length}/200
                </span>
              </div>
              <input
                id="item-observacao"
                type="text"
                maxLength={200}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex.: Sem milho, ponto da carne, sabor cheddar e bacon..."
                className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-[#B91C1C]"
              />
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="px-5 sm:px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-4 shrink-0">
            <div>
              <span className="text-xs text-stone-600 block">Subtotal do item</span>
              <span className="text-lg font-bold font-mono tabular-nums text-stone-900">
                {formatBRL(subtotal)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-10 px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-10 px-5 py-2 text-sm font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-lg cursor-pointer"
              >
                {editingItem ? 'Salvar Alterações' : 'Adicionar à Comanda'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
