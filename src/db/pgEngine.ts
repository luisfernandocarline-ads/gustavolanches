import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import type {
  BootstrapData,
  Cliente,
  Fornecedor,
  QueryResultPayload,
  StatusPedido,
} from '../types/database.ts';
import {
  createClienteInDb,
  createCompraInDb,
  createFornecedorInDb,
  createPedidoInDb,
  ensureSchemaAndSeed,
  getBootstrapDataFromDb,
  getTableRowsFromDb,
  resetDatabaseInDb,
  runAnalyticalQueryInDb,
  runCustomSelectQueryInDb,
  updatePedidoStatusInDb,
  type CreateCompraRequest,
  type CreatePedidoRequest,
} from './pgCore.ts';

export type { CreateCompraRequest, CreatePedidoRequest };

// Vercel Functions only allow writes under /tmp, so the database lives there (ephemeral per instance).
const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'gustavo_lanches_pg')
  : path.resolve(process.cwd(), 'data', 'gustavo_lanches_pg');

let pgInstance: PGlite | null = null;
let initPromise: Promise<PGlite> | null = null;

async function initDbAt(dir: string): Promise<PGlite> {
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  const pidFile = path.join(dir, 'postmaster.pid');
  if (fs.existsSync(pidFile)) {
    fs.rmSync(pidFile, { force: true });
  }
  const db = new PGlite(dir);
  await db.waitReady;
  await ensureSchemaAndSeed(db);
  return db;
}

async function ensureInitialized(): Promise<PGlite> {
  if (pgInstance) return pgInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const db = await initDbAt(DATA_DIR);
      pgInstance = db;
      return db;
    } catch (err) {
      // Recover from corrupted ungracefully-closed local PGlite storage by recreating from DDL/SEED
      console.warn('PGlite initialization failed, recreating clean local database:', err);
      fs.rmSync(DATA_DIR, { recursive: true, force: true });
      const db = await initDbAt(DATA_DIR);
      pgInstance = db;
      return db;
    }
  })().catch((err) => {
    initPromise = null;
    throw err;
  });

  return initPromise;
}

export async function resetDatabase(): Promise<BootstrapData> {
  const db = await ensureInitialized();
  return resetDatabaseInDb(db);
}

export async function getBootstrapData(): Promise<BootstrapData> {
  const db = await ensureInitialized();
  return getBootstrapDataFromDb(db);
}

export async function createPedido(input: CreatePedidoRequest): Promise<{ id_pedido: number }> {
  const db = await ensureInitialized();
  return createPedidoInDb(db, input);
}

export async function updatePedidoStatus(id_pedido: number, status: StatusPedido): Promise<void> {
  const db = await ensureInitialized();
  return updatePedidoStatusInDb(db, id_pedido, status);
}

export async function createCliente(nome: string, telefone: string, endereco: string): Promise<Cliente> {
  const db = await ensureInitialized();
  return createClienteInDb(db, nome, telefone, endereco);
}

export async function createFornecedor(nome: string, telefone: string): Promise<Fornecedor> {
  const db = await ensureInitialized();
  return createFornecedorInDb(db, nome, telefone);
}

export async function createCompra(input: CreateCompraRequest): Promise<{ id_compra: number }> {
  const db = await ensureInitialized();
  return createCompraInDb(db, input);
}

export async function getTableRows(tableName: string): Promise<{
  table: string;
  columns: string[];
  rows: Record<string, unknown>[];
}> {
  const db = await ensureInitialized();
  return getTableRowsFromDb(db, tableName);
}

export async function runAnalyticalQuery(queryId: number): Promise<QueryResultPayload> {
  const db = await ensureInitialized();
  return runAnalyticalQueryInDb(db, queryId);
}

export async function runCustomSelectQuery(rawSql: string): Promise<QueryResultPayload> {
  const db = await ensureInitialized();
  return runCustomSelectQueryInDb(db, rawSql);
}
