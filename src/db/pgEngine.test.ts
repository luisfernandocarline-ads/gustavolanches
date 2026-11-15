import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { ANALYTICAL_QUERIES, DDL_SQL, SEED_SQL, TABLE_COUNTS_SQL } from './sqlScripts';

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
