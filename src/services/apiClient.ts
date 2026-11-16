import type { PGlite } from '@electric-sql/pglite';
import type {
  BootstrapData,
  CartItem,
  Cliente,
  FormaPagamento,
  QueryResultPayload,
  StatusPedido,
  TipoPedido,
} from '../types/database.ts';
import { DDL_SQL } from '../db/sqlScripts.ts';
import { runCustomSelectQueryInDb } from '../db/pgCore.ts';
import {
  createClienteLocal,
  createPedidoLocal,
  getTableRowsLocal,
  readLocalDbState,
  resetLocalDbState,
  runAnalyticalQueryLocal,
  toBootstrapData,
  updatePedidoStatusLocal,
  type LocalDatabaseState,
} from '../data/mockDatabase.ts';

let customSqlDbPromise: Promise<PGlite> | null = null;
let lastSyncedSnapshot = '';

async function getHydratedInMemoryPg(state: LocalDatabaseState): Promise<PGlite> {
  if (!customSqlDbPromise) {
    customSqlDbPromise = (async () => {
      const { PGlite: BrowserPGlite } = await import('@electric-sql/pglite');
      const db = new BrowserPGlite();
      await db.waitReady;
      return db;
    })().catch((err) => {
      customSqlDbPromise = null;
      throw err;
    });
  }

  const db = await customSqlDbPromise;
  const serialized = JSON.stringify(state);
  if (serialized === lastSyncedSnapshot) {
    return db;
  }

  await db.exec(DDL_SQL);

  for (const cat of state.categorias) {
    await db.query(`INSERT INTO categoria (id_categoria, nome) VALUES ($1, $2)`, [
      cat.id_categoria,
      cat.nome,
    ]);
  }

  for (const prod of state.produtos) {
    await db.query(
      `INSERT INTO produto (id_produto, id_categoria, nome, descricao, preco) VALUES ($1, $2, $3, $4, $5)`,
      [prod.id_produto, prod.id_categoria, prod.nome, prod.descricao, prod.preco]
    );
  }

  for (const forn of state.fornecedores) {
    await db.query(`INSERT INTO fornecedor (id_fornecedor, nome, telefone) VALUES ($1, $2, $3)`, [
      forn.id_fornecedor,
      forn.nome,
      forn.telefone,
    ]);
  }

  for (const ing of state.ingredientes) {
    await db.query(
      `INSERT INTO ingrediente (id_ingrediente, id_fornecedor, nome, preco_adicional, estoque_atual, estoque_minimo)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        ing.id_ingrediente,
        ing.id_fornecedor,
        ing.nome,
        ing.preco_adicional,
        ing.estoque_atual,
        ing.estoque_minimo,
      ]
    );
  }

  for (const pi of state.produtoIngredientes) {
    await db.query(`INSERT INTO produto_ingrediente (id_produto, id_ingrediente) VALUES ($1, $2)`, [
      pi.id_produto,
      pi.id_ingrediente,
    ]);
  }

  for (const cli of state.clientes) {
    await db.query(`INSERT INTO cliente (id_cliente, nome, telefone, endereco) VALUES ($1, $2, $3, $4)`, [
      cli.id_cliente,
      cli.nome,
      cli.telefone,
      cli.endereco,
    ]);
  }

  for (const ped of state.pedidos) {
    await db.query(
      `INSERT INTO pedido (id_pedido, id_cliente, data_hora, tipo, status, forma_pagamento, valor_total)
       VALUES ($1, $2, $3::timestamp, $4, $5, $6, $7)`,
      [
        ped.id_pedido,
        ped.id_cliente,
        ped.data_hora,
        ped.tipo,
        ped.status,
        ped.forma_pagamento,
        ped.valor_total,
      ]
    );
  }

  for (const ip of state.itensPedido) {
    await db.query(
      `INSERT INTO item_pedido (id_item_pedido, id_pedido, id_produto, quantidade, preco_unitario, observacao)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [ip.id_item_pedido, ip.id_pedido, ip.id_produto, ip.quantidade, ip.preco_unitario, ip.observacao]
    );
  }

  for (const add of state.itensPedidoAdicional) {
    await db.query(
      `INSERT INTO item_pedido_adicional (id_item_pedido, id_ingrediente, quantidade, valor)
       VALUES ($1, $2, $3, $4)`,
      [add.id_item_pedido, add.id_ingrediente, add.quantidade, add.valor]
    );
  }

  for (const comp of state.compras) {
    await db.query(
      `INSERT INTO compra (id_compra, id_fornecedor, data_compra, valor_total)
       VALUES ($1, $2, $3::date, $4)`,
      [comp.id_compra, comp.id_fornecedor, comp.data_compra, comp.valor_total]
    );
  }

  for (const ic of state.itensCompra) {
    await db.query(
      `INSERT INTO item_compra (id_compra, id_ingrediente, quantidade, valor_unitario)
       VALUES ($1, $2, $3, $4)`,
      [ic.id_compra, ic.id_ingrediente, ic.quantidade, ic.valor_unitario]
    );
  }

  lastSyncedSnapshot = serialized;
  return db;
}

export async function fetchBootstrap(): Promise<BootstrapData> {
  const state = readLocalDbState();
  return toBootstrapData(state);
}

export async function createClienteApi(
  nome: string,
  telefone: string,
  endereco: string
): Promise<{ cliente: Cliente; bootstrap: BootstrapData }> {
  return createClienteLocal(nome, telefone, endereco);
}

export async function createPedidoApi(payload: {
  tipo: TipoPedido;
  id_cliente: number | null;
  forma_pagamento: FormaPagamento;
  itens: CartItem[];
}): Promise<{ id_pedido: number; bootstrap: BootstrapData }> {
  return createPedidoLocal(payload);
}

export async function updatePedidoStatusApi(
  idPedido: number,
  status: StatusPedido
): Promise<{ bootstrap: BootstrapData }> {
  return updatePedidoStatusLocal(idPedido, status);
}

export async function resetDatabaseApi(): Promise<{ bootstrap: BootstrapData }> {
  const state = resetLocalDbState();
  lastSyncedSnapshot = '';
  return { bootstrap: toBootstrapData(state) };
}

export async function fetchTableRowsApi(tableName: string): Promise<{
  table: string;
  columns: string[];
  rows: Record<string, unknown>[];
}> {
  return getTableRowsLocal(tableName);
}

export async function runAnalyticalQueryApi(queryId: number): Promise<QueryResultPayload> {
  return runAnalyticalQueryLocal(queryId);
}

export async function runCustomSelectQueryApi(sql: string): Promise<QueryResultPayload> {
  const state = readLocalDbState();
  const db = await getHydratedInMemoryPg(state);
  return runCustomSelectQueryInDb(db, sql);
}
