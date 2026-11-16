import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createClienteLocal,
  createPedidoLocal,
  getTableRowsLocal,
  LEGACY_STORAGE_KEYS,
  readLocalDbState,
  resetLocalDbState,
  runAnalyticalQueryLocal,
  STORAGE_KEY,
  toBootstrapData,
  updatePedidoStatusLocal,
  type StorageLike,
} from '../data/mockDatabase.ts';
import { ANALYTICAL_QUERIES } from '../db/sqlScripts.ts';

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, val) => {
      map.set(key, val);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

test('readLocalDbState starts with 0 clientes and 0 pedidos while keeping full menu and stock', () => {
  const legacyKey = LEGACY_STORAGE_KEYS[0];
  const emptyStorage = createMemoryStorage({ [legacyKey]: '{"stale":true}' });
  const seeded = readLocalDbState(emptyStorage);
  assert.equal(seeded.categorias.length, 7);
  assert.equal(seeded.produtos.length, 25);
  assert.equal(seeded.fornecedores.length, 6);
  assert.equal(seeded.ingredientes.length, 22);
  assert.equal(seeded.compras.length, 10);
  assert.equal(seeded.clientes.length, 0);
  assert.equal(seeded.pedidos.length, 0);
  assert.equal(seeded.itensPedido.length, 0);
  assert.equal(seeded.itensPedidoAdicional.length, 0);
  assert.ok(emptyStorage.getItem(STORAGE_KEY));
  assert.equal(emptyStorage.getItem(legacyKey), null);

  const corruptedStorage = createMemoryStorage({ [STORAGE_KEY]: '{invalid json...' });
  const recovered = readLocalDbState(corruptedStorage);
  assert.equal(recovered.produtos.length, 25);
  assert.equal(recovered.clientes.length, 0);
  assert.equal(recovered.pedidos.length, 0);
});

test('localStorage persistence supports starting from #1 for cliente and pedido, status update, and reset to zero', () => {
  const storage = createMemoryStorage();
  const initial = toBootstrapData(readLocalDbState(storage));
  assert.equal(initial.produtos.length, 25);
  assert.equal(initial.clientes.length, 0);
  assert.equal(initial.pedidos.length, 0);

  const { cliente } = createClienteLocal('Mariana Local', '(35) 99999-1111', 'Rua A, 10', storage);
  assert.equal(cliente.id_cliente, 1);

  const prod = initial.produtos[0];
  const { id_pedido, bootstrap } = createPedidoLocal(
    {
      tipo: 'ENTREGA',
      id_cliente: cliente.id_cliente,
      forma_pagamento: 'PIX',
      itens: [
        {
          tempId: 'tmp-1',
          id_produto: prod.id_produto,
          nome: prod.nome,
          preco_unitario: prod.preco,
          quantidade: 2,
          observacao: 'Sem cebola',
          adicionais: [],
        },
      ],
    },
    storage
  );
  assert.equal(id_pedido, 1);
  assert.equal(bootstrap.pedidos.length, 1);

  const updated = updatePedidoStatusLocal(id_pedido, 'EM_PREPARO', storage);
  assert.equal(updated.bootstrap.pedidos.find((p) => p.id_pedido === id_pedido)?.status, 'EM_PREPARO');

  const pedidoRows = getTableRowsLocal('pedido', storage);
  assert.equal(pedidoRows.rows.length, 1);

  const reset = resetLocalDbState(storage);
  assert.equal(reset.clientes.length, 0);
  assert.equal(reset.pedidos.length, 0);
  assert.equal(reset.produtos.length, 25);
});

test('all 13 analytical DQL queries execute cleanly with 0 orders and after creating an order', () => {
  const storage = createMemoryStorage();

  for (const q of ANALYTICAL_QUERIES) {
    const res = runAnalyticalQueryLocal(q.id, storage);
    assert.ok(res.columns.length > 0, `Query ${q.id} returned columns`);
    assert.ok(Array.isArray(res.rows), `Query ${q.id} returned rows array`);
  }

  assert.equal(runAnalyticalQueryLocal(12, storage).rows.length, 25);
  assert.ok(runAnalyticalQueryLocal(3, storage).rows.length > 0);
  assert.ok(runAnalyticalQueryLocal(10, storage).rows.length > 0);

  const initial = toBootstrapData(readLocalDbState(storage));
  createPedidoLocal(
    {
      tipo: 'BALCAO',
      id_cliente: null,
      forma_pagamento: 'PIX',
      itens: [
        {
          tempId: 'tmp-2',
          id_produto: initial.produtos[0].id_produto,
          nome: initial.produtos[0].nome,
          preco_unitario: initial.produtos[0].preco,
          quantidade: 1,
          observacao: '',
          adicionais: [],
        },
      ],
    },
    storage
  );

  assert.equal(runAnalyticalQueryLocal(1, storage).rows.length, 1);
  assert.equal(runAnalyticalQueryLocal(12, storage).rows.length, 24);
  assert.equal(runAnalyticalQueryLocal(13, storage).rows.length, 1);
});
