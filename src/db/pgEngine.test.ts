import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { ANALYTICAL_QUERIES, DDL_SQL, SEED_SQL, TABLE_COUNTS_SQL } from './sqlScripts.ts';
import {
  createClienteInDb,
  createPedidoInDb,
  ensureSchemaAndSeed,
  getBootstrapDataFromDb,
  getTableRowsFromDb,
  resetDatabaseInDb,
  runAnalyticalQueryInDb,
  runCustomSelectQueryInDb,
  updatePedidoStatusInDb,
} from './pgCore.ts';

test('PostgreSQL DDL, SEED_SQL, constraints, and all 13 analytical queries execute cleanly', async () => {
  const db = new PGlite();
  await db.waitReady;

  await db.exec(DDL_SQL);
  await db.exec(SEED_SQL);

  // Verify exact row counts from 02_inserir_dados
  const countsRes = await db.query<{ tabela: string; registros: number }>(TABLE_COUNTS_SQL);
  const countMap = new Map(countsRes.rows.map((r) => [r.tabela, r.registros]));

  assert.equal(countMap.get('categoria'), 7);
  assert.equal(countMap.get('produto'), 25);
  assert.equal(countMap.get('fornecedor'), 6);
  assert.equal(countMap.get('ingrediente'), 22);
  assert.equal(countMap.get('cliente'), 12);
  assert.equal(countMap.get('pedido'), 15);
  assert.equal(countMap.get('item_pedido'), 29);
  assert.equal(countMap.get('item_pedido_adicional'), 8);
  assert.equal(countMap.get('compra'), 10);
  assert.equal(countMap.get('item_compra'), 23);

  // Verify CHECK constraint ck_entrega_com_cliente rejects ENTREGA with NULL id_cliente
  await assert.rejects(async () => {
    await db.query(
      `INSERT INTO pedido (id_cliente, tipo, forma_pagamento) VALUES (NULL, 'ENTREGA', 'PIX')`
    );
  });

  // Verify all 13 analytical queries from 03_consultas execute without error
  for (const q of ANALYTICAL_QUERIES) {
    const res = await db.query(q.sql);
    assert.ok(res.fields.length > 0, `Query ${q.id} (${q.title}) returned columns`);
    assert.ok(res.rows.length > 0, `Query ${q.id} (${q.title}) returned rows`);
  }

  await db.close();
});

test('pgCore executes full POS bootstrap, cliente creation, pedido creation, status update, table inspection, and reset', async () => {
  const db = new PGlite();
  await db.waitReady;
  await ensureSchemaAndSeed(db);

  const initial = await getBootstrapDataFromDb(db);
  assert.equal(initial.produtos.length, 25);
  assert.equal(initial.pedidos.length, 15);

  const cliente = await createClienteInDb(db, 'Mariana Teste', '(11) 99999-0000', 'Rua das Flores, 10');
  assert.equal(cliente.nome, 'Mariana Teste');

  const { id_pedido } = await createPedidoInDb(db, {
    tipo: 'ENTREGA',
    id_cliente: cliente.id_cliente,
    forma_pagamento: 'PIX',
    itens: [
      {
        id_produto: initial.produtos[0].id_produto,
        quantidade: 2,
        observacao: 'Sem cebola',
        adicionais: [],
      },
    ],
  });

  await updatePedidoStatusInDb(db, id_pedido, 'EM_PREPARO');
  const updated = await getBootstrapDataFromDb(db);
  const createdOrder = updated.pedidos.find((p) => p.id_pedido === id_pedido);
  assert.ok(createdOrder);
  assert.equal(createdOrder.status, 'EM_PREPARO');
  assert.equal(createdOrder.cliente_nome, 'Mariana Teste');

  const tableRows = await getTableRowsFromDb(db, 'pedido');
  assert.equal(tableRows.rows.length, 16);

  const analytical = await runAnalyticalQueryInDb(db, 1);
  assert.ok(analytical.rows.length > 0);

  const custom = await runCustomSelectQueryInDb(db, 'SELECT COUNT(*)::int AS total FROM pedido');
  assert.equal(custom.rows[0].total, 16);

  const reset = await resetDatabaseInDb(db);
  assert.equal(reset.pedidos.length, 15);

  await db.close();
});

