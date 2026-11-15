import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAdicionalValor,
  calculateCompraTotal,
  calculateItemSubtotal,
  calculateOrderTotal,
  getAllowedNextStatuses,
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
  assert.match(invalidEntrega.error ?? '', /ck_entrega_com_cliente/);

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

test('getAllowedNextStatuses enforces order workflow', () => {
  assert.deepEqual(getAllowedNextStatuses('RECEBIDO'), ['EM_PREPARO', 'CANCELADO']);
  assert.deepEqual(getAllowedNextStatuses('EM_PREPARO'), ['PRONTO', 'CANCELADO']);
  assert.deepEqual(getAllowedNextStatuses('PRONTO'), ['ENTREGUE', 'CANCELADO']);
  assert.deepEqual(getAllowedNextStatuses('ENTREGUE'), []);
  assert.deepEqual(getAllowedNextStatuses('CANCELADO'), []);
});
