import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Flame, PackageCheck, XCircle } from 'lucide-react';
import type { Pedido, StatusPedido } from '../types/database';
import { formatBRL, getAllowedNextStatuses } from '../utils/orderMath';

interface OrdersViewProps {
  pedidos: Pedido[];
  onUpdateStatus: (idPedido: number, nextStatus: StatusPedido) => Promise<void>;
  onGoToPos: () => void;
}

type OrderFilter = 'EM_ANDAMENTO' | 'ENTREGUE' | 'CANCELADO' | 'TODOS';

const STATUS_LABEL: Record<StatusPedido, { label: string; tone: string }> = {
  RECEBIDO: { label: 'RECEBIDO', tone: 'bg-amber-50 text-amber-900 border-amber-200' },
  EM_PREPARO: { label: 'EM_PREPARO', tone: 'bg-sky-50 text-sky-900 border-sky-200' },
  PRONTO: { label: 'PRONTO', tone: 'bg-indigo-50 text-indigo-900 border-indigo-200' },
  ENTREGUE: { label: 'ENTREGUE', tone: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
  CANCELADO: { label: 'CANCELADO', tone: 'bg-red-50 text-red-900 border-red-200' },
};

function StatusIcon({ status }: { status: StatusPedido }) {
  switch (status) {
    case 'RECEBIDO':
      return <Clock className="w-3.5 h-3.5" aria-hidden="true" />;
    case 'EM_PREPARO':
      return <Flame className="w-3.5 h-3.5" aria-hidden="true" />;
    case 'PRONTO':
      return <PackageCheck className="w-3.5 h-3.5" aria-hidden="true" />;
    case 'ENTREGUE':
      return <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />;
    case 'CANCELADO':
      return <XCircle className="w-3.5 h-3.5" aria-hidden="true" />;
  }
}

const ACTION_TEXT: Record<StatusPedido, string> = {
  RECEBIDO: 'Recebido',
  EM_PREPARO: 'Iniciar Preparo',
  PRONTO: 'Marcar Pronto',
  ENTREGUE: 'Finalizar Entrega',
  CANCELADO: 'Cancelar',
};

export function OrdersView({ pedidos, onUpdateStatus, onGoToPos }: OrdersViewProps) {
  const [filter, setFilter] = useState<OrderFilter>('EM_ANDAMENTO');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const counts = useMemo(() => {
    const emAndamento = pedidos.filter((p) =>
      ['RECEBIDO', 'EM_PREPARO', 'PRONTO'].includes(p.status)
    ).length;
    const entregue = pedidos.filter((p) => p.status === 'ENTREGUE').length;
    const cancelado = pedidos.filter((p) => p.status === 'CANCELADO').length;
    return { emAndamento, entregue, cancelado, todos: pedidos.length };
  }, [pedidos]);

  const filteredPedidos = useMemo(() => {
    return pedidos.filter((p) => {
      if (filter === 'EM_ANDAMENTO') {
        return ['RECEBIDO', 'EM_PREPARO', 'PRONTO'].includes(p.status);
      }
      if (filter === 'ENTREGUE') return p.status === 'ENTREGUE';
      if (filter === 'CANCELADO') return p.status === 'CANCELADO';
      return true;
    });
  }, [pedidos, filter]);

  const handleTransition = async (idPedido: number, nextStatus: StatusPedido) => {
    setUpdatingId(idPedido);
    setErrorMsg(null);
    try {
      await onUpdateStatus(idPedido, nextStatus);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao atualizar status do pedido.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Pedidos & Fila de Produção
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Registros da tabela <span className="font-mono text-xs text-stone-800">pedido</span> com
            itens (<span className="font-mono text-xs text-stone-800">item_pedido</span>) e extras (
            <span className="font-mono text-xs text-stone-800">item_pedido_adicional</span>).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filtro de pedidos">
          {(
            [
              { id: 'EM_ANDAMENTO', label: `Em Andamento (${counts.emAndamento})` },
              { id: 'TODOS', label: `Todos (${counts.todos})` },
              { id: 'ENTREGUE', label: `Entregues (${counts.entregue})` },
              { id: 'CANCELADO', label: `Cancelados (${counts.cancelado})` },
            ] as Array<{ id: OrderFilter; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === tab.id
                  ? 'bg-stone-900 text-white'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900"
        >
          {errorMsg}
        </div>
      )}

      {filteredPedidos.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
          <p className="text-base font-semibold text-stone-900">
            Nenhum pedido encontrado neste filtro
          </p>
          <p className="text-sm text-stone-500 mt-1">
            Crie um novo pedido no PDV para vê-lo imediatamente na fila de preparo.
          </p>
          <button
            type="button"
            onClick={onGoToPos}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-lg cursor-pointer"
          >
            Ir para o PDV & Cardápio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPedidos.map((ped) => {
            const st = STATUS_LABEL[ped.status];
            const nextStatuses = getAllowedNextStatuses(ped.status);
            const totalItens = ped.itens.reduce((acc, i) => acc + i.quantidade, 0);

            return (
              <article
                key={ped.id_pedido}
                className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-stone-500 font-mono">
                        <span className="font-bold text-stone-900 text-sm">
                          Pedido #{ped.id_pedido}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{ped.data_hora}</span>
                      </div>
                      <p className="text-sm font-semibold text-stone-900 mt-1">
                        {ped.cliente_nome ?? 'Balcão (sem cadastro)'}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {ped.tipo} · {ped.forma_pagamento} · {totalItens}{' '}
                        {totalItens === 1 ? 'item' : 'itens'}
                        {ped.cliente_endereco ? ` · ${ped.cliente_endereco}` : ''}
                      </p>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold border rounded-md ${st.tone}`}
                      >
                        <StatusIcon status={ped.status} />
                        <span>{st.label}</span>
                      </span>
                      <p className="text-base font-extrabold font-mono tabular-nums text-stone-900">
                        {formatBRL(ped.valor_total)}
                      </p>
                    </div>
                  </div>

                  {/* Itens do pedido */}
                  <div className="border-t border-stone-100 pt-3">
                    <ul className="space-y-2">
                      {ped.itens.map((item) => (
                        <li
                          key={item.id_item_pedido}
                          className="text-sm flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-stone-900 font-medium">
                              <span className="font-mono tabular-nums">{item.quantidade}x</span>{' '}
                              {item.produto_nome}
                            </p>
                            {item.adicionais.length > 0 && (
                              <p className="text-xs text-stone-600">
                                Adicionais:{' '}
                                {item.adicionais
                                  .map(
                                    (a) =>
                                      `${a.quantidade}x ${a.ingrediente_nome} (+${formatBRL(a.valor)})`
                                  )
                                  .join(', ')}
                              </p>
                            )}
                            {item.observacao && (
                              <p className="text-xs text-stone-500 italic">
                                Obs.: {item.observacao}
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-mono tabular-nums text-stone-700 shrink-0">
                            {formatBRL(item.quantidade * item.preco_unitario)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {nextStatuses.length > 0 && (
                  <div className="pt-3 border-t border-stone-200 flex flex-wrap items-center justify-end gap-2">
                    {nextStatuses.map((next) => {
                      const isCancel = next === 'CANCELADO';
                      return (
                        <button
                          key={next}
                          type="button"
                          disabled={updatingId === ped.id_pedido}
                          onClick={() => handleTransition(ped.id_pedido, next)}
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                            isCancel
                              ? 'text-red-700 border border-red-200 hover:bg-red-50'
                              : 'text-white bg-stone-900 hover:bg-stone-800'
                          }`}
                        >
                          {ACTION_TEXT[next]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
