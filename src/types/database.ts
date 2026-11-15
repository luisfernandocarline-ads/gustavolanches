export type TipoPedido = 'BALCAO' | 'ENTREGA';
export type StatusPedido = 'RECEBIDO' | 'EM_PREPARO' | 'PRONTO' | 'ENTREGUE' | 'CANCELADO';
export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO';

export interface Categoria {
  id_categoria: number;
  nome: string;
}

export interface Produto {
  id_produto: number;
  id_categoria: number;
  categoria_nome?: string;
  nome: string;
  descricao: string | null;
  preco: number;
  ingredientes?: string[];
}

export interface Fornecedor {
  id_fornecedor: number;
  nome: string;
  telefone: string | null;
}

export interface Ingrediente {
  id_ingrediente: number;
  id_fornecedor: number;
  fornecedor_nome?: string;
  fornecedor_telefone?: string | null;
  nome: string;
  preco_adicional: number | null;
  estoque_atual: number;
  estoque_minimo: number;
}

export interface Cliente {
  id_cliente: number;
  nome: string;
  telefone: string | null;
  endereco: string | null;
}

export interface ItemPedidoAdicional {
  id_item_pedido: number;
  id_ingrediente: number;
  ingrediente_nome?: string;
  quantidade: number;
  valor: number;
}

export interface ItemPedido {
  id_item_pedido: number;
  id_pedido: number;
  id_produto: number;
  produto_nome?: string;
  quantidade: number;
  preco_unitario: number;
  observacao: string | null;
  adicionais: ItemPedidoAdicional[];
}

export interface Pedido {
  id_pedido: number;
  id_cliente: number | null;
  cliente_nome?: string | null;
  cliente_telefone?: string | null;
  cliente_endereco?: string | null;
  data_hora: string;
  tipo: TipoPedido;
  status: StatusPedido;
  forma_pagamento: FormaPagamento;
  valor_total: number;
  itens: ItemPedido[];
}

export interface ItemCompra {
  id_compra: number;
  id_ingrediente: number;
  ingrediente_nome?: string;
  quantidade: number;
  valor_unitario: number;
}

export interface Compra {
  id_compra: number;
  id_fornecedor: number;
  fornecedor_nome?: string;
  data_compra: string;
  valor_total: number;
  itens: ItemCompra[];
}

export interface TableCount {
  tabela: string;
  registros: number;
}

export interface BootstrapData {
  categorias: Categoria[];
  produtos: Produto[];
  fornecedores: Fornecedor[];
  ingredientes: Ingrediente[];
  clientes: Cliente[];
  pedidos: Pedido[];
  compras: Compra[];
  tableCounts: TableCount[];
}

export interface CartItemAdicional {
  id_ingrediente: number;
  nome: string;
  quantidade: number;
  preco_adicional: number;
}

export interface CartItem {
  tempId: string;
  id_produto: number;
  nome: string;
  preco_unitario: number;
  quantidade: number;
  observacao: string;
  adicionais: CartItemAdicional[];
}

export interface QueryResultPayload {
  id?: number;
  title?: string;
  sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  durationMs: number;
}
