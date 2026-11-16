import {
  ALLOWED_TABLE_NAMES,
  ANALYTICAL_QUERIES,
} from '../db/sqlScripts.ts';
import type {
  BootstrapData,
  CartItem,
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
  validateClienteInput,
  validatePedidoPayload,
} from '../utils/orderMath.ts';

export const STORAGE_KEY = 'gustavo_lanches_local_db_v2';
export const LEGACY_STORAGE_KEYS = ['gustavo_lanches_local_db_v1'] as const;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ProdutoIngredienteRow {
  id_produto: number;
  id_ingrediente: number;
}

export interface ProdutoRow {
  id_produto: number;
  id_categoria: number;
  nome: string;
  descricao: string | null;
  preco: number;
}

export interface IngredienteRow {
  id_ingrediente: number;
  id_fornecedor: number;
  nome: string;
  preco_adicional: number | null;
  estoque_atual: number;
  estoque_minimo: number;
}

export interface PedidoRow {
  id_pedido: number;
  id_cliente: number | null;
  data_hora: string;
  tipo: TipoPedido;
  status: StatusPedido;
  forma_pagamento: FormaPagamento;
  valor_total: number;
}

export interface ItemPedidoRow {
  id_item_pedido: number;
  id_pedido: number;
  id_produto: number;
  quantidade: number;
  preco_unitario: number;
  observacao: string | null;
}

export interface ItemPedidoAdicionalRow {
  id_item_pedido: number;
  id_ingrediente: number;
  quantidade: number;
  valor: number;
}

export interface CompraRow {
  id_compra: number;
  id_fornecedor: number;
  data_compra: string;
  valor_total: number;
}

export interface ItemCompraRow {
  id_compra: number;
  id_ingrediente: number;
  quantidade: number;
  valor_unitario: number;
}

export interface LocalDatabaseState {
  categorias: Categoria[];
  produtos: ProdutoRow[];
  produtoIngredientes: ProdutoIngredienteRow[];
  fornecedores: Fornecedor[];
  ingredientes: IngredienteRow[];
  clientes: Cliente[];
  pedidos: PedidoRow[];
  itensPedido: ItemPedidoRow[];
  itensPedidoAdicional: ItemPedidoAdicionalRow[];
  compras: CompraRow[];
  itensCompra: ItemCompraRow[];
}

function getDefaultStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore restricted storage access
  }
  return null;
}

export function createInitialSeedState(): LocalDatabaseState {
  const categorias: Categoria[] = [
    { id_categoria: 1, nome: 'Lanches Tradicionais' },
    { id_categoria: 2, nome: 'Lanches Artesanais' },
    { id_categoria: 3, nome: 'Lanches com Frango' },
    { id_categoria: 4, nome: 'Lanches com Lombo' },
    { id_categoria: 5, nome: 'Lanches com Filé' },
    { id_categoria: 6, nome: 'Omeletes' },
    { id_categoria: 7, nome: 'Batata Frita' },
  ];

  const produtos: ProdutoRow[] = [
    { id_produto: 1, id_categoria: 1, nome: 'X-Tudo', descricao: 'Pão, hambúrguer, presunto, muçarela, bacon, catupiry, ovo, salsicha, milho, tomate e alface', preco: 24.0 },
    { id_produto: 2, id_categoria: 1, nome: 'X-Especial 2000', descricao: 'Pão, hambúrguer, filé, lombo, frango, presunto, muçarela, bacon, catupiry, ovo, milho, salsicha, tomate e alface', preco: 46.0 },
    { id_produto: 3, id_categoria: 1, nome: 'X-Bacon', descricao: 'Pão, hambúrguer, presunto, muçarela, bacon, ovo, tomate e alface', preco: 23.0 },
    { id_produto: 4, id_categoria: 1, nome: 'X-Egg Catupiry', descricao: 'Pão, hambúrguer, presunto, muçarela, ovo, catupiry, tomate e alface', preco: 23.0 },
    { id_produto: 5, id_categoria: 1, nome: 'X-Egg Salada', descricao: 'Pão, hambúrguer, presunto, muçarela, ovo, tomate e alface', preco: 20.0 },
    { id_produto: 6, id_categoria: 1, nome: 'X-Burguer', descricao: 'Pão, hambúrguer, presunto e muçarela', preco: 15.0 },
    { id_produto: 7, id_categoria: 1, nome: 'X-Catupa', descricao: 'Pão, hambúrguer, presunto, muçarela e catupiry', preco: 20.0 },
    { id_produto: 8, id_categoria: 1, nome: 'X-Salada', descricao: 'Pão, hambúrguer, presunto, muçarela, tomate e alface', preco: 18.0 },
    { id_produto: 9, id_categoria: 1, nome: 'X-Bauru', descricao: 'Pão, presunto, muçarela e tomate', preco: 13.0 },
    { id_produto: 10, id_categoria: 2, nome: 'Especial da Casa', descricao: 'Pão, hambúrguer 170g de fraldinha, cheddar americano, barbecue, catupiry, bacon e cebola roxa', preco: 32.0 },
    { id_produto: 11, id_categoria: 2, nome: 'Duplo Cheddar Bacon', descricao: 'Pão, 2x hambúrguer 170g, 2x cheddar americano, 2x bacon e 2x catupiry', preco: 38.0 },
    { id_produto: 12, id_categoria: 2, nome: 'Insano', descricao: 'Pão, hambúrguer 170g de fraldinha, presunto, muçarela, catupiry, bacon, ovo, tomate e alface', preco: 35.0 },
    { id_produto: 13, id_categoria: 2, nome: 'Big Saboritos', descricao: 'Pão, hambúrguer 170g de fraldinha, cheddar americano, doritos, cebola empanada, bacon e barbecue', preco: 34.0 },
    { id_produto: 14, id_categoria: 2, nome: 'Especial Salada', descricao: 'Pão, hambúrguer 170g de fraldinha, catupiry, cheddar americano, bacon, tomate, alface e cebola roxa', preco: 33.0 },
    { id_produto: 15, id_categoria: 3, nome: 'X-Frango', descricao: 'Pão, frango, presunto, muçarela, tomate e alface', preco: 25.0 },
    { id_produto: 16, id_categoria: 3, nome: 'X-Frango Tudo', descricao: 'Pão, frango, presunto, muçarela, ovo, bacon, catupiry, tomate e alface', preco: 32.0 },
    { id_produto: 17, id_categoria: 4, nome: 'X-Lombo', descricao: 'Pão, lombo, presunto, muçarela, tomate e alface', preco: 25.0 },
    { id_produto: 18, id_categoria: 4, nome: 'X-Lombo Tudo', descricao: 'Pão, lombo, presunto, muçarela, catupiry, bacon, ovo, tomate e alface', preco: 32.0 },
    { id_produto: 19, id_categoria: 5, nome: 'X-Filé', descricao: 'Pão, filé mignon, presunto, muçarela, tomate e alface', preco: 35.0 },
    { id_produto: 20, id_categoria: 5, nome: 'X-Filé Tudo', descricao: 'Pão, filé mignon, presunto, muçarela, bacon, catupiry, ovo, tomate e alface', preco: 43.0 },
    { id_produto: 21, id_categoria: 6, nome: 'Omelete de Frango', descricao: 'Frango, presunto, muçarela, bacon, catupiry, milho e batata palha', preco: 40.0 },
    { id_produto: 22, id_categoria: 6, nome: 'Omelete de Filé', descricao: 'Filé mignon, presunto, muçarela, bacon, catupiry, milho e batata palha', preco: 50.0 },
    { id_produto: 23, id_categoria: 6, nome: 'Omelete de Lombo', descricao: 'Lombo, presunto, muçarela, bacon, catupiry, milho e batata palha', preco: 40.0 },
    { id_produto: 24, id_categoria: 7, nome: 'Batata Frita Grande', descricao: 'Porção grande. Sabores: cheddar e bacon ou catupiry e bacon', preco: 36.0 },
    { id_produto: 25, id_categoria: 7, nome: 'Batata Frita Média', descricao: 'Porção média. Sabores: cheddar e bacon ou catupiry e bacon', preco: 30.0 },
  ];

  const fornecedores: Fornecedor[] = [
    { id_fornecedor: 1, nome: 'Frigorífico Boa Carne', telefone: '(35) 3000-1001' },
    { id_fornecedor: 2, nome: 'Laticínios Serra Azul', telefone: '(35) 3000-1002' },
    { id_fornecedor: 3, nome: 'Panificadora Bom Pão', telefone: '(35) 3000-1003' },
    { id_fornecedor: 4, nome: 'Hortifruti do Vale', telefone: '(35) 3000-1004' },
    { id_fornecedor: 5, nome: 'Granja Ovos Frescos', telefone: '(35) 3000-1005' },
    { id_fornecedor: 6, nome: 'Distribuidora Doce Sabor', telefone: '(35) 3000-1006' },
  ];

  const ingredientes: IngredienteRow[] = [
    { id_ingrediente: 1, id_fornecedor: 3, nome: 'Pão', preco_adicional: null, estoque_atual: 120, estoque_minimo: 40 },
    { id_ingrediente: 2, id_fornecedor: 1, nome: 'Hambúrguer', preco_adicional: 6.0, estoque_atual: 90, estoque_minimo: 30 },
    { id_ingrediente: 3, id_fornecedor: 1, nome: 'Hambúrguer de fraldinha 170g', preco_adicional: null, estoque_atual: 60, estoque_minimo: 20 },
    { id_ingrediente: 4, id_fornecedor: 1, nome: 'Presunto', preco_adicional: 2.5, estoque_atual: 8, estoque_minimo: 3 },
    { id_ingrediente: 5, id_fornecedor: 2, nome: 'Muçarela', preco_adicional: 3.0, estoque_atual: 10, estoque_minimo: 4 },
    { id_ingrediente: 6, id_fornecedor: 1, nome: 'Bacon', preco_adicional: 4.0, estoque_atual: 6, estoque_minimo: 3 },
    { id_ingrediente: 7, id_fornecedor: 2, nome: 'Catupiry', preco_adicional: 3.0, estoque_atual: 5, estoque_minimo: 2 },
    { id_ingrediente: 8, id_fornecedor: 5, nome: 'Ovo', preco_adicional: 2.0, estoque_atual: 180, estoque_minimo: 60 },
    { id_ingrediente: 9, id_fornecedor: 1, nome: 'Salsicha', preco_adicional: null, estoque_atual: 4, estoque_minimo: 2 },
    { id_ingrediente: 10, id_fornecedor: 6, nome: 'Milho', preco_adicional: 1.5, estoque_atual: 6, estoque_minimo: 2 },
    { id_ingrediente: 11, id_fornecedor: 4, nome: 'Tomate', preco_adicional: 1.0, estoque_atual: 5, estoque_minimo: 2 },
    { id_ingrediente: 12, id_fornecedor: 4, nome: 'Alface', preco_adicional: 1.0, estoque_atual: 8, estoque_minimo: 3 },
    { id_ingrediente: 13, id_fornecedor: 1, nome: 'Frango', preco_adicional: null, estoque_atual: 7, estoque_minimo: 3 },
    { id_ingrediente: 14, id_fornecedor: 1, nome: 'Lombo', preco_adicional: null, estoque_atual: 7, estoque_minimo: 3 },
    { id_ingrediente: 15, id_fornecedor: 1, nome: 'Filé mignon', preco_adicional: null, estoque_atual: 5, estoque_minimo: 2 },
    { id_ingrediente: 16, id_fornecedor: 2, nome: 'Cheddar americano', preco_adicional: 3.0, estoque_atual: 4, estoque_minimo: 2 },
    { id_ingrediente: 17, id_fornecedor: 6, nome: 'Barbecue', preco_adicional: 2.0, estoque_atual: 3, estoque_minimo: 1 },
    { id_ingrediente: 18, id_fornecedor: 4, nome: 'Cebola roxa', preco_adicional: 1.5, estoque_atual: 3, estoque_minimo: 1 },
    { id_ingrediente: 19, id_fornecedor: 6, nome: 'Cebola empanada', preco_adicional: null, estoque_atual: 1, estoque_minimo: 1 },
    { id_ingrediente: 20, id_fornecedor: 6, nome: 'Doritos', preco_adicional: null, estoque_atual: 12, estoque_minimo: 4 },
    { id_ingrediente: 21, id_fornecedor: 6, nome: 'Batata palha', preco_adicional: null, estoque_atual: 2, estoque_minimo: 2 },
    { id_ingrediente: 22, id_fornecedor: 4, nome: 'Batata', preco_adicional: null, estoque_atual: 20, estoque_minimo: 8 },
  ];

  const ingIdByName = new Map(ingredientes.map((i) => [i.nome, i.id_ingrediente]));
  const prodIdByName = new Map(produtos.map((p) => [p.nome, p.id_produto]));

  const recipeMap: Array<[string, string[]]> = [
    ['X-Tudo', ['Pão', 'Hambúrguer', 'Presunto', 'Muçarela', 'Bacon', 'Catupiry', 'Ovo', 'Salsicha', 'Milho', 'Tomate', 'Alface']],
    ['X-Especial 2000', ['Pão', 'Hambúrguer', 'Filé mignon', 'Lombo', 'Frango', 'Presunto', 'Muçarela', 'Bacon', 'Catupiry', 'Ovo', 'Milho', 'Salsicha', 'Tomate', 'Alface']],
    ['X-Bacon', ['Pão', 'Hambúrguer', 'Presunto', 'Muçarela', 'Bacon', 'Ovo', 'Tomate', 'Alface']],
    ['X-Egg Catupiry', ['Pão', 'Hambúrguer', 'Presunto', 'Muçarela', 'Ovo', 'Catupiry', 'Tomate', 'Alface']],
    ['X-Egg Salada', ['Pão', 'Hambúrguer', 'Presunto', 'Muçarela', 'Ovo', 'Tomate', 'Alface']],
    ['X-Burguer', ['Pão', 'Hambúrguer', 'Presunto', 'Muçarela']],
    ['X-Catupa', ['Pão', 'Hambúrguer', 'Presunto', 'Muçarela', 'Catupiry']],
    ['X-Salada', ['Pão', 'Hambúrguer', 'Presunto', 'Muçarela', 'Tomate', 'Alface']],
    ['X-Bauru', ['Pão', 'Presunto', 'Muçarela', 'Tomate']],
    ['Especial da Casa', ['Pão', 'Hambúrguer de fraldinha 170g', 'Cheddar americano', 'Barbecue', 'Catupiry', 'Bacon', 'Cebola roxa']],
    ['Duplo Cheddar Bacon', ['Pão', 'Hambúrguer de fraldinha 170g', 'Cheddar americano', 'Bacon', 'Catupiry']],
    ['Insano', ['Pão', 'Hambúrguer de fraldinha 170g', 'Presunto', 'Muçarela', 'Catupiry', 'Bacon', 'Ovo', 'Tomate', 'Alface']],
    ['Big Saboritos', ['Pão', 'Hambúrguer de fraldinha 170g', 'Cheddar americano', 'Doritos', 'Cebola empanada', 'Bacon', 'Barbecue']],
    ['Especial Salada', ['Pão', 'Hambúrguer de fraldinha 170g', 'Catupiry', 'Cheddar americano', 'Bacon', 'Tomate', 'Alface', 'Cebola roxa']],
    ['X-Frango', ['Pão', 'Frango', 'Presunto', 'Muçarela', 'Tomate', 'Alface']],
    ['X-Frango Tudo', ['Pão', 'Frango', 'Presunto', 'Muçarela', 'Ovo', 'Bacon', 'Catupiry', 'Tomate', 'Alface']],
    ['X-Lombo', ['Pão', 'Lombo', 'Presunto', 'Muçarela', 'Tomate', 'Alface']],
    ['X-Lombo Tudo', ['Pão', 'Lombo', 'Presunto', 'Muçarela', 'Catupiry', 'Bacon', 'Ovo', 'Tomate', 'Alface']],
    ['X-Filé', ['Pão', 'Filé mignon', 'Presunto', 'Muçarela', 'Tomate', 'Alface']],
    ['X-Filé Tudo', ['Pão', 'Filé mignon', 'Presunto', 'Muçarela', 'Bacon', 'Catupiry', 'Ovo', 'Tomate', 'Alface']],
    ['Omelete de Frango', ['Ovo', 'Frango', 'Presunto', 'Muçarela', 'Bacon', 'Catupiry', 'Milho', 'Batata palha']],
    ['Omelete de Filé', ['Ovo', 'Filé mignon', 'Presunto', 'Muçarela', 'Bacon', 'Catupiry', 'Milho', 'Batata palha']],
    ['Omelete de Lombo', ['Ovo', 'Lombo', 'Presunto', 'Muçarela', 'Bacon', 'Catupiry', 'Milho', 'Batata palha']],
    ['Batata Frita Grande', ['Batata', 'Bacon', 'Cheddar americano', 'Catupiry']],
    ['Batata Frita Média', ['Batata', 'Bacon', 'Cheddar americano', 'Catupiry']],
  ];

  const produtoIngredientes: ProdutoIngredienteRow[] = [];
  for (const [prodName, ingNames] of recipeMap) {
    const id_produto = prodIdByName.get(prodName)!;
    for (const ingName of ingNames) {
      produtoIngredientes.push({
        id_produto,
        id_ingrediente: ingIdByName.get(ingName)!,
      });
    }
  }

  const clientes: Cliente[] = [];
  const pedidos: PedidoRow[] = [];
  const itensPedido: ItemPedidoRow[] = [];
  const itensPedidoAdicional: ItemPedidoAdicionalRow[] = [];

  const fornIdByName = new Map(fornecedores.map((f) => [f.nome, f.id_fornecedor]));
  const baseCompras: Array<[string, string]> = [
    ['Frigorífico Boa Carne', '2026-10-26'],
    ['Laticínios Serra Azul', '2026-10-26'],
    ['Panificadora Bom Pão', '2026-10-27'],
    ['Hortifruti do Vale', '2026-10-28'],
    ['Granja Ovos Frescos', '2026-10-28'],
    ['Distribuidora Doce Sabor', '2026-10-30'],
    ['Frigorífico Boa Carne', '2026-11-02'],
    ['Panificadora Bom Pão', '2026-11-03'],
    ['Hortifruti do Vale', '2026-11-05'],
    ['Laticínios Serra Azul', '2026-11-06'],
  ];

  const seedCompraItems: Array<[number, string, number, number]> = [
    [1, 'Hambúrguer', 100, 2.8],
    [1, 'Bacon', 8, 38.0],
    [1, 'Presunto', 10, 32.0],
    [1, 'Frango', 10, 22.0],
    [2, 'Muçarela', 12, 42.0],
    [2, 'Catupiry', 6, 28.0],
    [2, 'Cheddar americano', 5, 35.0],
    [3, 'Pão', 150, 0.9],
    [4, 'Tomate', 6, 7.0],
    [4, 'Alface', 10, 3.5],
    [4, 'Batata', 25, 5.0],
    [5, 'Ovo', 200, 0.6],
    [6, 'Doritos', 12, 9.0],
    [6, 'Batata palha', 5, 18.0],
    [6, 'Barbecue', 4, 14.0],
    [7, 'Hambúrguer de fraldinha 170g', 60, 6.5],
    [7, 'Filé mignon', 5, 65.0],
    [7, 'Lombo', 8, 30.0],
    [8, 'Pão', 100, 0.95],
    [9, 'Cebola roxa', 3, 6.0],
    [9, 'Tomate', 5, 7.5],
    [10, 'Muçarela', 10, 43.0],
    [10, 'Catupiry', 5, 28.5],
  ];

  const itensCompra: ItemCompraRow[] = seedCompraItems.map(([id_compra, ingName, quantidade, valor_unitario]) => ({
    id_compra,
    id_ingrediente: ingIdByName.get(ingName)!,
    quantidade,
    valor_unitario,
  }));

  const compras: CompraRow[] = baseCompras.map(([fornName, data_compra], idx) => {
    const id_compra = idx + 1;
    const items = itensCompra.filter((ic) => ic.id_compra === id_compra);
    return {
      id_compra,
      id_fornecedor: fornIdByName.get(fornName)!,
      data_compra,
      valor_total: calculateCompraTotal(items),
    };
  });

  return {
    categorias,
    produtos,
    produtoIngredientes,
    fornecedores,
    ingredientes,
    clientes,
    pedidos,
    itensPedido,
    itensPedidoAdicional,
    compras,
    itensCompra,
  };
}

function isValidDbState(raw: unknown): raw is LocalDatabaseState {
  if (!raw || typeof raw !== 'object') return false;
  const candidate = raw as Partial<LocalDatabaseState>;
  return (
    Array.isArray(candidate.categorias) &&
    candidate.categorias.length > 0 &&
    Array.isArray(candidate.produtos) &&
    candidate.produtos.length > 0 &&
    Array.isArray(candidate.produtoIngredientes) &&
    Array.isArray(candidate.fornecedores) &&
    Array.isArray(candidate.ingredientes) &&
    Array.isArray(candidate.clientes) &&
    Array.isArray(candidate.pedidos) &&
    Array.isArray(candidate.itensPedido) &&
    Array.isArray(candidate.itensPedidoAdicional) &&
    Array.isArray(candidate.compras) &&
    Array.isArray(candidate.itensCompra)
  );
}

export function saveLocalDbState(state: LocalDatabaseState, storage: StorageLike | null = getDefaultStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Não foi possível gravar no localStorage:', err);
  }
}

function clearLegacyStorage(storage: StorageLike | null): void {
  if (!storage) return;
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      // Ignore removal errors
    }
  }
}

export function readLocalDbState(storage: StorageLike | null = getDefaultStorage()): LocalDatabaseState {
  if (storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (isValidDbState(parsed)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Dados corrompidos no localStorage, restaurando seed inicial:', err);
    }
  }

  clearLegacyStorage(storage);
  const seeded = createInitialSeedState();
  saveLocalDbState(seeded, storage);
  return seeded;
}

export function resetLocalDbState(storage: StorageLike | null = getDefaultStorage()): LocalDatabaseState {
  const seeded = createInitialSeedState();
  clearLegacyStorage(storage);
  if (storage) {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore removal errors
    }
  }
  saveLocalDbState(seeded, storage);
  return seeded;
}

export function toBootstrapData(state: LocalDatabaseState): BootstrapData {
  const catNameById = new Map(state.categorias.map((c) => [c.id_categoria, c.nome]));
  const ingNameById = new Map(state.ingredientes.map((i) => [i.id_ingrediente, i.nome]));
  const fornById = new Map(state.fornecedores.map((f) => [f.id_fornecedor, f]));
  const prodNameById = new Map(state.produtos.map((p) => [p.id_produto, p.nome]));
  const clienteById = new Map(state.clientes.map((c) => [c.id_cliente, c]));

  const ingByProduct = new Map<number, string[]>();
  for (const pi of state.produtoIngredientes) {
    const arr = ingByProduct.get(pi.id_produto) ?? [];
    const ingName = ingNameById.get(pi.id_ingrediente);
    if (ingName) arr.push(ingName);
    ingByProduct.set(pi.id_produto, arr);
  }

  const produtos: Produto[] = [...state.produtos]
    .sort((a, b) => a.id_categoria - b.id_categoria || a.id_produto - b.id_produto)
    .map((p) => ({
      id_produto: p.id_produto,
      id_categoria: p.id_categoria,
      categoria_nome: catNameById.get(p.id_categoria) ?? 'Sem categoria',
      nome: p.nome,
      descricao: p.descricao,
      preco: p.preco,
      ingredientes: ingByProduct.get(p.id_produto) ?? [],
    }));

  const ingredientes: Ingrediente[] = [...state.ingredientes]
    .sort((a, b) => a.id_ingrediente - b.id_ingrediente)
    .map((i) => {
      const forn = fornById.get(i.id_fornecedor);
      return {
        id_ingrediente: i.id_ingrediente,
        id_fornecedor: i.id_fornecedor,
        fornecedor_nome: forn?.nome ?? 'Fornecedor',
        fornecedor_telefone: forn?.telefone ?? null,
        nome: i.nome,
        preco_adicional: i.preco_adicional,
        estoque_atual: i.estoque_atual,
        estoque_minimo: i.estoque_minimo,
      };
    });

  const addsByItem = new Map<number, ItemPedidoAdicional[]>();
  for (const a of state.itensPedidoAdicional) {
    const list = addsByItem.get(a.id_item_pedido) ?? [];
    list.push({
      id_item_pedido: a.id_item_pedido,
      id_ingrediente: a.id_ingrediente,
      ingrediente_nome: ingNameById.get(a.id_ingrediente) ?? `Ingrediente #${a.id_ingrediente}`,
      quantidade: a.quantidade,
      valor: a.valor,
    });
    addsByItem.set(a.id_item_pedido, list);
  }

  const itemsByPedido = new Map<number, ItemPedido[]>();
  for (const ip of [...state.itensPedido].sort((a, b) => a.id_item_pedido - b.id_item_pedido)) {
    const list = itemsByPedido.get(ip.id_pedido) ?? [];
    list.push({
      id_item_pedido: ip.id_item_pedido,
      id_pedido: ip.id_pedido,
      id_produto: ip.id_produto,
      produto_nome: prodNameById.get(ip.id_produto) ?? `Produto #${ip.id_produto}`,
      quantidade: ip.quantidade,
      preco_unitario: ip.preco_unitario,
      observacao: ip.observacao,
      adicionais: addsByItem.get(ip.id_item_pedido) ?? [],
    });
    itemsByPedido.set(ip.id_pedido, list);
  }

  const pedidos: Pedido[] = [...state.pedidos]
    .sort((a, b) => b.id_pedido - a.id_pedido)
    .map((p) => {
      const cli = p.id_cliente !== null ? clienteById.get(p.id_cliente) : undefined;
      return {
        id_pedido: p.id_pedido,
        id_cliente: p.id_cliente,
        cliente_nome: cli?.nome ?? null,
        cliente_telefone: cli?.telefone ?? null,
        cliente_endereco: cli?.endereco ?? null,
        data_hora: p.data_hora,
        tipo: p.tipo,
        status: p.status,
        forma_pagamento: p.forma_pagamento,
        valor_total: p.valor_total,
        itens: itemsByPedido.get(p.id_pedido) ?? [],
      };
    });

  const itemsByCompra = new Map<number, ItemCompra[]>();
  for (const ic of state.itensCompra) {
    const list = itemsByCompra.get(ic.id_compra) ?? [];
    list.push({
      id_compra: ic.id_compra,
      id_ingrediente: ic.id_ingrediente,
      ingrediente_nome: ingNameById.get(ic.id_ingrediente) ?? `Ingrediente #${ic.id_ingrediente}`,
      quantidade: ic.quantidade,
      valor_unitario: ic.valor_unitario,
    });
    itemsByCompra.set(ic.id_compra, list);
  }

  const compras: Compra[] = [...state.compras]
    .sort((a, b) => b.id_compra - a.id_compra)
    .map((c) => ({
      id_compra: c.id_compra,
      id_fornecedor: c.id_fornecedor,
      fornecedor_nome: fornById.get(c.id_fornecedor)?.nome ?? 'Fornecedor',
      data_compra: c.data_compra,
      valor_total: c.valor_total,
      itens: itemsByCompra.get(c.id_compra) ?? [],
    }));

  const clientes = [...state.clientes].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const tableCounts: TableCount[] = [
    { tabela: 'categoria', registros: state.categorias.length },
    { tabela: 'produto', registros: state.produtos.length },
    { tabela: 'fornecedor', registros: state.fornecedores.length },
    { tabela: 'ingrediente', registros: state.ingredientes.length },
    { tabela: 'produto_ingrediente', registros: state.produtoIngredientes.length },
    { tabela: 'cliente', registros: state.clientes.length },
    { tabela: 'pedido', registros: state.pedidos.length },
    { tabela: 'item_pedido', registros: state.itensPedido.length },
    { tabela: 'item_pedido_adicional', registros: state.itensPedidoAdicional.length },
    { tabela: 'compra', registros: state.compras.length },
    { tabela: 'item_compra', registros: state.itensCompra.length },
  ];

  return {
    categorias: [...state.categorias].sort((a, b) => a.id_categoria - b.id_categoria),
    produtos,
    fornecedores: [...state.fornecedores].sort((a, b) => a.id_fornecedor - b.id_fornecedor),
    ingredientes,
    clientes,
    pedidos,
    compras,
    tableCounts,
  };
}

function formatNowDateTime(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function createClienteLocal(
  nome: string,
  telefone: string,
  endereco: string,
  storage: StorageLike | null = getDefaultStorage()
): { cliente: Cliente; bootstrap: BootstrapData } {
  const validation = validateClienteInput(nome);
  if (!validation.valid) {
    throw new Error(validation.error || 'Nome do cliente é obrigatório (NOT NULL).');
  }

  const state = readLocalDbState(storage);
  const nextId = state.clientes.reduce((max, c) => Math.max(max, c.id_cliente), 0) + 1;
  const cliente: Cliente = {
    id_cliente: nextId,
    nome: nome.trim().slice(0, 100),
    telefone: telefone.trim() || null,
    endereco: endereco.trim() || null,
  };

  const nextState: LocalDatabaseState = {
    ...state,
    clientes: [...state.clientes, cliente],
  };
  saveLocalDbState(nextState, storage);
  return { cliente, bootstrap: toBootstrapData(nextState) };
}

export function createPedidoLocal(
  payload: {
    tipo: TipoPedido;
    id_cliente: number | null;
    forma_pagamento: FormaPagamento;
    itens: CartItem[];
  },
  storage: StorageLike | null = getDefaultStorage()
): { id_pedido: number; bootstrap: BootstrapData } {
  const normalizedItems = payload.itens.map((i) => ({
    id_produto: i.id_produto,
    quantidade: i.quantidade,
    observacao: i.observacao || null,
    adicionais: i.adicionais.map((a) => ({
      id_ingrediente: a.id_ingrediente,
      quantidade: a.quantidade,
    })),
  }));

  const validation = validatePedidoPayload({
    tipo: payload.tipo,
    id_cliente: payload.id_cliente,
    forma_pagamento: payload.forma_pagamento,
    itens: normalizedItems,
  });
  if (!validation.valid) {
    throw new Error(validation.error || 'Dados inválidos para criar pedido.');
  }

  const state = readLocalDbState(storage);

  if (payload.id_cliente !== null) {
    const exists = state.clientes.some((c) => c.id_cliente === payload.id_cliente);
    if (!exists) {
      throw new Error(`Cliente id_cliente=${payload.id_cliente} não encontrado (FK fk_pedido_cliente).`);
    }
  }

  const id_pedido = state.pedidos.reduce((max, p) => Math.max(max, p.id_pedido), 0) + 1;
  let nextItemId = state.itensPedido.reduce((max, ip) => Math.max(max, ip.id_item_pedido), 0) + 1;

  const newItems: ItemPedidoRow[] = [];
  const newAdds: ItemPedidoAdicionalRow[] = [];
  const computedItems: Array<{
    id_produto: number;
    quantidade: number;
    preco_unitario: number;
    adicionais: Array<{ quantidade: number; valor: number }>;
  }> = [];

  for (const item of normalizedItems) {
    const prod = state.produtos.find((p) => p.id_produto === item.id_produto);
    if (!prod) {
      throw new Error(`Produto id_produto=${item.id_produto} não encontrado.`);
    }

    const id_item_pedido = nextItemId++;
    const obs = item.observacao?.trim() ? item.observacao.trim().slice(0, 200) : null;

    newItems.push({
      id_item_pedido,
      id_pedido,
      id_produto: item.id_produto,
      quantidade: item.quantidade,
      preco_unitario: prod.preco,
      observacao: obs,
    });

    const itemAdds: Array<{ quantidade: number; valor: number }> = [];
    for (const add of item.adicionais) {
      if (!Number.isInteger(add.quantidade) || add.quantidade <= 0) continue;
      const ing = state.ingredientes.find((i) => i.id_ingrediente === add.id_ingrediente);
      if (!ing) {
        throw new Error(`Ingrediente id_ingrediente=${add.id_ingrediente} não encontrado.`);
      }
      if (ing.preco_adicional === null) {
        throw new Error(`Ingrediente "${ing.nome}" não possui preco_adicional definido.`);
      }
      const valor = calculateAdicionalValor(add.quantidade, ing.preco_adicional);
      newAdds.push({
        id_item_pedido,
        id_ingrediente: add.id_ingrediente,
        quantidade: add.quantidade,
        valor,
      });
      itemAdds.push({ quantidade: add.quantidade, valor });
    }

    computedItems.push({
      id_produto: item.id_produto,
      quantidade: item.quantidade,
      preco_unitario: prod.preco,
      adicionais: itemAdds,
    });
  }

  const newPedido: PedidoRow = {
    id_pedido,
    id_cliente: payload.id_cliente,
    data_hora: formatNowDateTime(),
    tipo: payload.tipo,
    status: 'RECEBIDO',
    forma_pagamento: payload.forma_pagamento,
    valor_total: calculateOrderTotal(computedItems),
  };

  const nextState: LocalDatabaseState = {
    ...state,
    pedidos: [...state.pedidos, newPedido],
    itensPedido: [...state.itensPedido, ...newItems],
    itensPedidoAdicional: [...state.itensPedidoAdicional, ...newAdds],
  };

  saveLocalDbState(nextState, storage);
  return { id_pedido, bootstrap: toBootstrapData(nextState) };
}

export function updatePedidoStatusLocal(
  idPedido: number,
  status: StatusPedido,
  storage: StorageLike | null = getDefaultStorage()
): { bootstrap: BootstrapData } {
  const validStatuses: StatusPedido[] = ['RECEBIDO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE', 'CANCELADO'];
  if (!validStatuses.includes(status)) {
    throw new Error('Status de pedido inválido.');
  }

  const state = readLocalDbState(storage);
  const found = state.pedidos.some((p) => p.id_pedido === idPedido);
  if (!found) {
    throw new Error(`Pedido #${idPedido} não encontrado.`);
  }

  const nextState: LocalDatabaseState = {
    ...state,
    pedidos: state.pedidos.map((p) => (p.id_pedido === idPedido ? { ...p, status } : p)),
  };
  saveLocalDbState(nextState, storage);
  return { bootstrap: toBootstrapData(nextState) };
}

export function getTableRowsLocal(
  tableName: string,
  storage: StorageLike | null = getDefaultStorage()
): {
  table: string;
  columns: string[];
  rows: Record<string, unknown>[];
} {
  if (!ALLOWED_TABLE_NAMES.includes(tableName)) {
    throw new Error(`Tabela "${tableName}" não pertence ao esquema do projeto.`);
  }
  const state = readLocalDbState(storage);

  switch (tableName) {
    case 'categoria':
      return {
        table: tableName,
        columns: ['id_categoria', 'nome'],
        rows: state.categorias.map((r) => ({ ...r })),
      };
    case 'produto':
      return {
        table: tableName,
        columns: ['id_produto', 'id_categoria', 'nome', 'descricao', 'preco'],
        rows: state.produtos.map((r) => ({ ...r })),
      };
    case 'fornecedor':
      return {
        table: tableName,
        columns: ['id_fornecedor', 'nome', 'telefone'],
        rows: state.fornecedores.map((r) => ({ ...r })),
      };
    case 'ingrediente':
      return {
        table: tableName,
        columns: ['id_ingrediente', 'id_fornecedor', 'nome', 'preco_adicional', 'estoque_atual', 'estoque_minimo'],
        rows: state.ingredientes.map((r) => ({ ...r })),
      };
    case 'produto_ingrediente':
      return {
        table: tableName,
        columns: ['id_produto', 'id_ingrediente'],
        rows: [...state.produtoIngredientes]
          .sort((a, b) => a.id_produto - b.id_produto || a.id_ingrediente - b.id_ingrediente)
          .map((r) => ({ ...r })),
      };
    case 'cliente':
      return {
        table: tableName,
        columns: ['id_cliente', 'nome', 'telefone', 'endereco'],
        rows: state.clientes.map((r) => ({ ...r })),
      };
    case 'pedido':
      return {
        table: tableName,
        columns: ['id_pedido', 'id_cliente', 'data_hora', 'tipo', 'status', 'forma_pagamento', 'valor_total'],
        rows: state.pedidos.map((r) => ({ ...r })),
      };
    case 'item_pedido':
      return {
        table: tableName,
        columns: ['id_item_pedido', 'id_pedido', 'id_produto', 'quantidade', 'preco_unitario', 'observacao'],
        rows: state.itensPedido.map((r) => ({ ...r })),
      };
    case 'item_pedido_adicional':
      return {
        table: tableName,
        columns: ['id_item_pedido', 'id_ingrediente', 'quantidade', 'valor'],
        rows: [...state.itensPedidoAdicional]
          .sort((a, b) => a.id_item_pedido - b.id_item_pedido || a.id_ingrediente - b.id_ingrediente)
          .map((r) => ({ ...r })),
      };
    case 'compra':
      return {
        table: tableName,
        columns: ['id_compra', 'id_fornecedor', 'data_compra', 'valor_total'],
        rows: state.compras.map((r) => ({ ...r })),
      };
    case 'item_compra':
      return {
        table: tableName,
        columns: ['id_compra', 'id_ingrediente', 'quantidade', 'valor_unitario'],
        rows: [...state.itensCompra]
          .sort((a, b) => a.id_compra - b.id_compra || a.id_ingrediente - b.id_ingrediente)
          .map((r) => ({ ...r })),
      };
    default:
      return { table: tableName, columns: [], rows: [] };
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function runAnalyticalQueryLocal(
  queryId: number,
  storage: StorageLike | null = getDefaultStorage()
): QueryResultPayload {
  const def = ANALYTICAL_QUERIES.find((q) => q.id === queryId);
  if (!def) {
    throw new Error(`Consulta #${queryId} não encontrada.`);
  }

  const start = performance.now();
  const state = readLocalDbState(storage);
  const validOrders = state.pedidos.filter((p) => p.status !== 'CANCELADO');
  const validOrderIds = new Set(validOrders.map((p) => p.id_pedido));

  let columns: string[] = [];
  let rows: Record<string, unknown>[] = [];

  switch (queryId) {
    case 1: {
      const byDay = new Map<string, { count: number; total: number }>();
      for (const p of validOrders) {
        const dia = p.data_hora.slice(0, 10);
        const cur = byDay.get(dia) ?? { count: 0, total: 0 };
        cur.count += 1;
        cur.total = round2(cur.total + p.valor_total);
        byDay.set(dia, cur);
      }
      columns = ['dia', 'total_pedidos', 'faturamento', 'ticket_medio'];
      rows = [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dia, agg]) => ({
          dia,
          total_pedidos: agg.count,
          faturamento: round2(agg.total),
          ticket_medio: round2(agg.total / agg.count),
        }));
      break;
    }
    case 2: {
      const byDay = new Map<string, number>();
      for (const p of validOrders) {
        const dia = p.data_hora.slice(0, 10);
        byDay.set(dia, round2((byDay.get(dia) ?? 0) + p.valor_total));
      }
      columns = ['dia', 'faturamento'];
      rows = [...byDay.entries()]
        .filter(([, total]) => total > 150)
        .sort(([, a], [, b]) => b - a)
        .map(([dia, faturamento]) => ({ dia, faturamento }));
      break;
    }
    case 3: {
      const byMonth = new Map<string, { count: number; total: number }>();
      for (const c of state.compras) {
        const mes = c.data_compra.slice(0, 7);
        const cur = byMonth.get(mes) ?? { count: 0, total: 0 };
        cur.count += 1;
        cur.total = round2(cur.total + c.valor_total);
        byMonth.set(mes, cur);
      }
      columns = ['mes', 'total_compras', 'total_gasto'];
      rows = [...byMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mes, agg]) => ({
          mes,
          total_compras: agg.count,
          total_gasto: agg.total,
        }));
      break;
    }
    case 4: {
      const byForn = new Map<number, { count: number; total: number }>();
      for (const c of state.compras) {
        const cur = byForn.get(c.id_fornecedor) ?? { count: 0, total: 0 };
        cur.count += 1;
        cur.total = round2(cur.total + c.valor_total);
        byForn.set(c.id_fornecedor, cur);
      }
      const fornName = new Map(state.fornecedores.map((f) => [f.id_fornecedor, f.nome]));
      columns = ['fornecedor', 'total_compras', 'total_gasto'];
      rows = [...byForn.entries()]
        .filter(([, agg]) => agg.total > 500)
        .sort(([, a], [, b]) => b.total - a.total)
        .map(([id, agg]) => ({
          fornecedor: fornName.get(id) ?? `Fornecedor #${id}`,
          total_compras: agg.count,
          total_gasto: agg.total,
        }));
      break;
    }
    case 5: {
      const byProd = new Map<number, { unidades: number; faturamento: number }>();
      for (const ip of state.itensPedido) {
        if (!validOrderIds.has(ip.id_pedido)) continue;
        const cur = byProd.get(ip.id_produto) ?? { unidades: 0, faturamento: 0 };
        cur.unidades += ip.quantidade;
        cur.faturamento = round2(cur.faturamento + ip.quantidade * ip.preco_unitario);
        byProd.set(ip.id_produto, cur);
      }
      const prodName = new Map(state.produtos.map((p) => [p.id_produto, p.nome]));
      columns = ['produto', 'unidades_vendidas', 'faturamento'];
      rows = [...byProd.entries()]
        .sort(([, a], [, b]) => b.unidades - a.unidades || b.faturamento - a.faturamento)
        .slice(0, 10)
        .map(([id, agg]) => ({
          produto: prodName.get(id) ?? `Produto #${id}`,
          unidades_vendidas: agg.unidades,
          faturamento: agg.faturamento,
        }));
      break;
    }
    case 6: {
      const prodCat = new Map(state.produtos.map((p) => [p.id_produto, p.id_categoria]));
      const catName = new Map(state.categorias.map((c) => [c.id_categoria, c.nome]));
      const byCat = new Map<number, { unidades: number; faturamento: number }>();
      for (const ip of state.itensPedido) {
        if (!validOrderIds.has(ip.id_pedido)) continue;
        const idCat = prodCat.get(ip.id_produto);
        if (!idCat) continue;
        const cur = byCat.get(idCat) ?? { unidades: 0, faturamento: 0 };
        cur.unidades += ip.quantidade;
        cur.faturamento = round2(cur.faturamento + ip.quantidade * ip.preco_unitario);
        byCat.set(idCat, cur);
      }
      columns = ['categoria', 'unidades_vendidas', 'faturamento'];
      rows = [...byCat.entries()]
        .sort(([, a], [, b]) => b.faturamento - a.faturamento)
        .map(([idCat, agg]) => ({
          categoria: catName.get(idCat) ?? `Categoria #${idCat}`,
          unidades_vendidas: agg.unidades,
          faturamento: agg.faturamento,
        }));
      break;
    }
    case 7: {
      const byTipo = new Map<TipoPedido, { count: number; total: number }>();
      for (const p of validOrders) {
        const cur = byTipo.get(p.tipo) ?? { count: 0, total: 0 };
        cur.count += 1;
        cur.total = round2(cur.total + p.valor_total);
        byTipo.set(p.tipo, cur);
      }
      columns = ['tipo_pedido', 'total_pedidos', 'ticket_medio', 'faturamento'];
      rows = [...byTipo.entries()]
        .sort(([, a], [, b]) => b.total - a.total)
        .map(([tipo, agg]) => ({
          tipo_pedido: tipo,
          total_pedidos: agg.count,
          ticket_medio: round2(agg.total / agg.count),
          faturamento: agg.total,
        }));
      break;
    }
    case 8: {
      const byPay = new Map<FormaPagamento, { count: number; total: number }>();
      for (const p of validOrders) {
        const cur = byPay.get(p.forma_pagamento) ?? { count: 0, total: 0 };
        cur.count += 1;
        cur.total = round2(cur.total + p.valor_total);
        byPay.set(p.forma_pagamento, cur);
      }
      columns = ['pagamento', 'total_pedidos', 'faturamento'];
      rows = [...byPay.entries()]
        .sort(([, a], [, b]) => b.total - a.total)
        .map(([pagamento, agg]) => ({
          pagamento,
          total_pedidos: agg.count,
          faturamento: agg.total,
        }));
      break;
    }
    case 9: {
      const byClient = new Map<number, { count: number; total: number }>();
      for (const p of validOrders) {
        if (p.id_cliente === null) continue;
        const cur = byClient.get(p.id_cliente) ?? { count: 0, total: 0 };
        cur.count += 1;
        cur.total = round2(cur.total + p.valor_total);
        byClient.set(p.id_cliente, cur);
      }
      const cliName = new Map(state.clientes.map((c) => [c.id_cliente, c.nome]));
      columns = ['cliente', 'total_pedidos', 'total_gasto', 'ticket_medio'];
      rows = [...byClient.entries()]
        .filter(([, agg]) => agg.count >= 2)
        .sort(([, a], [, b]) => b.total - a.total)
        .map(([id, agg]) => ({
          cliente: cliName.get(id) ?? `Cliente #${id}`,
          total_pedidos: agg.count,
          total_gasto: agg.total,
          ticket_medio: round2(agg.total / agg.count),
        }));
      break;
    }
    case 10: {
      const fornById = new Map(state.fornecedores.map((f) => [f.id_fornecedor, f]));
      columns = ['ingrediente', 'estoque_atual', 'estoque_minimo', 'fornecedor', 'telefone'];
      rows = state.ingredientes
        .filter((i) => i.estoque_atual <= i.estoque_minimo)
        .sort((a, b) => (a.estoque_atual - a.estoque_minimo) - (b.estoque_atual - b.estoque_minimo) || a.nome.localeCompare(b.nome, 'pt-BR'))
        .map((i) => {
          const forn = fornById.get(i.id_fornecedor);
          return {
            ingrediente: i.nome,
            estoque_atual: i.estoque_atual,
            estoque_minimo: i.estoque_minimo,
            fornecedor: forn?.nome ?? '',
            telefone: forn?.telefone ?? null,
          };
        });
      break;
    }
    case 11: {
      const byIng = new Map<number, { vezes: number; receita: number }>();
      for (const a of state.itensPedidoAdicional) {
        const cur = byIng.get(a.id_ingrediente) ?? { vezes: 0, receita: 0 };
        cur.vezes += a.quantidade;
        cur.receita = round2(cur.receita + a.valor);
        byIng.set(a.id_ingrediente, cur);
      }
      const ingName = new Map(state.ingredientes.map((i) => [i.id_ingrediente, i.nome]));
      columns = ['adicional', 'vezes_pedido', 'receita_adicionais'];
      rows = [...byIng.entries()]
        .sort(([, a], [, b]) => b.vezes - a.vezes || b.receita - a.receita)
        .map(([id, agg]) => ({
          adicional: ingName.get(id) ?? `Ingrediente #${id}`,
          vezes_pedido: agg.vezes,
          receita_adicionais: agg.receita,
        }));
      break;
    }
    case 12: {
      const soldIds = new Set(state.itensPedido.map((ip) => ip.id_produto));
      columns = ['produto', 'preco'];
      rows = state.produtos
        .filter((p) => !soldIds.has(p.id_produto))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .map((p) => ({
          produto: p.nome,
          preco: p.preco,
        }));
      break;
    }
    case 13: {
      const activeSet = new Set<StatusPedido>(['RECEBIDO', 'EM_PREPARO', 'PRONTO']);
      const cliName = new Map(state.clientes.map((c) => [c.id_cliente, c.nome]));
      columns = ['id_pedido', 'data_hora', 'cliente', 'tipo', 'status', 'total_itens', 'valor_total'];
      rows = state.pedidos
        .filter((p) => activeSet.has(p.status))
        .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
        .map((p) => {
          const totalItens = state.itensPedido
            .filter((ip) => ip.id_pedido === p.id_pedido)
            .reduce((sum, ip) => sum + ip.quantidade, 0);
          return {
            id_pedido: p.id_pedido,
            data_hora: p.data_hora,
            cliente: p.id_cliente !== null ? (cliName.get(p.id_cliente) ?? 'Cliente') : 'Balcão (sem cadastro)',
            tipo: p.tipo,
            status: p.status,
            total_itens: totalItens,
            valor_total: p.valor_total,
          };
        });
      break;
    }
  }

  const durationMs = Math.round((performance.now() - start) * 100) / 100;
  return {
    id: def.id,
    title: def.title,
    sql: def.sql,
    columns,
    rows,
    durationMs,
  };
}
