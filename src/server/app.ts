import express from 'express';
import {
  createCliente,
  createCompra,
  createFornecedor,
  createPedido,
  getBootstrapData,
  getTableRows,
  resetDatabase,
  runAnalyticalQuery,
  runCustomSelectQuery,
  updatePedidoStatus,
} from '../db/pgEngine.ts';

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/bootstrap', async (_req, res) => {
    try {
      const data = await getBootstrapData();
      res.json(data);
    } catch (error) {
      console.error('Bootstrap error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao carregar banco de dados.' });
    }
  });

  app.post('/api/pedidos', async (req, res) => {
    try {
      const created = await createPedido(req.body);
      const data = await getBootstrapData();
      res.status(201).json({ ...created, bootstrap: data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao registrar pedido.';
      res.status(400).json({ error: message });
    }
  });

  app.patch('/api/pedidos/:id/status', async (req, res) => {
    try {
      const id = Number(req.params.id);
      await updatePedidoStatus(id, req.body?.status);
      const data = await getBootstrapData();
      res.json({ ok: true, bootstrap: data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar status.';
      res.status(400).json({ error: message });
    }
  });

  app.post('/api/clientes', async (req, res) => {
    try {
      const cliente = await createCliente(
        req.body?.nome ?? '',
        req.body?.telefone ?? '',
        req.body?.endereco ?? ''
      );
      const data = await getBootstrapData();
      res.status(201).json({ cliente, bootstrap: data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao cadastrar cliente.';
      res.status(400).json({ error: message });
    }
  });

  app.post('/api/fornecedores', async (req, res) => {
    try {
      const fornecedor = await createFornecedor(req.body?.nome ?? '', req.body?.telefone ?? '');
      const data = await getBootstrapData();
      res.status(201).json({ fornecedor, bootstrap: data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao cadastrar fornecedor.';
      res.status(400).json({ error: message });
    }
  });

  app.post('/api/compras', async (req, res) => {
    try {
      const created = await createCompra(req.body);
      const data = await getBootstrapData();
      res.status(201).json({ ...created, bootstrap: data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao registrar compra.';
      res.status(400).json({ error: message });
    }
  });

  app.get('/api/tabelas/:name', async (req, res) => {
    try {
      const result = await getTableRows(req.params.name);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao consultar tabela.';
      res.status(400).json({ error: message });
    }
  });

  app.get('/api/consultas/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const result = await runAnalyticalQuery(id);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao executar consulta.';
      res.status(400).json({ error: message });
    }
  });

  app.post('/api/consultas/custom', async (req, res) => {
    try {
      const result = await runCustomSelectQuery(req.body?.sql ?? '');
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao executar SQL.';
      res.status(400).json({ error: message });
    }
  });

  app.post('/api/database/reset', async (_req, res) => {
    try {
      const data = await resetDatabase();
      res.json({ ok: true, bootstrap: data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao restaurar banco.';
      res.status(500).json({ error: message });
    }
  });

  return app;
}
