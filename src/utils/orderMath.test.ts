import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAdicionalValor,
  calculateCompraTotal,
  calculateItemSubtotal,
  calculateOrderTotal,
  calculatePersistedItemTotal,
  filterProdutos,
  getAllowedNextStatuses,
  upsertCartItem,
  validateClienteInput,
  validatePedidoPayload,
} from './orderMath';

test('calculateAdicionalValor multiplies quantity and additional price accurately', () => {
  assert.equal(calculateAdicionalValor(2, 1.5), 3.0);
  assert.equal(calculateAdicionalValor(1, 4.0), 4.0);
  assert.equal(calculateAdicionalValor(0, 4.0), 0);
});

test('calculateItemSubtotal sums base product price and additionals', () => {
  // 2x X-Tudo (24.00) + 1x Catupiry (3.00) = 51.00
  const subtotal = calculateItemSubtotal(24.0, 2, [{ quantidade: 1, preco_adicional: 3.0 }]);
  assert.equal(subtotal, 51.0);
});

test('calculatePersistedItemTotal sums item base and persisted additionals', () => {
  const total = calculatePersistedItemTotal({
    preco_unitario: 38.0,
    quantidade: 2,
    adicionais: [{ valor: 3.0 }, { valor: 4.0 }],
  });
  assert.equal(total, 83.0);
});

test('calculateOrderTotal matches pedido #10 seed math (2x38 + 36 + 2*1.5 = 115)', () => {
  const total = calculateOrderTotal([
    {
      id_produto: 11,
      quantidade: 2,
      preco_unitario: 38.0,
      adicionais: [{ quantidade: 2, valor: 3.0 }],
    },
    {
      id_produto: 24,
      quantidade: 1,
      preco_unitario: 36.0,
      adicionais: [],
    },
  ]);
  assert.equal(total, 115.0);
});

test('calculateCompraTotal sums purchase items accurately', () => {
  const total = calculateCompraTotal([
    { quantidade: 100, valor_unitario: 2.8 },
    { quantidade: 8, valor_unitario: 38.0 },
    { quantidade: 10, valor_unitario: 32.0 },
    { quantidade: 10, valor_unitario: 22.0 },
  ]);
  assert.equal(total, 1124.0);
});

test('validatePedidoPayload enforces ck_entrega_com_cliente constraint', () => {
  const invalidEntrega = validatePedidoPayload({
    tipo: 'ENTREGA',
    id_cliente: null,
    forma_pagamento: 'PIX',
    itens: [{ id_produto: 1, quantidade: 1 }],
  });
  assert.equal(invalidEntrega.valid, false);
  assert.match(invalidEntrega.error ?? '', /entrega/i);

  const validBalcaoSemCliente = validatePedidoPayload({
    tipo: 'BALCAO',
    id_cliente: null,
    forma_pagamento: 'DINHEIRO',
    itens: [{ id_produto: 1, quantidade: 1 }],
  });
  assert.equal(validBalcaoSemCliente.valid, true);

  const validEntregaComCliente = validatePedidoPayload({
    tipo: 'ENTREGA',
    id_cliente: 3,
    forma_pagamento: 'CARTAO',
    itens: [{ id_produto: 5, quantidade: 2 }],
  });
  assert.equal(validEntregaComCliente.valid, true);
});

test('validatePedidoPayload rejects empty items and non-positive quantities', () => {
  assert.equal(
    validatePedidoPayload({
      tipo: 'BALCAO',
      id_cliente: null,
      forma_pagamento: 'PIX',
      itens: [],
    }).valid,
    false
  );

  assert.equal(
    validatePedidoPayload({
      tipo: 'BALCAO',
      id_cliente: null,
      forma_pagamento: 'PIX',
      itens: [{ id_produto: 1, quantidade: 0 }],
    }).valid,
    false
  );
});

test('validateClienteInput rejects empty or short names', () => {
  assert.equal(validateClienteInput('   ').valid, false);
  assert.equal(validateClienteInput('A').valid, false);
  assert.equal(validateClienteInput('Ana Clara').valid, true);
});

test('filterProdutos searches accents-insensitively across name, description, and ingredients', () => {
  const sample = [
    {
      id_produto: 1,
      id_categoria: 1,
      categoria_nome: 'Lanches Tradicionais',
      nome: 'X-Salada',
      descricao: 'Pão, hambúrguer, presunto, muçarela, tomate e alface',
      preco: 18,
      ingredientes: ['Pão', 'Hambúrguer', 'Muçarela'],
    },
    {
      id_produto: 2,
      id_categoria: 5,
      categoria_nome: 'Lanches com Filé',
      nome: 'X-Filé',
      descricao: 'Pão e filé mignon',
      preco: 35,
      ingredientes: ['Pão', 'Filé mignon'],
    },
  ];

  assert.equal(filterProdutos(sample, 'all', 'mucarela').length, 1);
  assert.equal(filterProdutos(sample, 'all', 'file').length, 1);
  assert.equal(filterProdutos(sample, 1, 'file').length, 0);
  assert.equal(filterProdutos(sample, 'all', 'inexistente').length, 0);
});

test('upsertCartItem merges identical items and updates item in edit mode', () => {
  const baseItem = {
    tempId: 't1',
    id_produto: 1,
    nome: 'X-Tudo',
    preco_unitario: 24,
    quantidade: 1,
    observacao: '',
    adicionais: [{ id_ingrediente: 6, nome: 'Bacon', quantidade: 1, preco_adicional: 4 }],
  };
  const sameItem = { ...baseItem, tempId: 't2', quantidade: 2, adicionais: [{ id_ingrediente: 6, nome: 'Bacon', quantidade: 1, preco_adicional: 4 }] };
  const merged = upsertCartItem([baseItem], sameItem);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].quantidade, 3);
  assert.equal(merged[0].adicionais[0].quantidade, 2);

  const edited = upsertCartItem(merged, { ...baseItem, observacao: 'Sem milho', quantidade: 1 }, 't1');
  assert.equal(edited.length, 1);
  assert.equal(edited[0].observacao, 'Sem milho');
  assert.equal(edited[0].quantidade, 1);
});

test('getAllowedNextStatuses enforces order workflow', () => {
  assert.deepEqual(getAllowedNextStatuses('RECEBIDO'), ['EM_PREPARO', 'CANCELADO']);
  assert.deepEqual(getAllowedNextStatuses('EM_PREPARO'), ['PRONTO', 'CANCELADO']);
  assert.deepEqual(getAllowedNextStatuses('PRONTO'), ['ENTREGUE', 'CANCELADO']);
  assert.deepEqual(getAllowedNextStatuses('ENTREGUE'), []);
  assert.deepEqual(getAllowedNextStatuses('CANCELADO'), []);
});
