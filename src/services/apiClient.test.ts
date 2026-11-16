import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createClienteLocal,
  createPedidoLocal,
  getTableRowsLocal,
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

test('readLocalDbState seeds Gustavo Lanches automatically on empty or corrupted localStorage', () => {
  const emptyStorage = createMemoryStorage();
  const seeded = readLocalDbState(emptyStorage);
  assert.equal(seeded.categorias.length, 7);
  assert.equal(seeded.produtos.length, 25);
  assert.equal(seeded.pedidos.length, 15);
  assert.ok(emptyStorage.getItem(STORAGE_KEY));

  const corruptedStorage = createMemoryStorage({ [STORAGE_KEY]: '{invalid json...' });
  const recovered = readLocalDbState(corruptedStorage);
  assert.equal(recovered.produtos.length, 25);
  assert.equal(recovered.clientes.length, 12);
});

test('localStorage persistence supports cliente creation, pedido creation, status update, table inspection, and reset', () => {
  const storage = createMemoryStorage();
  const initial = toBootstrapData(readLocalDbState(storage));
  assert.equal(initial.produtos.length, 25);
  assert.equal(initial.pedidos.length, 15);

  const { cliente } = createClienteLocal('Mariana Local', '(35) 99999-1111', 'Rua A, 10', storage);
  assert.equal(cliente.id_cliente, 13);

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
  assert.equal(id_pedido, 16);
  assert.equal(bootstrap.pedidos.length, 16);

  const updated = updatePedidoStatusLocal(id_pedido, 'EM_PREPARO', storage);
  assert.equal(updated.bootstrap.pedidos.find((p) => p.id_pedido === id_pedido)?.status, 'EM_PREPARO');

  const pedidoRows = getTableRowsLocal('pedido', storage);
  assert.equal(pedidoRows.rows.length, 16);

  const reset = resetLocalDbState(storage);
  assert.equal(reset.pedidos.length, 15);
});

test('all 13 analytical DQL queries execute cleanly over localStorage state', () => {
  const storage = createMemoryStorage();
  for (const q of ANALYTICAL_QUERIES) {
    const res = runAnalyticalQueryLocal(q.id, storage);
    assert.ok(res.columns.length > 0, `Query ${q.id} returned columns`);
    assert.ok(res.rows.length > 0, `Query ${q.id} returned rows`);
  }
});
