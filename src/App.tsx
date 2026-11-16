import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header, type AppTab } from './components/Header';
import { OrdersView } from './components/OrdersView';
import { PosMenuView } from './components/PosMenuView';
import { SchemaExplorerView } from './components/SchemaExplorerView';
import { SqlAnalyticsView } from './components/SqlAnalyticsView';
import { upsertCartItem } from './utils/orderMath';
import {
  createClienteApi,
  createPedidoApi,
  fetchBootstrap as fetchBootstrapApi,
  resetDatabaseApi,
  updatePedidoStatusApi,
} from './services/apiClient';
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
      const json = await fetchBootstrapApi();
      setData(json);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Falha ao conectar com o banco de dados.');
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

  const handleUpsertCartItem = (item: CartItem, editingTempId?: string) => {
    setCart((prev) => upsertCartItem(prev, item, editingTempId));
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
    const result = await createClienteApi(nome, telefone, endereco);
    setData(result.bootstrap);
    return result.cliente;
  };

  const handleSubmitOrder = async (payload: {
    tipo: TipoPedido;
    id_cliente: number | null;
    forma_pagamento: FormaPagamento;
    itens: CartItem[];
  }): Promise<number> => {
    const result = await createPedidoApi(payload);
    setData(result.bootstrap);
    return result.id_pedido;
  };

  const handleUpdateOrderStatus = async (idPedido: number, status: StatusPedido) => {
    const result = await updatePedidoStatusApi(idPedido, status);
    setData(result.bootstrap);
  };

  const handleResetDatabase = async () => {
    const result = await resetDatabaseApi();
    setData(result.bootstrap);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#1C1917]">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        cartCount={cartItemCount}
        activeOrdersCount={activeOrdersCount}
      />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading ? (
          <div className="bg-white border border-stone-200 rounded-xl p-12 text-center space-y-2" role="status">
            <p className="text-base font-semibold text-stone-900">
              Carregando cardápio e pedidos do Gustavo Lanches...
            </p>
            <p className="text-sm text-stone-600 font-mono">
              Sincronizando banco PostgreSQL local
            </p>
          </div>
        ) : loadError || !data ? (
          <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-3" role="alert">
            <p className="text-base font-semibold text-red-900">
              {loadError || 'Não foi possível carregar os dados.'}
            </p>
            <button
              type="button"
              onClick={fetchBootstrap}
              className="min-h-10 px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-lg cursor-pointer"
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
                onUpsertCartItem={handleUpsertCartItem}
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
