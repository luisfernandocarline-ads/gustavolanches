import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header, type AppTab } from './components/Header';
import { OrdersView } from './components/OrdersView';
import { PosMenuView } from './components/PosMenuView';
import { SchemaExplorerView } from './components/SchemaExplorerView';
import { SqlAnalyticsView } from './components/SqlAnalyticsView';
import type {
  BootstrapData,
  CartItem,
  Cliente,
  FormaPagamento,
  StatusPedido,
  TipoPedido,
} from './types/database';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('pdv');
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  const fetchBootstrap = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/bootstrap');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao inicializar banco de dados.');
      setData(json);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Falha ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBootstrap();
  }, [fetchBootstrap]);

  const activeOrdersCount = useMemo(() => {
    if (!data) return 0;
    return data.pedidos.filter((p) => ['RECEBIDO', 'EM_PREPARO', 'PRONTO'].includes(p.status)).length;
  }, [data]);

  const cartItemCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantidade, 0),
    [cart]
  );

  const handleAddToCart = (item: CartItem) => {
    setCart((prev) => [...prev, item]);
  };

  const handleUpdateCartQty = (tempId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.tempId === tempId ? { ...c, quantidade: c.quantidade + delta } : c))
        .filter((c) => c.quantidade > 0)
    );
  };

  const handleRemoveFromCart = (tempId: string) => {
    setCart((prev) => prev.filter((c) => c.tempId !== tempId));
  };

  const handleCreateCliente = async (
    nome: string,
    telefone: string,
    endereco: string
  ): Promise<Cliente> => {
    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, telefone, endereco }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erro ao cadastrar cliente.');
    if (json.bootstrap) setData(json.bootstrap);
    return json.cliente;
  };

  const handleSubmitOrder = async (payload: {
    tipo: TipoPedido;
    id_cliente: number | null;
    forma_pagamento: FormaPagamento;
    itens: CartItem[];
  }): Promise<number> => {
    const res = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: payload.tipo,
        id_cliente: payload.id_cliente,
        forma_pagamento: payload.forma_pagamento,
        itens: payload.itens.map((i) => ({
          id_produto: i.id_produto,
          quantidade: i.quantidade,
          observacao: i.observacao || null,
          adicionais: i.adicionais.map((a) => ({
            id_ingrediente: a.id_ingrediente,
            quantidade: a.quantidade,
          })),
        })),
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erro ao gravar pedido.');
    if (json.bootstrap) setData(json.bootstrap);
    return json.id_pedido;
  };

  const handleUpdateOrderStatus = async (idPedido: number, status: StatusPedido) => {
    const res = await fetch(`/api/pedidos/${idPedido}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erro ao atualizar status.');
    if (json.bootstrap) setData(json.bootstrap);
  };

  const handleResetDatabase = async () => {
    const res = await fetch('/api/database/reset', { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erro ao restaurar banco.');
    if (json.bootstrap) setData(json.bootstrap);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#1C1917]">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        cartCount={cartItemCount}
        activeOrdersCount={activeOrdersCount}
      />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="bg-white border border-stone-200 rounded-xl p-12 text-center space-y-2">
            <p className="text-base font-semibold text-stone-900">
              Inicializando banco PostgreSQL (Gustavo Lanches)...
            </p>
            <p className="text-sm text-stone-500 font-mono">
              01_criar_tabelas.sql · 02_inserir_dados.sql
            </p>
          </div>
        ) : loadError || !data ? (
          <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-3">
            <p className="text-base font-semibold text-red-900">
              {loadError || 'Não foi possível carregar os dados.'}
            </p>
            <button
              type="button"
              onClick={fetchBootstrap}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-lg cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'pdv' && (
              <PosMenuView
                categorias={data.categorias}
                produtos={data.produtos}
                ingredientes={data.ingredientes}
                clientes={data.clientes}
                cart={cart}
                onAddToCart={handleAddToCart}
                onUpdateCartQty={handleUpdateCartQty}
                onRemoveFromCart={handleRemoveFromCart}
                onClearCart={() => setCart([])}
                onCreateCliente={handleCreateCliente}
                onSubmitOrder={handleSubmitOrder}
                onGoToOrders={() => setActiveTab('pedidos')}
              />
            )}

            {activeTab === 'pedidos' && (
              <OrdersView
                pedidos={data.pedidos}
                onUpdateStatus={handleUpdateOrderStatus}
                onGoToPos={() => setActiveTab('pdv')}
              />
            )}

            {activeTab === 'modelo' && (
              <SchemaExplorerView
                tableCounts={data.tableCounts}
                onResetDatabase={handleResetDatabase}
              />
            )}

            {activeTab === 'consultas' && <SqlAnalyticsView />}
          </>
        )}
      </main>

      <footer className="border-t border-stone-200 bg-white py-4 px-4 sm:px-6">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-500">
          <span>Gustavo Lanches · Projeto Prático Integrador de Banco de Dados</span>
          <span className="font-mono">
            PostgreSQL · 11 tabelas relacionais
          </span>
        </div>
      </footer>
    </div>
  );
}
