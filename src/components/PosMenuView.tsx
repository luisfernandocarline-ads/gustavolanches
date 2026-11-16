import { useMemo, useState } from 'react';
import { Check, Minus, Pencil, Plus, Search, SlidersHorizontal, Trash2, UserPlus, X } from 'lucide-react';
import type {
  CartItem,
  Categoria,
  Cliente,
  FormaPagamento,
  Ingrediente,
  Produto,
  TipoPedido,
} from '../types/database';
import {
  calculateItemSubtotal,
  calculateOrderTotal,
  filterProdutos,
  formatBRL,
  validateClienteInput,
  validatePedidoPayload,
} from '../utils/orderMath';
import { ConfirmDialog } from './ConfirmDialog';
import { ItemCustomizerModal } from './ItemCustomizerModal';

interface PosMenuViewProps {
  categorias: Categoria[];
  produtos: Produto[];
  ingredientes: Ingrediente[];
  clientes: Cliente[];
  cart: CartItem[];
  onUpsertCartItem: (item: CartItem, editingTempId?: string) => void;
  onUpdateCartQty: (tempId: string, delta: number) => void;
  onRemoveFromCart: (tempId: string) => void;
  onClearCart: () => void;
  onCreateCliente: (nome: string, telefone: string, endereco: string) => Promise<Cliente>;
  onSubmitOrder: (payload: {
    tipo: TipoPedido;
    id_cliente: number | null;
    forma_pagamento: FormaPagamento;
    itens: CartItem[];
  }) => Promise<number>;
  onGoToOrders: () => void;
}

const PAYMENT_OPTIONS: Array<{ value: FormaPagamento; label: string }> = [
  { value: 'PIX', label: 'PIX' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'CARTAO', label: 'Cartão' },
];

export function PosMenuView({
  categorias,
  produtos,
  ingredientes,
  clientes,
  cart,
  onUpsertCartItem,
  onUpdateCartQty,
  onRemoveFromCart,
  onClearCart,
  onCreateCliente,
  onSubmitOrder,
  onGoToOrders,
}: PosMenuViewProps) {
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customizingProduto, setCustomizingProduto] = useState<Produto | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [justAddedId, setJustAddedId] = useState<number | null>(null);

  const [tipo, setTipo] = useState<TipoPedido>('BALCAO');
  const [idCliente, setIdCliente] = useState<number | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX');

  const [showNewCliente, setShowNewCliente] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novoEndereco, setNovoEndereco] = useState('');
  const [savingCliente, setSavingCliente] = useState(false);
  const [clienteError, setClienteError] = useState<string | null>(null);
  const [clienteSuccess, setClienteSuccess] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const adicionaisDisponiveis = useMemo(
    () => ingredientes.filter((i) => i.preco_adicional !== null),
    [ingredientes]
  );

  const categoryCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of produtos) {
      map.set(p.id_categoria, (map.get(p.id_categoria) ?? 0) + 1);
    }
    return map;
  }, [produtos]);

  const filteredProdutos = useMemo(
    () => filterProdutos(produtos, selectedCategoriaId, searchQuery),
    [produtos, selectedCategoriaId, searchQuery]
  );

  const orderTotal = useMemo(
    () =>
      calculateOrderTotal(
        cart.map((c) => ({
          id_produto: c.id_produto,
          quantidade: c.quantidade,
          preco_unitario: c.preco_unitario,
          adicionais: c.adicionais.map((a) => ({
            quantidade: a.quantidade,
            valor: a.quantidade * a.preco_adicional,
          })),
        }))
      ),
    [cart]
  );

  const totalUnitCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantidade, 0),
    [cart]
  );

  const selectedCliente = useMemo(
    () => clientes.find((c) => c.id_cliente === idCliente) ?? null,
    [clientes, idCliente]
  );

  const handleQuickAdd = (prod: Produto) => {
    onUpsertCartItem({
      tempId: `${prod.id_produto}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      id_produto: prod.id_produto,
      nome: prod.nome,
      preco_unitario: prod.preco,
      quantidade: 1,
      observacao: '',
      adicionais: [],
    });
    setLastOrderId(null);
    setCheckoutError(null);
    setJustAddedId(prod.id_produto);
    window.setTimeout(() => {
      setJustAddedId((curr) => (curr === prod.id_produto ? null : curr));
    }, 900);
  };

  const handleEditCartItem = (item: CartItem) => {
    const prod = produtos.find((p) => p.id_produto === item.id_produto);
    if (!prod) return;
    setEditingCartItem(item);
    setCustomizingProduto(prod);
  };

  const handleSaveCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingCliente) return;

    const validation = validateClienteInput(novoNome);
    if (!validation.valid) {
      setClienteError(validation.error ?? 'Nome inválido.');
      return;
    }

    setSavingCliente(true);
    setClienteError(null);
    setClienteSuccess(null);
    try {
      const created = await onCreateCliente(novoNome, novoTelefone, novoEndereco);
      setIdCliente(created.id_cliente);
      setNovoNome('');
      setNovoTelefone('');
      setNovoEndereco('');
      setShowNewCliente(false);
      setClienteSuccess(`Cliente "${created.nome}" cadastrado e selecionado.`);
      setCheckoutError(null);
    } catch (err) {
      setClienteError(err instanceof Error ? err.message : 'Falha ao cadastrar cliente.');
    } finally {
      setSavingCliente(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setCheckoutError(null);
    setLastOrderId(null);

    const validation = validatePedidoPayload({
      tipo,
      id_cliente: idCliente,
      forma_pagamento: formaPagamento,
      itens: cart.map((c) => ({ id_produto: c.id_produto, quantidade: c.quantidade })),
    });

    if (!validation.valid) {
      setCheckoutError(validation.error ?? 'Verifique os dados do pedido.');
      if (tipo === 'ENTREGA' && idCliente === null) {
        document.getElementById('pedido-cliente')?.focus();
      }
      return;
    }

    setSubmitting(true);
    try {
      const newId = await onSubmitOrder({
        tipo,
        id_cliente: idCliente,
        forma_pagamento: formaPagamento,
        itens: cart,
      });
      setLastOrderId(newId);
      setClienteSuccess(null);
      onClearCart();
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Erro ao registrar pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  const isFiltering = selectedCategoriaId !== 'all' || searchQuery.trim() !== '';

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-start ${cart.length > 0 ? 'pb-16 lg:pb-0' : ''}`}>
      {/* Left/Main: Cardápio */}
      <section className="lg:col-span-8 space-y-5" aria-labelledby="cardapio-heading">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <h1 id="cardapio-heading" className="text-2xl font-bold tracking-tight text-stone-900">
              Cardápio & Frente de Caixa
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              {produtos.length} itens em {categorias.length} categorias · adicione direto ou personalize com extras e observações.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search
              className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="menu-search" className="sr-only">
              Buscar lanche ou ingrediente no cardápio
            </label>
            <input
              id="menu-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar lanche ou ingrediente..."
              className="w-full min-h-10 pl-9 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpar busca no cardápio"
                className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-900 absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Category segmented filter tabs */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Categorias do cardápio">
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategoriaId === 'all'}
            onClick={() => setSelectedCategoriaId('all')}
            className={`min-h-10 sm:min-h-8 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategoriaId === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
          >
            Todas ({produtos.length})
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id_categoria}
              type="button"
              role="tab"
              aria-selected={selectedCategoriaId === cat.id_categoria}
              onClick={() => setSelectedCategoriaId(cat.id_categoria)}
              className={`min-h-10 sm:min-h-8 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategoriaId === cat.id_categoria
                  ? 'bg-stone-900 text-white'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
            >
              {cat.nome} ({categoryCounts.get(cat.id_categoria) ?? 0})
            </button>
          ))}
        </div>

        {isFiltering && filteredProdutos.length > 0 && (
          <div className="flex items-center justify-between text-xs text-stone-600">
            <span>
              Mostrando <strong className="font-semibold text-stone-900 tabular-nums">{filteredProdutos.length}</strong> de{' '}
              <span className="tabular-nums">{produtos.length}</span> produtos
              {searchQuery.trim() ? ` para "${searchQuery.trim()}"` : ''}
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedCategoriaId('all');
                setSearchQuery('');
              }}
              className="font-semibold text-[#B91C1C] hover:underline cursor-pointer"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {/* Product Grid */}
        {filteredProdutos.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-xl p-10 text-center space-y-2">
            <p className="text-base font-semibold text-stone-900">Nenhum item encontrado no cardápio</p>
            <p className="text-sm text-stone-600">
              {searchQuery.trim()
                ? `Não encontramos produtos ou ingredientes com "${searchQuery.trim()}".`
                : 'Não há produtos disponíveis nesta categoria.'}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoriaId('all');
                  setSearchQuery('');
                }}
                className="min-h-10 px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg cursor-pointer"
              >
                Mostrar todo o cardápio
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProdutos.map((prod) => {
              const wasJustAdded = justAddedId === prod.id_produto;
              return (
                <article
                  key={prod.id_produto}
                  className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-stone-300 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs text-stone-600 font-medium block">
                          {prod.categoria_nome}
                        </span>
                        <h2 className="text-base font-bold text-stone-900 mt-0.5 leading-snug">
                          {prod.nome}
                        </h2>
                      </div>
                      <span className="text-base font-bold font-mono tabular-nums text-stone-900 shrink-0">
                        {formatBRL(prod.preco)}
                      </span>
                    </div>
                    {prod.descricao && (
                      <p className="text-sm text-stone-600 mt-2 leading-relaxed">{prod.descricao}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCartItem(null);
                        setCustomizingProduto(prod);
                      }}
                      aria-label={`Personalizar ${prod.nome}`}
                      className="inline-flex items-center gap-1.5 min-h-10 sm:min-h-9 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Personalizar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickAdd(prod)}
                      aria-label={`Adicionar 1 ${prod.nome} à comanda`}
                      className={`inline-flex items-center gap-1.5 min-h-10 sm:min-h-9 px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        wasJustAdded
                          ? 'bg-emerald-700 hover:bg-emerald-800'
                          : 'bg-[#B91C1C] hover:bg-[#991B1B]'
                      }`}
                    >
                      {wasJustAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Adicionado</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Adicionar</span>
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Right: Comanda & Checkout (No nested forms!) */}
      <aside
        id="checkout-panel"
        className="lg:col-span-4 bg-white border border-stone-200 rounded-xl p-5 sm:p-6 lg:sticky lg:top-6 space-y-5"
        aria-label="Comanda do pedido atual"
      >
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Comanda Atual</h2>
            <p className="text-xs text-stone-600 tabular-nums">
              {totalUnitCount === 0
                ? 'Nenhum item selecionado'
                : `${totalUnitCount} ${totalUnitCount === 1 ? 'unidade' : 'unidades'} no pedido`}
            </p>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmClearOpen(true)}
              className="min-h-9 px-2.5 text-xs font-semibold text-stone-600 hover:text-[#B91C1C] hover:bg-red-50 rounded-md cursor-pointer"
            >
              Limpar comanda
            </button>
          )}
        </div>

        {lastOrderId !== null && (
          <div
            role="status"
            className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900 space-y-2"
          >
            <p className="font-semibold">Pedido #{lastOrderId} registrado com sucesso!</p>
            <p className="text-xs text-emerald-800">
              Enviado para a fila da cozinha com status inicial Recebido.
            </p>
            <button
              type="button"
              onClick={onGoToOrders}
              className="text-xs font-semibold underline hover:no-underline cursor-pointer"
            >
              Acompanhar na fila de pedidos
            </button>
          </div>
        )}

        {checkoutError && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 font-medium"
          >
            {checkoutError}
          </div>
        )}

        {/* Attendance & Customer section (outside checkout form so inline customer form is never nested) */}
        <div className="space-y-4">
          <div>
            <span className="block text-xs font-semibold text-stone-700 mb-1.5">
              Tipo de Atendimento
            </span>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-lg" role="group" aria-label="Tipo de atendimento">
              <button
                type="button"
                aria-pressed={tipo === 'BALCAO'}
                onClick={() => {
                  setTipo('BALCAO');
                  setCheckoutError(null);
                }}
                className={`min-h-10 sm:min-h-8 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  tipo === 'BALCAO'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Balcão
              </button>
              <button
                type="button"
                aria-pressed={tipo === 'ENTREGA'}
                onClick={() => {
                  setTipo('ENTREGA');
                  setCheckoutError(null);
                }}
                className={`min-h-10 sm:min-h-8 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  tipo === 'ENTREGA'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Entrega
              </button>
            </div>
          </div>

          {/* Cliente */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="pedido-cliente" className="text-xs font-semibold text-stone-700">
                Cliente {tipo === 'ENTREGA' ? '(obrigatório para entrega)' : '(opcional)'}
              </label>
              <button
                type="button"
                aria-expanded={showNewCliente}
                onClick={() => {
                  setShowNewCliente((v) => !v);
                  setClienteError(null);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#B91C1C] hover:underline cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{showNewCliente ? 'Cancelar' : 'Novo cliente'}</span>
              </button>
            </div>

            {clienteSuccess && !showNewCliente && (
              <p role="status" className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1.5 mb-2">
                {clienteSuccess}
              </p>
            )}

            {!showNewCliente ? (
              <>
                <select
                  id="pedido-cliente"
                  value={idCliente ?? ''}
                  onChange={(e) => {
                    setIdCliente(e.target.value ? Number(e.target.value) : null);
                    setCheckoutError(null);
                  }}
                  className="w-full min-h-10 px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
                >
                  <option value="">
                    {tipo === 'BALCAO'
                      ? 'Balcão (sem cadastro)'
                      : 'Selecione um cliente para entrega...'}
                  </option>
                  {clientes.map((c) => (
                    <option key={c.id_cliente} value={c.id_cliente}>
                      {c.nome} (#{c.id_cliente})
                    </option>
                  ))}
                </select>
                {tipo === 'ENTREGA' && idCliente === null && (
                  <p className="text-xs text-amber-800 mt-1.5">
                    Selecione ou cadastre um cliente com endereço para confirmar a entrega.
                  </p>
                )}
                {selectedCliente && (
                  <p className="text-xs text-stone-600 mt-1.5 bg-stone-50 border border-stone-200 rounded-md px-2.5 py-1.5">
                    {selectedCliente.telefone || 'Sem telefone'} ·{' '}
                    {selectedCliente.endereco || 'Sem endereço cadastrado'}
                  </p>
                )}
              </>
            ) : (
              <form
                onSubmit={handleSaveCliente}
                className="p-3.5 bg-stone-50 border border-stone-200 rounded-lg space-y-2.5"
              >
                <p className="text-xs font-semibold text-stone-900">Cadastrar novo cliente</p>
                {clienteError && (
                  <p role="alert" className="text-xs text-red-900 bg-red-50 border border-red-200 rounded px-2.5 py-1.5">
                    {clienteError}
                  </p>
                )}
                <div>
                  <label htmlFor="novo-cliente-nome" className="sr-only">
                    Nome completo do cliente
                  </label>
                  <input
                    id="novo-cliente-nome"
                    type="text"
                    value={novoNome}
                    onChange={(e) => {
                      setNovoNome(e.target.value);
                      if (clienteError) setClienteError(null);
                    }}
                    placeholder="Nome completo *"
                    className="w-full min-h-10 px-3 py-1.5 text-sm bg-white border border-stone-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="novo-cliente-telefone" className="sr-only">
                    Telefone do cliente
                  </label>
                  <input
                    id="novo-cliente-telefone"
                    type="text"
                    value={novoTelefone}
                    onChange={(e) => setNovoTelefone(e.target.value)}
                    placeholder="Telefone (ex.: (35) 99100-0099)"
                    className="w-full min-h-10 px-3 py-1.5 text-sm bg-white border border-stone-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="novo-cliente-endereco" className="sr-only">
                    Endereço completo do cliente
                  </label>
                  <input
                    id="novo-cliente-endereco"
                    type="text"
                    value={novoEndereco}
                    onChange={(e) => setNovoEndereco(e.target.value)}
                    placeholder="Endereço completo (rua, número, bairro)"
                    className="w-full min-h-10 px-3 py-1.5 text-sm bg-white border border-stone-300 rounded-md"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingCliente}
                  className="w-full min-h-10 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-md disabled:opacity-50 cursor-pointer"
                >
                  {savingCliente ? 'Salvando cliente...' : 'Salvar e Selecionar Cliente'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Checkout Form (Payment, Cart Items, Total & Submit) */}
        <form onSubmit={handleCheckout} className="space-y-4">
          {/* Forma de Pagamento */}
          <div>
            <span className="block text-xs font-semibold text-stone-700 mb-1.5">
              Forma de Pagamento
            </span>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-lg" role="group" aria-label="Forma de pagamento">
              {PAYMENT_OPTIONS.map((fp) => (
                <button
                  key={fp.value}
                  type="button"
                  aria-pressed={formaPagamento === fp.value}
                  onClick={() => setFormaPagamento(fp.value)}
                  className={`min-h-10 sm:min-h-8 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    formaPagamento === fp.value
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {fp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Itens no Carrinho */}
          <div className="border-t border-stone-200 pt-4">
            <h3 className="text-xs font-semibold text-stone-700 mb-2.5">
              Itens na Comanda ({cart.length})
            </h3>
            {cart.length === 0 ? (
              <div className="py-6 px-4 text-center border border-dashed border-stone-300 rounded-lg">
                <p className="text-xs text-stone-600">
                  Escolha um lanche ou porção no cardápio ao lado para montar o pedido.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-stone-200 max-h-80 overflow-y-auto pr-1">
                {cart.map((item) => {
                  const sub = calculateItemSubtotal(
                    item.preco_unitario,
                    item.quantidade,
                    item.adicionais
                  );
                  return (
                    <li key={item.tempId} className="py-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-stone-900 truncate">{item.nome}</p>
                          <p className="text-xs text-stone-600 font-mono tabular-nums">
                            {item.quantidade}x {formatBRL(item.preco_unitario)}
                          </p>
                        </div>
                        <span className="text-sm font-bold font-mono tabular-nums text-stone-900 shrink-0">
                          {formatBRL(sub)}
                        </span>
                      </div>

                      {item.adicionais.length > 0 && (
                        <p className="text-xs text-stone-600">
                          + {item.adicionais.map((a) => `${a.quantidade}x ${a.nome}`).join(', ')}
                        </p>
                      )}
                      {item.observacao && (
                        <p className="text-xs text-stone-600 italic">Obs.: {item.observacao}</p>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onUpdateCartQty(item.tempId, -1)}
                            aria-label={`Diminuir quantidade de ${item.nome}`}
                            className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center border border-stone-300 rounded-md hover:bg-stone-100 text-stone-800 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                          <span className="w-6 text-center text-xs font-mono font-semibold tabular-nums">
                            {item.quantidade}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateCartQty(item.tempId, 1)}
                            aria-label={`Aumentar quantidade de ${item.nome}`}
                            className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center border border-stone-300 rounded-md hover:bg-stone-100 text-stone-800 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditCartItem(item)}
                            aria-label={`Editar ${item.nome}`}
                            className="min-h-9 sm:min-h-8 px-2 flex items-center gap-1 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-md cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveFromCart(item.tempId)}
                            aria-label={`Remover ${item.nome}`}
                            className="min-w-9 min-h-9 sm:min-w-8 sm:min-h-8 flex items-center justify-center text-stone-500 hover:text-[#B91C1C] hover:bg-red-50 rounded-md cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-stone-200 pt-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-stone-700">Total do Pedido</span>
              <span className="text-xl font-extrabold font-mono tabular-nums text-stone-900">
                {formatBRL(orderTotal)}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting || cart.length === 0}
              className="w-full min-h-11 py-3 px-4 text-sm font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
            >
              {submitting ? 'Registrando pedido...' : 'Finalizar Pedido'}
            </button>
          </div>
        </form>
      </aside>

      {/* Compact Mobile Bottom Bar (<= 15% mobile viewport height) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-stone-200 px-4 py-2.5 shadow-lg flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-stone-600 tabular-nums">
              {totalUnitCount} {totalUnitCount === 1 ? 'item' : 'itens'} na comanda
            </p>
            <p className="text-base font-extrabold font-mono tabular-nums text-stone-900">
              {formatBRL(orderTotal)}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              document.getElementById('checkout-panel')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="min-h-11 px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            Ir para Checkout
          </button>
        </div>
      )}

      <ItemCustomizerModal
        produto={customizingProduto}
        editingItem={editingCartItem}
        adicionaisDisponiveis={adicionaisDisponiveis}
        onClose={() => {
          setCustomizingProduto(null);
          setEditingCartItem(null);
        }}
        onConfirm={(item, editingTempId) => {
          onUpsertCartItem(item, editingTempId);
          setCustomizingProduto(null);
          setEditingCartItem(null);
          setLastOrderId(null);
          setCheckoutError(null);
        }}
      />

      <ConfirmDialog
        open={confirmClearOpen}
        title="Limpar todos os itens da comanda?"
        description={`Você está prestes a remover ${cart.length} ${cart.length === 1 ? 'item' : 'itens'} (${formatBRL(orderTotal)}) da comanda atual.`}
        confirmLabel="Sim, limpar comanda"
        cancelLabel="Voltar"
        tone="danger"
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={() => {
          onClearCart();
          setConfirmClearOpen(false);
        }}
      />
    </div>
  );
}
