import { useEffect, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import type { CartItem, CartItemAdicional, Ingrediente, Produto } from '../types/database';
import { calculateItemSubtotal, formatBRL } from '../utils/orderMath';

interface ItemCustomizerModalProps {
  produto: Produto | null;
  adicionaisDisponiveis: Ingrediente[];
  onClose: () => void;
  onConfirm: (item: CartItem) => void;
}

export function ItemCustomizerModal({
  produto,
  adicionaisDisponiveis,
  onClose,
  onConfirm,
}: ItemCustomizerModalProps) {
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  const [selectedAdds, setSelectedAdds] = useState<Record<number, number>>({});

  useEffect(() => {
    setQuantidade(1);
    setObservacao('');
    setSelectedAdds({});
  }, [produto?.id_produto]);

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
    onConfirm({
      tempId: `${produto.id_produto}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      id_produto: produto.id_produto,
      nome: produto.nome,
      preco_unitario: produto.preco,
      quantidade,
      observacao: observacao.trim(),
      adicionais: adicionaisList,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customizer-title"
    >
      <div className="bg-white border border-stone-200 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-stone-200 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-stone-500 font-medium">
              {produto.categoria_nome} · <span className="font-mono">produto #{produto.id_produto}</span>
            </p>
            <h2 id="customizer-title" className="text-lg font-bold text-stone-900 mt-0.5">
              {produto.nome}
            </h2>
            {produto.descricao && (
              <p className="text-sm text-stone-600 mt-1">{produto.descricao}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar customização"
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quantidade */}
          <div className="flex items-center justify-between border-b border-stone-200 pb-4">
            <div>
              <span className="text-sm font-semibold text-stone-900 block">Quantidade (item_pedido)</span>
              <span className="text-xs text-stone-500 tabular-nums">
                Preço unitário: {formatBRL(produto.preco)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                aria-label="Diminuir quantidade"
                className="w-9 h-9 flex items-center justify-center border border-stone-300 rounded-lg hover:bg-stone-100 text-stone-800 cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-mono font-semibold tabular-nums text-stone-900">
                {quantidade}
              </span>
              <button
                type="button"
                onClick={() => setQuantidade((q) => q + 1)}
                aria-label="Aumentar quantidade"
                className="w-9 h-9 flex items-center justify-center border border-stone-300 rounded-lg hover:bg-stone-100 text-stone-800 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Adicionais (item_pedido_adicional) */}
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-sm font-semibold text-stone-900">
                Adicionais (item_pedido_adicional)
              </h3>
              <span className="text-xs text-stone-500 font-mono">
                ingrediente.preco_adicional IS NOT NULL
              </span>
            </div>
            <div className="divide-y divide-stone-200 border border-stone-200 rounded-lg">
              {adicionaisDisponiveis.map((ing) => {
                const qty = selectedAdds[ing.id_ingrediente] ?? 0;
                return (
                  <div
                    key={ing.id_ingrediente}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-stone-900 block truncate">
                        {ing.nome}
                      </span>
                      <span className="text-xs text-stone-500 font-mono tabular-nums">
                        +{formatBRL(ing.preco_adicional)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateAddQty(ing.id_ingrediente, -1)}
                        disabled={qty === 0}
                        aria-label={`Remover adicional ${ing.nome}`}
                        className="w-8 h-8 flex items-center justify-center border border-stone-300 rounded-md hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-mono tabular-nums text-stone-900">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateAddQty(ing.id_ingrediente, 1)}
                        aria-label={`Adicionar ${ing.nome}`}
                        className="w-8 h-8 flex items-center justify-center border border-stone-300 rounded-md hover:bg-stone-100 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Observacao */}
          <div>
            <label htmlFor="item-observacao" className="block text-sm font-semibold text-stone-900 mb-1.5">
              Observação (item_pedido.observacao)
            </label>
            <input
              id="item-observacao"
              type="text"
              maxLength={200}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex.: Sem milho, sabor cheddar e bacon, pão bem tostado..."
              className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-[#B91C1C]"
            />
          </div>

          <div className="pt-3 border-t border-stone-200 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs text-stone-500 block">Subtotal do item</span>
              <span className="text-lg font-bold font-mono tabular-nums text-stone-900">
                {formatBRL(subtotal)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-stone-700 border border-stone-300 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-lg cursor-pointer"
              >
                Adicionar ao Pedido
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
