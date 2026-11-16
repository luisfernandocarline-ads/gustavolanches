import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import {
  ALLOWED_TABLE_NAMES,
  ANALYTICAL_QUERIES,
  DDL_SQL,
  SEED_SQL,
  TABLE_COUNTS_SQL,
} from './sqlScripts.ts';
import type {
  BootstrapData,
  Categoria,
  Cliente,
  Compra,
  FormaPagamento,
  Fornecedor,
  Ingrediente,
  ItemCompra,
  ItemPedido,
  ItemPedidoAdicional,
  Pedido,
  Produto,
  QueryResultPayload,
  StatusPedido,
  TableCount,
  TipoPedido,
} from '../types/database.ts';
import {
  calculateAdicionalValor,
  calculateCompraTotal,
  calculateOrderTotal,
  validatePedidoPayload,
} from '../utils/orderMath.ts';

// Vercel Functions only allow writes under /tmp, so the database lives there (ephemeral per instance).
const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'gustavo_lanches_pg')
  : path.resolve(process.cwd(), 'data', 'gustavo_lanches_pg');

let pgInstance: PGlite | null = null;
let initPromise: Promise<PGlite> | null = null;

async function ensureInitialized(): Promise<PGlite> {
  if (pgInstance) return pgInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    fs.mkdirSync(path.dirname(DATA_DIR), { recursive: true });
    const db = new PGlite(DATA_DIR);
    await db.waitReady;

    const checkRes = await db.query<{ exists: string | null }>(
      `SELECT to_regclass('public.categoria')::text AS exists`
    );

    if (!checkRes.rows[0]?.exists) {
      await db.exec(DDL_SQL);
      await db.exec(SEED_SQL);
    }

    pgInstance = db;
    return db;
  })();

  return initPromise;
}

export async function resetDatabase(): Promise<BootstrapData> {
  const db = await ensureInitialized();
  await db.exec(DDL_SQL);
  await db.exec(SEED_SQL);
  return getBootstrapData();
}

export async function getBootstrapData(): Promise<BootstrapData> {
  const db = await ensureInitialized();

  const [
    catRes,
    prodRes,
    piRes,
    fornRes,
    ingRes,
    cliRes,
    pedRes,
    itemPedRes,
    addRes,
    compRes,
    itemCompRes,
    countsRes,
  ] = await Promise.all([
    db.query<Categoria>(`SELECT id_categoria, nome FROM categoria ORDER BY id_categoria`),
    db.query<{
      id_produto: number;
      id_categoria: number;
      categoria_nome: string;
      nome: string;
      descricao: string | null;
      preco: string;
    }>(`
      SELECT p.id_produto, p.id_categoria, c.nome AS categoria_nome, p.nome, p.descricao, p.preco::text
      FROM produto p
      INNER JOIN categoria c ON c.id_categoria = p.id_categoria
      ORDER BY p.id_categoria, p.id_produto
    `),
    db.query<{ id_produto: number; ingrediente_nome: string }>(`
      SELECT pi.id_produto, i.nome AS ingrediente_nome
      FROM produto_ingrediente pi
      INNER JOIN ingrediente i ON i.id_ingrediente = pi.id_ingrediente
      ORDER BY pi.id_produto, i.id_ingrediente
    `),
    db.query<Fornecedor>(`SELECT id_fornecedor, nome, telefone FROM fornecedor ORDER BY id_fornecedor`),
    db.query<{
      id_ingrediente: number;
      id_fornecedor: number;
      fornecedor_nome: string;
      fornecedor_telefone: string | null;
      nome: string;
      preco_adicional: string | null;
      estoque_atual: string;
      estoque_minimo: string;
    }>(`
      SELECT i.id_ingrediente, i.id_fornecedor, f.nome AS fornecedor_nome, f.telefone AS fornecedor_telefone,
             i.nome, i.preco_adicional::text, i.estoque_atual::text, i.estoque_minimo::text
      FROM ingrediente i
      INNER JOIN fornecedor f ON f.id_fornecedor = i.id_fornecedor
      ORDER BY i.id_ingrediente
    `),
    db.query<Cliente>(`SELECT id_cliente, nome, telefone, endereco FROM cliente ORDER BY nome`),
    db.query<{
      id_pedido: number;
      id_cliente: number | null;
      cliente_nome: string | null;
      cliente_telefone: string | null;
      cliente_endereco: string | null;
      data_hora: string;
      tipo: TipoPedido;
      status: StatusPedido;
      forma_pagamento: FormaPagamento;
      valor_total: string;
    }>(`
      SELECT p.id_pedido, p.id_cliente, c.nome AS cliente_nome, c.telefone AS cliente_telefone,
             c.endereco AS cliente_endereco, TO_CHAR(p.data_hora, 'YYYY-MM-DD HH24:MI') AS data_hora,
             p.tipo, p.status, p.forma_pagamento, p.valor_total::text
      FROM pedido p
      LEFT JOIN cliente c ON c.id_cliente = p.id_cliente
      ORDER BY p.id_pedido DESC
    `),
    db.query<{
      id_item_pedido: number;
      id_pedido: number;
      id_produto: number;
      produto_nome: string;
      quantidade: number;
      preco_unitario: string;
      observacao: string | null;
    }>(`
      SELECT ip.id_item_pedido, ip.id_pedido, ip.id_produto, pr.nome AS produto_nome,
             ip.quantidade, ip.preco_unitario::text, ip.observacao
      FROM item_pedido ip
      INNER JOIN produto pr ON pr.id_produto = ip.id_produto
      ORDER BY ip.id_item_pedido
    `),
    db.query<{
      id_item_pedido: number;
      id_ingrediente: number;
      ingrediente_nome: string;
      quantidade: number;
      valor: string;
    }>(`
      SELECT a.id_item_pedido, a.id_ingrediente, i.nome AS ingrediente_nome, a.quantidade, a.valor::text
      FROM item_pedido_adicional a
      INNER JOIN ingrediente i ON i.id_ingrediente = a.id_ingrediente
      ORDER BY a.id_item_pedido, a.id_ingrediente
    `),
    db.query<{
      id_compra: number;
      id_fornecedor: number;
      fornecedor_nome: string;
      data_compra: string;
      valor_total: string;
    }>(`
      SELECT c.id_compra, c.id_fornecedor, f.nome AS fornecedor_nome,
             TO_CHAR(c.data_compra, 'YYYY-MM-DD') AS data_compra, c.valor_total::text
      FROM compra c
      INNER JOIN fornecedor f ON f.id_fornecedor = c.id_fornecedor
      ORDER BY c.id_compra DESC
    `),
    db.query<{
      id_compra: number;
      id_ingrediente: number;
      ingrediente_nome: string;
      quantidade: string;
      valor_unitario: string;
    }>(`
      SELECT ic.id_compra, ic.id_ingrediente, i.nome AS ingrediente_nome,
             ic.quantidade::text, ic.valor_unitario::text
      FROM item_compra ic
      INNER JOIN ingrediente i ON i.id_ingrediente = ic.id_ingrediente
      ORDER BY ic.id_compra, ic.id_ingrediente
    `),
    db.query<TableCount>(TABLE_COUNTS_SQL),
  ]);

  const ingByProduct = new Map<number, string[]>();
  for (const row of piRes.rows) {
    const arr = ingByProduct.get(row.id_produto) ?? [];
    arr.push(row.ingrediente_nome);
    ingByProduct.set(row.id_produto, arr);
  }

  const produtos: Produto[] = prodRes.rows.map((p) => ({
    id_produto: p.id_produto,
    id_categoria: p.id_categoria,
    categoria_nome: p.categoria_nome,
    nome: p.nome,
    descricao: p.descricao,
    preco: Number(p.preco),
    ingredientes: ingByProduct.get(p.id_produto) ?? [],
  }));

  const ingredientes: Ingrediente[] = ingRes.rows.map((i) => ({
    id_ingrediente: i.id_ingrediente,
    id_fornecedor: i.id_fornecedor,
    fornecedor_nome: i.fornecedor_nome,
    fornecedor_telefone: i.fornecedor_telefone,
    nome: i.nome,
    preco_adicional: i.preco_adicional !== null ? Number(i.preco_adicional) : null,
    estoque_atual: Number(i.estoque_atual),
    estoque_minimo: Number(i.estoque_minimo),
  }));

  const addsByItem = new Map<number, ItemPedidoAdicional[]>();
  for (const a of addRes.rows) {
    const list = addsByItem.get(a.id_item_pedido) ?? [];
    list.push({
      id_item_pedido: a.id_item_pedido,
      id_ingrediente: a.id_ingrediente,
      ingrediente_nome: a.ingrediente_nome,
      quantidade: a.quantidade,
      valor: Number(a.valor),
    });
    addsByItem.set(a.id_item_pedido, list);
  }

  const itemsByPedido = new Map<number, ItemPedido[]>();
  for (const ip of itemPedRes.rows) {
    const list = itemsByPedido.get(ip.id_pedido) ?? [];
    list.push({
      id_item_pedido: ip.id_item_pedido,
      id_pedido: ip.id_pedido,
      id_produto: ip.id_produto,
      produto_nome: ip.produto_nome,
      quantidade: ip.quantidade,
      preco_unitario: Number(ip.preco_unitario),
      observacao: ip.observacao,
      adicionais: addsByItem.get(ip.id_item_pedido) ?? [],
    });
    itemsByPedido.set(ip.id_pedido, list);
  }

  const pedidos: Pedido[] = pedRes.rows.map((p) => ({
    id_pedido: p.id_pedido,
    id_cliente: p.id_cliente,
    cliente_nome: p.cliente_nome,
    cliente_telefone: p.cliente_telefone,
    cliente_endereco: p.cliente_endereco,
    data_hora: p.data_hora,
    tipo: p.tipo,
    status: p.status,
    forma_pagamento: p.forma_pagamento,
    valor_total: Number(p.valor_total),
    itens: itemsByPedido.get(p.id_pedido) ?? [],
  }));

  const itemsByCompra = new Map<number, ItemCompra[]>();
  for (const ic of itemCompRes.rows) {
    const list = itemsByCompra.get(ic.id_compra) ?? [];
    list.push({
      id_compra: ic.id_compra,
      id_ingrediente: ic.id_ingrediente,
      ingrediente_nome: ic.ingrediente_nome,
      quantidade: Number(ic.quantidade),
      valor_unitario: Number(ic.valor_unitario),
    });
    itemsByCompra.set(ic.id_compra, list);
  }

  const compras: Compra[] = compRes.rows.map((c) => ({
    id_compra: c.id_compra,
    id_fornecedor: c.id_fornecedor,
    fornecedor_nome: c.fornecedor_nome,
    data_compra: c.data_compra,
    valor_total: Number(c.valor_total),
    itens: itemsByCompra.get(c.id_compra) ?? [],
  }));

  return {
    categorias: catRes.rows,
    produtos,
    fornecedores: fornRes.rows,
    ingredientes,
    clientes: cliRes.rows,
    pedidos,
    compras,
    tableCounts: countsRes.rows,
  };
}

export interface CreatePedidoRequest {
  tipo: TipoPedido;
  id_cliente: number | null;
  forma_pagamento: FormaPagamento;
  itens: Array<{
    id_produto: number;
    quantidade: number;
    observacao?: string | null;
    adicionais?: Array<{
      id_ingrediente: number;
      quantidade: number;
    }>;
  }>;
}

export async function createPedido(input: CreatePedidoRequest): Promise<{ id_pedido: number }> {
  const validation = validatePedidoPayload({
    tipo: input.tipo,
    id_cliente: input.id_cliente,
    forma_pagamento: input.forma_pagamento,
    itens: input.itens,
  });
  if (!validation.valid) {
    throw new Error(validation.error || 'Dados inválidos para criar pedido.');
  }

  const db = await ensureInitialized();

  return db.transaction(async (tx) => {
    if (input.id_cliente !== null) {
      const cliCheck = await tx.query<{ id_cliente: number }>(
        `SELECT id_cliente FROM cliente WHERE id_cliente = $1`,
        [input.id_cliente]
      );
      if (cliCheck.rows.length === 0) {
        throw new Error(`Cliente id_cliente=${input.id_cliente} não encontrado (FK fk_pedido_cliente).`);
      }
    }

    const pedInsert = await tx.query<{ id_pedido: number }>(
      `INSERT INTO pedido (id_cliente, tipo, status, forma_pagamento, valor_total)
       VALUES ($1, $2, 'RECEBIDO', $3, 0)
       RETURNING id_pedido`,
      [input.id_cliente, input.tipo, input.forma_pagamento]
    );
    const id_pedido = pedInsert.rows[0].id_pedido;

    const computedItems: Array<{
      id_produto: number;
      quantidade: number;
      preco_unitario: number;
      adicionais: Array<{ quantidade: number; valor: number }>;
    }> = [];

    for (const item of input.itens) {
      const prodRes = await tx.query<{ id_produto: number; preco: string }>(
        `SELECT id_produto, preco::text FROM produto WHERE id_produto = $1`,
        [item.id_produto]
      );
      if (prodRes.rows.length === 0) {
        throw new Error(`Produto id_produto=${item.id_produto} não encontrado.`);
      }
      const preco_unitario = Number(prodRes.rows[0].preco);
      const obs = item.observacao?.trim() ? item.observacao.trim().slice(0, 200) : null;

      const ipInsert = await tx.query<{ id_item_pedido: number }>(
        `INSERT INTO item_pedido (id_pedido, id_produto, quantidade, preco_unitario, observacao)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id_item_pedido`,
        [id_pedido, item.id_produto, item.quantidade, preco_unitario, obs]
      );
      const id_item_pedido = ipInsert.rows[0].id_item_pedido;

      const itemAdds: Array<{ quantidade: number; valor: number }> = [];
      for (const add of item.adicionais ?? []) {
        if (!Number.isInteger(add.quantidade) || add.quantidade <= 0) continue;
        const ingRes = await tx.query<{ id_ingrediente: number; nome: string; preco_adicional: string | null }>(
          `SELECT id_ingrediente, nome, preco_adicional::text FROM ingrediente WHERE id_ingrediente = $1`,
          [add.id_ingrediente]
        );
        if (ingRes.rows.length === 0) {
          throw new Error(`Ingrediente id_ingrediente=${add.id_ingrediente} não encontrado.`);
        }
        const ing = ingRes.rows[0];
        if (ing.preco_adicional === null) {
          throw new Error(`Ingrediente "${ing.nome}" não possui preco_adicional definido.`);
        }
        const valor = calculateAdicionalValor(add.quantidade, Number(ing.preco_adicional));
        await tx.query(
          `INSERT INTO item_pedido_adicional (id_item_pedido, id_ingrediente, quantidade, valor)
           VALUES ($1, $2, $3, $4)`,
          [id_item_pedido, add.id_ingrediente, add.quantidade, valor]
        );
        itemAdds.push({ quantidade: add.quantidade, valor });
      }

      computedItems.push({
        id_produto: item.id_produto,
        quantidade: item.quantidade,
        preco_unitario,
        adicionais: itemAdds,
      });
    }

    const total = calculateOrderTotal(computedItems);
    await tx.query(`UPDATE pedido SET valor_total = $1 WHERE id_pedido = $2`, [total, id_pedido]);

    return { id_pedido };
  });
}

export async function updatePedidoStatus(id_pedido: number, status: StatusPedido): Promise<void> {
  const validStatuses: StatusPedido[] = ['RECEBIDO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE', 'CANCELADO'];
  if (!validStatuses.includes(status)) {
    throw new Error('Status de pedido inválido.');
  }
  const db = await ensureInitialized();
  const res = await db.query(
    `UPDATE pedido SET status = $1 WHERE id_pedido = $2 RETURNING id_pedido`,
    [status, id_pedido]
  );
  if (res.rows.length === 0) {
    throw new Error(`Pedido #${id_pedido} não encontrado.`);
  }
}

export async function createCliente(nome: string, telefone: string, endereco: string): Promise<Cliente> {
  const cleanName = nome.trim();
  if (!cleanName) throw new Error('Nome do cliente é obrigatório (NOT NULL).');
  const db = await ensureInitialized();
  const res = await db.query<Cliente>(
    `INSERT INTO cliente (nome, telefone, endereco) VALUES ($1, $2, $3) RETURNING id_cliente, nome, telefone, endereco`,
    [cleanName.slice(0, 100), telefone.trim() || null, endereco.trim() || null]
  );
  return res.rows[0];
}

export async function createFornecedor(nome: string, telefone: string): Promise<Fornecedor> {
  const cleanName = nome.trim();
  if (!cleanName) throw new Error('Nome do fornecedor é obrigatório (NOT NULL).');
  const db = await ensureInitialized();
  const res = await db.query<Fornecedor>(
    `INSERT INTO fornecedor (nome, telefone) VALUES ($1, $2) RETURNING id_fornecedor, nome, telefone`,
    [cleanName.slice(0, 100), telefone.trim() || null]
  );
  return res.rows[0];
}

export interface CreateCompraRequest {
  id_fornecedor: number;
  data_compra: string;
  itens: Array<{
    id_ingrediente: number;
    quantidade: number;
    valor_unitario: number;
  }>;
}

export async function createCompra(input: CreateCompraRequest): Promise<{ id_compra: number }> {
  if (!Number.isInteger(input.id_fornecedor) || input.id_fornecedor <= 0) {
    throw new Error('Fornecedor obrigatório.');
  }
  if (!Array.isArray(input.itens) || input.itens.length === 0) {
    throw new Error('Adicione ao menos 1 ingrediente à compra.');
  }
  for (const item of input.itens) {
    if (item.quantidade <= 0) throw new Error('Quantidade deve ser > 0 (CHECK quantidade > 0).');
    if (item.valor_unitario < 0) throw new Error('Valor unitário deve ser >= 0.');
  }

  const db = await ensureInitialized();
  return db.transaction(async (tx) => {
    const compraInsert = await tx.query<{ id_compra: number }>(
      `INSERT INTO compra (id_fornecedor, data_compra, valor_total)
       VALUES ($1, COALESCE(NULLIF($2, '')::date, CURRENT_DATE), 0)
       RETURNING id_compra`,
      [input.id_fornecedor, input.data_compra || '']
    );
    const id_compra = compraInsert.rows[0].id_compra;

    for (const item of input.itens) {
      await tx.query(
        `INSERT INTO item_compra (id_compra, id_ingrediente, quantidade, valor_unitario)
         VALUES ($1, $2, $3, $4)`,
        [id_compra, item.id_ingrediente, item.quantidade, item.valor_unitario]
      );

      await tx.query(
        `UPDATE ingrediente SET estoque_atual = estoque_atual + $1 WHERE id_ingrediente = $2`,
        [item.quantidade, item.id_ingrediente]
      );
    }

    const total = calculateCompraTotal(input.itens);
    await tx.query(`UPDATE compra SET valor_total = $1 WHERE id_compra = $2`, [total, id_compra]);

    return { id_compra };
  });
}

export async function getTableRows(tableName: string): Promise<{
  table: string;
  columns: string[];
  rows: Record<string, unknown>[];
}> {
  if (!ALLOWED_TABLE_NAMES.includes(tableName)) {
    throw new Error(`Tabela "${tableName}" não pertence ao esquema do projeto.`);
  }
  const db = await ensureInitialized();

  let orderClause = '1';
  if (tableName === 'produto_ingrediente') orderClause = 'id_produto, id_ingrediente';
  if (tableName === 'item_pedido_adicional') orderClause = 'id_item_pedido, id_ingrediente';
  if (tableName === 'item_compra') orderClause = 'id_compra, id_ingrediente';

  const res = await db.query<Record<string, unknown>>(`SELECT * FROM ${tableName} ORDER BY ${orderClause}`);
  const columns = res.fields.map((f) => f.name);
  return {
    table: tableName,
    columns,
    rows: res.rows,
  };
}

export async function runAnalyticalQuery(queryId: number): Promise<QueryResultPayload> {
  const def = ANALYTICAL_QUERIES.find((q) => q.id === queryId);
  if (!def) {
    throw new Error(`Consulta #${queryId} não encontrada.`);
  }
  const db = await ensureInitialized();
  const start = performance.now();
  const res = await db.query<Record<string, unknown>>(def.sql);
  const durationMs = Math.round((performance.now() - start) * 100) / 100;

  return {
    id: def.id,
    title: def.title,
    sql: def.sql,
    columns: res.fields.map((f) => f.name),
    rows: res.rows,
    durationMs,
  };
}

export async function runCustomSelectQuery(rawSql: string): Promise<QueryResultPayload> {
  const trimmed = rawSql.trim();
  if (!trimmed) {
    throw new Error('Digite uma consulta SQL SELECT para executar.');
  }

  // Strip comments and verify read-only SELECT / WITH statement
  const withoutComments = trimmed
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();

  if (!/^(SELECT|WITH)\b/i.test(withoutComments)) {
    throw new Error('Por segurança, o console SQL livre aceita apenas consultas SELECT ou WITH (DQL).');
  }

  if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\b/i.test(withoutComments)) {
    throw new Error('Comandos de escrita ou DDL não são permitidos no console DQL.');
  }

  const db = await ensureInitialized();
  const start = performance.now();
  const res = await db.query<Record<string, unknown>>(trimmed);
  const durationMs = Math.round((performance.now() - start) * 100) / 100;

  return {
    sql: trimmed,
    columns: res.fields.map((f) => f.name),
    rows: res.rows,
    durationMs,
  };
}
