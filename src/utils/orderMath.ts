import type {
  CartItem,
  FormaPagamento,
  ItemPedido,
  Produto,
  StatusPedido,
  TipoPedido,
} from '../types/database';

export interface AdicionalInput {
  quantidade: number;
  preco_adicional: number;
}

export interface OrderItemInput {
  id_produto: number;
  quantidade: number;
  preco_unitario: number;
  adicionais: Array<{ quantidade: number; valor: number }>;
}

export interface PedidoValidationInput {
  tipo: TipoPedido;
  id_cliente: number | null;
  forma_pagamento: FormaPagamento;
  itens: Array<{ id_produto: number; quantidade: number }>;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateAdicionalValor(quantidade: number, precoAdicional: number): number {
  if (quantidade <= 0 || precoAdicional < 0) return 0;
  return roundMoney(quantidade * precoAdicional);
}

export function calculateItemSubtotal(
  precoUnitario: number,
  quantidade: number,
  adicionais: AdicionalInput[]
): number {
  const base = roundMoney(precoUnitario * quantidade);
  const extras = adicionais.reduce(
    (sum, add) => sum + calculateAdicionalValor(add.quantidade, add.preco_adicional),
    0
  );
  return roundMoney(base + extras);
}

export function calculatePersistedItemTotal(item: {
  preco_unitario: number;
  quantidade: number;
  adicionais: Array<{ valor: number }>;
}): number {
  const base = roundMoney(item.preco_unitario * item.quantidade);
  const extras = item.adicionais.reduce((sum, add) => sum + roundMoney(add.valor), 0);
  return roundMoney(base + extras);
}

export function calculateOrderTotal(items: OrderItemInput[]): number {
  const total = items.reduce((acc, item) => {
    const itemBase = roundMoney(item.preco_unitario * item.quantidade);
    const extras = item.adicionais.reduce((aSum, a) => aSum + roundMoney(a.valor), 0);
    return acc + itemBase + extras;
  }, 0);
  return roundMoney(total);
}

export function calculateCompraTotal(
  itens: Array<{ quantidade: number; valor_unitario: number }>
): number {
  const total = itens.reduce(
    (acc, item) => acc + roundMoney(item.quantidade * item.valor_unitario),
    0
  );
  return roundMoney(total);
}

export function validatePedidoPayload(
  payload: PedidoValidationInput
): { valid: boolean; error?: string } {
  if (payload.tipo !== 'BALCAO' && payload.tipo !== 'ENTREGA') {
    return { valid: false, error: "Tipo inválido: deve ser 'BALCAO' ou 'ENTREGA'." };
  }

  if (
    payload.forma_pagamento !== 'DINHEIRO' &&
    payload.forma_pagamento !== 'PIX' &&
    payload.forma_pagamento !== 'CARTAO'
  ) {
    return {
      valid: false,
      error: "Forma de pagamento inválida: deve ser 'DINHEIRO', 'PIX' ou 'CARTAO'.",
    };
  }

  // Enforces CHECK constraint ck_entrega_com_cliente
  if (payload.tipo === 'ENTREGA' && (payload.id_cliente === null || payload.id_cliente === undefined)) {
    return {
      valid: false,
      error:
        'Pedido para entrega exige um cliente selecionado com endereço.',
    };
  }

  if (!Array.isArray(payload.itens) || payload.itens.length === 0) {
    return { valid: false, error: 'Adicione pelo menos 1 item ao pedido antes de finalizar.' };
  }

  for (const item of payload.itens) {
    if (!Number.isInteger(item.id_produto) || item.id_produto <= 0) {
      return { valid: false, error: 'Produto inválido no pedido.' };
    }
    if (!Number.isInteger(item.quantidade) || item.quantidade <= 0) {
      return { valid: false, error: 'A quantidade do item deve ser maior que zero.' };
    }
  }

  return { valid: true };
}

export function validateClienteInput(nome: string): { valid: boolean; error?: string } {
  const clean = nome.trim();
  if (!clean) {
    return { valid: false, error: 'Informe o nome completo do cliente para continuar.' };
  }
  if (clean.length < 2) {
    return { valid: false, error: 'O nome do cliente deve ter pelo menos 2 caracteres.' };
  }
  return { valid: true };
}

export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function filterProdutos(
  produtos: Produto[],
  selectedCategoriaId: number | 'all',
  query: string
): Produto[] {
  const q = normalizeSearchText(query);
  return produtos.filter((p) => {
    const catMatch = selectedCategoriaId === 'all' || p.id_categoria === selectedCategoriaId;
    if (!catMatch) return false;
    if (!q) return true;
    return (
      normalizeSearchText(p.nome).includes(q) ||
      normalizeSearchText(p.descricao ?? '').includes(q) ||
      normalizeSearchText(p.categoria_nome ?? '').includes(q) ||
      (p.ingredientes ?? []).some((ing) => normalizeSearchText(ing).includes(q))
    );
  });
}

function getCartItemSignature(item: Pick<CartItem, 'id_produto' | 'observacao' | 'adicionais'>): string {
  const adds = [...item.adicionais]
    .filter((a) => a.quantidade > 0)
    .sort((a, b) => a.id_ingrediente - b.id_ingrediente)
    .map((a) => `${a.id_ingrediente}:${a.quantidade}`)
    .join(',');
  return `${item.id_produto}|${item.observacao.trim()}|${adds}`;
}

export function upsertCartItem(
  cart: CartItem[],
  incoming: CartItem,
  editingTempId?: string
): CartItem[] {
  if (editingTempId) {
    return cart.map((item) =>
      item.tempId === editingTempId ? { ...incoming, tempId: editingTempId } : item
    );
  }

  const signature = getCartItemSignature(incoming);
  const existingIdx = cart.findIndex((item) => getCartItemSignature(item) === signature);
  if (existingIdx === -1) {
    return [...cart, incoming];
  }

  return cart.map((item, idx) => {
    if (idx !== existingIdx) return item;
    // Merge base quantity and keep additional quantities scaled proportionally when identical
    const mergedAdicionais = item.adicionais.map((add) => {
      const match = incoming.adicionais.find((a) => a.id_ingrediente === add.id_ingrediente);
      return {
        ...add,
        quantidade: add.quantidade + (match?.quantidade ?? 0),
      };
    });
    return {
      ...item,
      quantidade: item.quantidade + incoming.quantidade,
      adicionais: mergedAdicionais,
    };
  });
}

export function getAllowedNextStatuses(current: StatusPedido): StatusPedido[] {
  switch (current) {
    case 'RECEBIDO':
      return ['EM_PREPARO', 'CANCELADO'];
    case 'EM_PREPARO':
      return ['PRONTO', 'CANCELADO'];
    case 'PRONTO':
      return ['ENTREGUE', 'CANCELADO'];
    case 'ENTREGUE':
      return [];
    case 'CANCELADO':
      return [];
  }
}

export function formatBRL(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? Number(value) : value ?? 0;
  if (!Number.isFinite(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
