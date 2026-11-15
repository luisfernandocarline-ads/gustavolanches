import { useMemo, useState } from 'react';
import { Minus, Plus, Search, Trash2, UserPlus } from 'lucide-react';
import type {
  CartItem,
  Categoria,
  Cliente,
  FormaPagamento,
  Ingrediente,
  Produto,
  TipoPedido,
} from '../types/database';
import { calculateItemSubtotal, calculateOrderTotal, formatBRL, validatePedidoPayload } from '../utils/orderMath';
import { ItemCustomizerModal } from './ItemCustomizerModal';

interface PosMenuViewProps {
  categorias: Categoria[];
  produtos: Produto[];
  ingredientes: Ingrediente[];
  clientes: Cliente[];
  cart: CartItem[];
  onAddToCart: (item: CartItem) => void;
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

export function PosMenuView({
  categorias,
  produtos,
  ingredientes,
  clientes,
  cart,
  onAddToCart,
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

  const [tipo, setTipo] = useState<TipoPedido>('BALCAO');
  const [idCliente, setIdCliente] = useState<number | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX');

  const [showNewCliente, setShowNewCliente] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novoEndereco, setNovoEndereco] = useState('');
  const [savingCliente, setSavingCliente] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);

  const adicionaisDisponiveis = useMemo(
    () => ingredientes.filter((i) => i.preco_adicional !== null),
    [ingredientes]
  );

  const filteredProdutos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return produtos.filter((p) => {
      const catMatch = selectedCategoriaId === 'all' || p.id_categoria === selectedCategoriaId;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        p.nome.toLowerCase().includes(q) ||
        (p.descricao ?? '').toLowerCase().includes(q) ||
        (p.ingredientes ?? []).some((ing) => ing.toLowerCase().includes(q))
      );
    });
  }, [produtos, selectedCategoriaId, searchQuery]);

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

  const selectedCliente = useMemo(
    () => clientes.find((c) => c.id_cliente === idCliente) ?? null,
    [clientes, idCliente]
  );

  const handleSaveCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) {
      setErrorMsg('Informe o nome do cliente (campo obrigatório NOT NULL).');
      return;
    }
    setSavingCliente(true);
    setErrorMsg(null);
    try {
      const created = await onCreateCliente(novoNome, novoTelefone, novoEndereco);
      setIdCliente(created.id_cliente);
      setNovoNome('');
      setNovoTelefone('');
      setNovoEndereco('');
      setShowNewCliente(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao cadastrar cliente.');
    } finally {
      setSavingCliente(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLastOrderId(null);

    const validation = validatePedidoPayload({
      tipo,
      id_cliente: idCliente,
      forma_pagamento: formaPagamento,
      itens: cart.map((c) => ({ id_produto: c.id_produto, quantidade: c.quantidade })),
    });

    if (!validation.valid) {
      setErrorMsg(validation.error ?? 'Dados inválidos no pedido.');
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
      onClearCart();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao gravar pedido no PostgreSQL.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left/Main: Cardápio (categoria + produto + produto_ingrediente) */}
      <section className="lg:col-span-8 space-y-6" aria-labelledby="cardapio-heading">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <h1 id="cardapio-heading" className="text-2xl font-bold tracking-tight text-stone-900">
              Cardápio & Frente de Caixa (PDV)
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              {produtos.length} produtos em {categorias.length} categorias · composição vinculada via{' '}
              <span className="font-mono text-xs text-stone-800">produto_ingrediente</span>
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search
              className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="menu-search" className="sr-only">
              Buscar no cardápio
            </label>
            <input
              id="menu-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar lanche ou ingrediente..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
            />
          </div>
        </div>

        {/* Category segmented filter tabs */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Categorias do cardápio">
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategoriaId === 'all'}
            onClick={() => setSelectedCategoriaId('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategoriaId === cat.id_categoria
                  ? 'bg-stone-900 text-white'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
            >
              {cat.nome}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {filteredProdutos.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-xl p-10 text-center">
            <p className="text-sm font-medium text-stone-900">Nenhum produto encontrado</p>
            <p className="text-xs text-stone-500 mt-1">
              Tente limpar a busca ou selecionar outra categoria.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategoriaId('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 text-xs font-semibold text-stone-800 border border-stone-300 rounded-lg hover:bg-stone-100 cursor-pointer"
            >
              Mostrar todo o cardápio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProdutos.map((prod) => (
              <article
                key={prod.id_produto}
                className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-stone-300 transition-colors"
              >
                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs text-stone-500 font-medium">
                      {prod.categoria_nome} · <span className="font-mono">#{prod.id_produto}</span>
                    </span>
                    <span className="text-base font-bold font-mono tabular-nums text-stone-900 shrink-0">
                      {formatBRL(prod.preco)}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-stone-900 mt-1.5">{prod.nome}</h2>
                  {prod.descricao && (
                    <p className="text-sm text-stone-600 mt-1.5 leading-relaxed">{prod.descricao}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
                  <span className="text-xs text-stone-500 truncate">
                    {prod.ingredientes && prod.ingredientes.length > 0
                      ? `${prod.ingredientes.length} ingredientes cadastrados`
                      : 'Sem composição'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCustomizingProduto(prod)}
                    aria-label={`Adicionar ${prod.nome} ao pedido`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Right: Pedido Atual (pedido + item_pedido + item_pedido_adicional) */}
      <aside
        id="checkout-panel"
        className="lg:col-span-4 bg-white border border-stone-200 rounded-xl p-6 lg:sticky lg:top-6 space-y-5"
        aria-label="Comanda do pedido atual"
      >
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Novo Pedido</h2>
            <p className="text-xs text-stone-500 font-mono">INSERT INTO pedido / item_pedido</p>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={onClearCart}
              className="text-xs font-medium text-stone-500 hover:text-[#B91C1C] cursor-pointer"
            >
              Limpar itens
            </button>
          )}
        </div>

        {lastOrderId !== null && (
          <div
            role="status"
            className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900 space-y-2"
          >
            <p className="font-semibold">Pedido #{lastOrderId} gravado no PostgreSQL!</p>
            <p className="text-xs text-emerald-800">
              Status inicial <span className="font-mono">RECEBIDO</span> com cálculo automático de{' '}
              <span className="font-mono">valor_total</span>.
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

        {errorMsg && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 font-medium"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleCheckout} className="space-y-4">
          {/* Tipo: BALCAO | ENTREGA */}
          <div>
            <span className="block text-xs font-semibold text-stone-700 mb-1.5">
              Tipo de Pedido (<span className="font-mono">pedido.tipo</span>)
            </span>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setTipo('BALCAO');
                  setErrorMsg(null);
                }}
                className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  tipo === 'BALCAO'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                BALCAO
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipo('ENTREGA');
                  setErrorMsg(null);
                }}
                className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  tipo === 'ENTREGA'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                ENTREGA
              </button>
            </div>
          </div>

          {/* Cliente */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="pedido-cliente" className="text-xs font-semibold text-stone-700">
                Cliente (<span className="font-mono">id_cliente</span>){' '}
                {tipo === 'ENTREGA' ? '* obrigatório' : '· opcional'}
              </label>
              <button
                type="button"
                onClick={() => setShowNewCliente((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#B91C1C] hover:underline cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{showNewCliente ? 'Cancelar' : 'Novo cliente'}</span>
              </button>
            </div>

            {!showNewCliente ? (
              <>
                <select
                  id="pedido-cliente"
                  value={idCliente ?? ''}
                  onChange={(e) => setIdCliente(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
                >
                  <option value="">
                    {tipo === 'BALCAO'
                      ? 'Balcão (sem cadastro — id_cliente NULL)'
                      : 'Selecione um cliente para entrega...'}
                  </option>
                  {clientes.map((c) => (
                    <option key={c.id_cliente} value={c.id_cliente}>
                      #{c.id_cliente} · {c.nome}
                    </option>
                  ))}
                </select>
                {tipo === 'ENTREGA' && idCliente === null && (
                  <p className="text-xs text-amber-800 mt-1.5">
                    Restrição <span className="font-mono">ck_entrega_com_cliente</span>: entrega exige
                    cliente cadastrado.
                  </p>
                )}
                {selectedCliente && (
                  <p className="text-xs text-stone-600 mt-1.5">
                    {selectedCliente.telefone || 'Sem telefone'} ·{' '}
                    {selectedCliente.endereco || 'Sem endereço'}
                  </p>
                )}
              </>
            ) : (
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-lg space-y-2.5">
                <p className="text-xs font-semibold text-stone-800">Cadastrar na tabela cliente</p>
                <input
                  type="text"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Nome completo *"
                  aria-label="Nome do novo cliente"
                  className="w-full px-3 py-1.5 text-sm bg-white border border-stone-300 rounded-md"
                />
                <input
                  type="text"
                  value={novoTelefone}
                  onChange={(e) => setNovoTelefone(e.target.value)}
                  placeholder="Telefone (ex.: (35) 99100-0099)"
                  aria-label="Telefone do novo cliente"
                  className="w-full px-3 py-1.5 text-sm bg-white border border-stone-300 rounded-md"
                />
                <input
                  type="text"
                  value={novoEndereco}
                  onChange={(e) => setNovoEndereco(e.target.value)}
                  placeholder="Endereço completo"
                  aria-label="Endereço do novo cliente"
                  className="w-full px-3 py-1.5 text-sm bg-white border border-stone-300 rounded-md"
                />
                <button
                  type="button"
                  disabled={savingCliente}
                  onClick={handleSaveCliente}
                  className="w-full py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-md disabled:opacity-50 cursor-pointer"
                >
                  {savingCliente ? 'Salvando...' : 'Salvar Cliente'}
                </button>
              </div>
            )}
          </div>

          {/* Forma de Pagamento */}
          <div>
            <span className="block text-xs font-semibold text-stone-700 mb-1.5">
              Pagamento (<span className="font-mono">forma_pagamento</span>)
            </span>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-lg">
              {(['PIX', 'DINHEIRO', 'CARTAO'] as FormaPagamento[]).map((fp) => (
                <button
                  key={fp}
                  type="button"
                  onClick={() => setFormaPagamento(fp)}
                  className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    formaPagamento === fp
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {fp}
                </button>
              ))}
            </div>
          </div>

          {/* Itens no Carrinho */}
          <div className="border-t border-stone-200 pt-4">
            <h3 className="text-xs font-semibold text-stone-700 mb-2.5">
              Itens do Pedido ({cart.length})
            </h3>
            {cart.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-stone-300 rounded-lg">
                <p className="text-xs text-stone-500">
                  Selecione um lanche ao lado para iniciar a comanda.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-stone-200 max-h-72 overflow-y-auto pr-1">
                {cart.map((item) => {
                  const sub = calculateItemSubtotal(
                    item.preco_unitario,
                    item.quantidade,
                    item.adicionais
                  );
                  return (
                    <li key={item.tempId} className="py-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-stone-900 truncate">{item.nome}</p>
                          <p className="text-xs text-stone-500 font-mono tabular-nums">
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
                        <p className="text-xs text-stone-500 italic">Obs.: {item.observacao}</p>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onUpdateCartQty(item.tempId, -1)}
                            aria-label={`Diminuir quantidade de ${item.nome}`}
                            className="w-7 h-7 flex items-center justify-center border border-stone-300 rounded hover:bg-stone-100 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-mono tabular-nums">
                            {item.quantidade}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateCartQty(item.tempId, 1)}
                            aria-label={`Aumentar quantidade de ${item.nome}`}
                            className="w-7 h-7 flex items-center justify-center border border-stone-300 rounded hover:bg-stone-100 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveFromCart(item.tempId)}
                          aria-label={`Remover ${item.nome}`}
                          className="p-1.5 text-stone-400 hover:text-[#B91C1C] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-stone-200 pt-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-stone-700">
                Total (<span className="font-mono">valor_total</span>)
              </span>
              <span className="text-xl font-extrabold font-mono tabular-nums text-stone-900">
                {formatBRL(orderTotal)}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting || cart.length === 0}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
            >
              {submitting ? 'Registrando no PostgreSQL...' : 'Finalizar Pedido'}
            </button>
          </div>
        </form>
      </aside>

      <ItemCustomizerModal
        produto={customizingProduto}
        adicionaisDisponiveis={adicionaisDisponiveis}
        onClose={() => setCustomizingProduto(null)}
        onConfirm={(item) => {
          onAddToCart(item);
          setCustomizingProduto(null);
          setLastOrderId(null);
        }}
      />
    </div>
  );
}
