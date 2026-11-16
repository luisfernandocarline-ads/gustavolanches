import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Flame, PackageCheck, Search, X, XCircle } from 'lucide-react';
import type { FormaPagamento, Pedido, StatusPedido, TipoPedido } from '../types/database';
import {
  calculatePersistedItemTotal,
  formatBRL,
  getAllowedNextStatuses,
  normalizeSearchText,
} from '../utils/orderMath';
import { ConfirmDialog } from './ConfirmDialog';

interface OrdersViewProps {
  pedidos: Pedido[];
  onUpdateStatus: (idPedido: number, nextStatus: StatusPedido) => Promise<void>;
  onGoToPos: () => void;
}

type OrderFilter = 'EM_ANDAMENTO' | 'ENTREGUE' | 'CANCELADO' | 'TODOS';
type TypeFilter = 'ALL' | TipoPedido;

const STATUS_META: Record<StatusPedido, { label: string; tone: string }> = {
  RECEBIDO: { label: 'Recebido', tone: 'bg-amber-50 text-amber-900 border-amber-300' },
  EM_PREPARO: { label: 'Em Preparo', tone: 'bg-sky-50 text-sky-900 border-sky-300' },
  PRONTO: { label: 'Pronto', tone: 'bg-indigo-50 text-indigo-900 border-indigo-300' },
  ENTREGUE: { label: 'Entregue', tone: 'bg-emerald-50 text-emerald-900 border-emerald-300' },
  CANCELADO: { label: 'Cancelado', tone: 'bg-red-50 text-red-900 border-red-300' },
};

const TIPO_LABEL: Record<TipoPedido, string> = {
  BALCAO: 'Balcão',
  ENTREGA: 'Entrega',
};

const PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  CARTAO: 'Cartão',
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
  CANCELADO: 'Cancelar Pedido',
};

export function OrdersView({ pedidos, onUpdateStatus, onGoToPos }: OrdersViewProps) {
  const [filter, setFilter] = useState<OrderFilter>('EM_ANDAMENTO');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingState, setUpdatingState] = useState<{
    id: number;
    targetStatus: StatusPedido;
  } | null>(null);
  const [cancelCandidate, setCancelCandidate] = useState<Pedido | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const counts = useMemo(() => {
    const emAndamento = pedidos.filter((p) =>
      ['RECEBIDO', 'EM_PREPARO', 'PRONTO'].includes(p.status)
    ).length;
    const entregue = pedidos.filter((p) => p.status === 'ENTREGUE').length;
    const cancelado = pedidos.filter((p) => p.status === 'CANCELADO').length;
    return { emAndamento, entregue, cancelado, todos: pedidos.length };
  }, [pedidos]);

  const filteredPedidos = useMemo(() => {
    const q = normalizeSearchText(searchQuery);
    return pedidos.filter((p) => {
      if (filter === 'EM_ANDAMENTO' && !['RECEBIDO', 'EM_PREPARO', 'PRONTO'].includes(p.status)) {
        return false;
      }
      if (filter === 'ENTREGUE' && p.status !== 'ENTREGUE') return false;
      if (filter === 'CANCELADO' && p.status !== 'CANCELADO') return false;
      if (typeFilter !== 'ALL' && p.tipo !== typeFilter) return false;

      if (!q) return true;
      const orderNum = `#${p.id_pedido}`;
      return (
        orderNum.includes(q) ||
        String(p.id_pedido).includes(q) ||
        normalizeSearchText(p.cliente_nome ?? 'Balcão').includes(q) ||
        normalizeSearchText(p.cliente_endereco ?? '').includes(q) ||
        p.itens.some((i) => normalizeSearchText(i.produto_nome ?? '').includes(q))
      );
    });
  }, [pedidos, filter, typeFilter, searchQuery]);

  const handleTransition = async (idPedido: number, nextStatus: StatusPedido) => {
    if (updatingState) return;
    setUpdatingState({ id: idPedido, targetStatus: nextStatus });
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      await onUpdateStatus(idPedido, nextStatus);
      setFeedbackMsg(`Pedido #${idPedido} atualizado para "${STATUS_META[nextStatus].label}".`);
      setCancelCandidate(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao atualizar status do pedido.');
    } finally {
      setUpdatingState(null);
    }
  };

  const hasActiveFilters = filter !== 'EM_ANDAMENTO' || typeFilter !== 'ALL' || searchQuery.trim() !== '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Fila de Pedidos & Produção
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Acompanhe o preparo na cozinha e atualize entregas ou retiradas no balcão.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filtro por situação">
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
              className={`min-h-10 sm:min-h-8 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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

      {/* Search + Order Type Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search
            className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <label htmlFor="orders-search" className="sr-only">
            Buscar pedido por número, cliente ou lanche
          </label>
          <input
            id="orders-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por #pedido, cliente ou lanche..."
            className="w-full min-h-10 pl-9 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpar busca de pedidos"
              className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-900 absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div
            className="inline-flex items-center gap-1 p-1 bg-stone-100 rounded-lg"
            role="group"
            aria-label="Filtrar por tipo de atendimento"
          >
            {(
              [
                { id: 'ALL', label: 'Todos tipos' },
                { id: 'BALCAO', label: 'Balcão' },
                { id: 'ENTREGA', label: 'Entrega' },
              ] as Array<{ id: TypeFilter; label: string }>
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={typeFilter === opt.id}
                onClick={() => setTypeFilter(opt.id)}
                className={`min-h-8 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  typeFilter === opt.id
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-stone-600 font-mono tabular-nums whitespace-nowrap">
            {filteredPedidos.length} {filteredPedidos.length === 1 ? 'pedido' : 'pedidos'}
          </span>
        </div>
      </div>

      {feedbackMsg && (
        <div
          role="status"
          className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900 flex items-center justify-between gap-3"
        >
          <span>{feedbackMsg}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            aria-label="Fechar aviso"
            className="text-emerald-800 hover:text-emerald-950 p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900"
        >
          {errorMsg}
        </div>
      )}

      {filteredPedidos.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-10 sm:p-12 text-center space-y-3">
          <p className="text-base font-semibold text-stone-900">
            Nenhum pedido encontrado
          </p>
          <p className="text-sm text-stone-600 max-w-md mx-auto">
            {hasActiveFilters
              ? 'Nenhum pedido corresponde aos filtros ou busca atual.'
              : 'Crie um novo pedido no PDV para vê-lo imediatamente na fila de preparo.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setFilter('TODOS');
                  setTypeFilter('ALL');
                  setSearchQuery('');
                }}
                className="min-h-10 px-4 py-2 text-xs font-semibold text-stone-800 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg cursor-pointer"
              >
                Ver todos os pedidos
              </button>
            )}
            <button
              type="button"
              onClick={onGoToPos}
              className="min-h-10 px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-lg cursor-pointer"
            >
              Ir para o PDV & Cardápio
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPedidos.map((ped) => {
            const st = STATUS_META[ped.status];
            const nextStatuses = getAllowedNextStatuses(ped.status);
            const totalItens = ped.itens.reduce((acc, i) => acc + i.quantidade, 0);
            const isUpdatingThis = updatingState?.id === ped.id_pedido;

            return (
              <article
                key={ped.id_pedido}
                className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 font-mono">
                        <span className="font-bold text-stone-900 text-sm">
                          Pedido #{ped.id_pedido}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{ped.data_hora}</span>
                      </div>
                      <p className="text-base font-semibold text-stone-900 mt-1 truncate">
                        {ped.cliente_nome ?? 'Cliente no Balcão'}
                      </p>
                      <p className="text-xs text-stone-600 mt-0.5">
                        {TIPO_LABEL[ped.tipo]} · {PAGAMENTO_LABEL[ped.forma_pagamento]} ·{' '}
                        <span className="tabular-nums">
                          {totalItens} {totalItens === 1 ? 'item' : 'itens'}
                        </span>
                      </p>
                      {ped.tipo === 'ENTREGA' && (ped.cliente_endereco || ped.cliente_telefone) && (
                        <p className="text-xs text-stone-700 mt-1 bg-stone-50 border border-stone-200 rounded-md px-2.5 py-1.5">
                          {[ped.cliente_endereco, ped.cliente_telefone].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0 space-y-1.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-md ${st.tone}`}
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
                    <ul className="space-y-2.5">
                      {ped.itens.map((item) => {
                        const itemLineTotal = calculatePersistedItemTotal(item);
                        return (
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
                                <p className="text-xs text-stone-600 mt-0.5">
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
                                <p className="text-xs text-stone-600 italic mt-0.5">
                                  Obs.: {item.observacao}
                                </p>
                              )}
                            </div>
                            <span className="text-xs font-mono tabular-nums text-stone-700 shrink-0 pt-0.5">
                              {formatBRL(itemLineTotal)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                {nextStatuses.length > 0 && (
                  <div className="pt-3 border-t border-stone-200 flex flex-wrap items-center justify-end gap-2">
                    {nextStatuses.map((next) => {
                      const isCancel = next === 'CANCELADO';
                      const isThisBtnBusy = isUpdatingThis && updatingState?.targetStatus === next;
                      return (
                        <button
                          key={next}
                          type="button"
                          disabled={isUpdatingThis}
                          onClick={() => {
                            if (isCancel) {
                              setCancelCandidate(ped);
                            } else {
                              handleTransition(ped.id_pedido, next);
                            }
                          }}
                          className={`min-h-10 sm:min-h-9 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                            isCancel
                              ? 'text-[#B91C1C] bg-white border border-red-200 hover:bg-red-50'
                              : 'text-white bg-stone-900 hover:bg-stone-800'
                          }`}
                        >
                          {isThisBtnBusy ? 'Atualizando...' : ACTION_TEXT[next]}
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

      <ConfirmDialog
        open={cancelCandidate !== null}
        title={cancelCandidate ? `Cancelar Pedido #${cancelCandidate.id_pedido}?` : 'Cancelar Pedido?'}
        description={
          cancelCandidate
            ? `Esta ação altera o status do pedido de ${cancelCandidate.cliente_nome ?? 'Balcão'} (${formatBRL(cancelCandidate.valor_total)}) para Cancelado e não pode ser desfeita.`
            : ''
        }
        confirmLabel="Sim, cancelar pedido"
        cancelLabel="Manter pedido"
        tone="danger"
        busy={
          cancelCandidate !== null &&
          updatingState?.id === cancelCandidate.id_pedido &&
          updatingState?.targetStatus === 'CANCELADO'
        }
        onCancel={() => setCancelCandidate(null)}
        onConfirm={() => {
          if (cancelCandidate) {
            handleTransition(cancelCandidate.id_pedido, 'CANCELADO');
          }
        }}
      />
    </div>
  );
}
