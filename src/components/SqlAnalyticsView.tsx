import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Terminal } from 'lucide-react';
import { ANALYTICAL_QUERIES } from '../db/sqlScripts';
import { runAnalyticalQueryApi, runCustomSelectQueryApi } from '../services/apiClient';
import type { QueryResultPayload } from '../types/database';
import { formatBRL } from '../utils/orderMath';

const MONEY_COLS = new Set([
  'faturamento',
  'ticket_medio',
  'total_gasto',
  'receita_adicionais',
  'preco',
  'valor_total',
]);

function formatCellValue(colName: string, value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const str = String(value);
  if ((colName === 'dia' || colName === 'data_compra') && /^\d{4}-\d{2}-\d{2}T/.test(str)) {
    return str.slice(0, 10);
  }
  if (colName === 'data_hora' && /^\d{4}-\d{2}-\d{2}T/.test(str)) {
    return str.slice(0, 16).replace('T', ' ');
  }
  if (MONEY_COLS.has(colName) && !Number.isNaN(Number(str))) {
    return formatBRL(Number(str));
  }
  return str;
}

export function SqlAnalyticsView() {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [selectedQueryId, setSelectedQueryId] = useState<number>(1);
  const [customSql, setCustomSql] = useState<string>(
    `SELECT p.id_pedido, COALESCE(c.nome, 'Balcão') AS cliente, p.tipo, p.status, p.forma_pagamento, p.valor_total\nFROM pedido p\nLEFT JOIN cliente c ON c.id_cliente = p.id_cliente\nORDER BY p.id_pedido DESC;`
  );
  const [result, setResult] = useState<QueryResultPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const requestSeqRef = useRef(0);

  const activeQueryDef = ANALYTICAL_QUERIES.find((q) => q.id === selectedQueryId) ?? ANALYTICAL_QUERIES[0];

  const runPreset = useCallback(async (id: number) => {
    const seq = ++requestSeqRef.current;
    setSelectedQueryId(id);
    setMode('preset');
    setLoading(true);
    setErrorMsg(null);
    try {
      const json = await runAnalyticalQueryApi(id);
      if (seq !== requestSeqRef.current) return;
      setResult(json);
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao executar consulta SQL.');
    } finally {
      if (seq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const runCustom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;
    if (!customSql.trim()) {
      setErrorMsg('Digite uma consulta SQL SELECT ou WITH para executar.');
      return;
    }

    const seq = ++requestSeqRef.current;
    setLoading(true);
    setErrorMsg(null);
    try {
      const json = await runCustomSelectQueryApi(customSql);
      if (seq !== requestSeqRef.current) return;
      setResult(json);
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao executar SQL customizado.');
    } finally {
      if (seq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    runPreset(1);
  }, [runPreset]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Consultas Analíticas SQL (Etapa 04 — DQL)
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            As 13 consultas de <span className="font-mono text-xs text-stone-800">03_consultas.sql</span>{' '}
            executadas ao vivo no PostgreSQL com os pedidos e compras em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-lg" role="tablist" aria-label="Modo de consulta SQL">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'preset'}
            onClick={() => runPreset(selectedQueryId)}
            className={`min-h-10 sm:min-h-8 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'preset'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            13 Consultas da Etapa 04
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'custom'}
            onClick={() => {
              setMode('custom');
              setErrorMsg(null);
            }}
            className={`inline-flex items-center gap-1.5 min-h-10 sm:min-h-8 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'custom'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Console SQL Livre</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: 13 Queries List */}
        <aside className="lg:col-span-4 bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-200 bg-stone-50">
            <h2 className="text-xs font-bold text-stone-700">
              Relatórios de Negócio (DQL)
            </h2>
          </div>
          <nav aria-label="Lista de consultas SQL" className="divide-y divide-stone-200 max-h-[640px] overflow-y-auto">
            {ANALYTICAL_QUERIES.map((q) => {
              const isSelected = mode === 'preset' && q.id === selectedQueryId;
              return (
                <button
                  key={q.id}
                  type="button"
                  aria-current={isSelected ? 'true' : undefined}
                  onClick={() => runPreset(q.id)}
                  className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-red-50/80 text-stone-900'
                      : 'hover:bg-stone-50 text-stone-900'
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xs font-bold shrink-0 text-[#B91C1C]">
                      {String(q.id).padStart(2, '0')}.
                    </span>
                    <span className={`text-sm ${isSelected ? 'font-bold text-[#991B1B]' : 'font-semibold'}`}>
                      {q.title}
                    </span>
                  </div>
                  <p className="text-xs mt-1 line-clamp-2 text-stone-600">
                    {q.concepts.join(' · ')}
                  </p>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main SQL & Result Table */}
        <section className="lg:col-span-8 space-y-4">
          {mode === 'preset' ? (
            <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-mono text-stone-600">
                    Consulta {activeQueryDef.id} de 13 · {activeQueryDef.concepts.join(' · ')}
                  </span>
                  <h2 className="text-lg font-bold text-stone-900 mt-0.5">
                    {activeQueryDef.title}
                  </h2>
                  <p className="text-sm text-stone-600 mt-1">{activeQueryDef.question}</p>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => runPreset(activeQueryDef.id)}
                  className="inline-flex items-center gap-1.5 min-h-10 sm:min-h-9 px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-lg shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{loading ? 'Executando...' : 'Reexecutar SQL'}</span>
                </button>
              </div>

              <pre className="p-4 bg-stone-950 text-stone-100 rounded-lg text-xs font-mono leading-relaxed overflow-x-auto">
                {activeQueryDef.sql}
              </pre>
            </div>
          ) : (
            <form
              onSubmit={runCustom}
              className="bg-white border border-stone-200 rounded-xl p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Console SQL Livre (SELECT)</h2>
                  <p className="text-xs text-stone-600">
                    Consultas PostgreSQL de leitura sobre as 11 tabelas · atalho Ctrl+Enter para executar.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 min-h-10 sm:min-h-9 px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-lg shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{loading ? 'Executando...' : 'Executar SELECT'}</span>
                </button>
              </div>
              <label htmlFor="custom-sql-editor" className="sr-only">
                Editor SQL SELECT
              </label>
              <textarea
                id="custom-sql-editor"
                rows={6}
                value={customSql}
                onChange={(e) => setCustomSql(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    runCustom();
                  }
                }}
                className="w-full p-4 bg-stone-950 text-stone-100 rounded-lg text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
              />
            </form>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900 font-mono"
            >
              {errorMsg}
            </div>
          )}

          {/* Result Table */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <span className="text-xs font-semibold text-stone-700">
                Resultado PostgreSQL
              </span>
              {result && (
                <span className="text-xs font-mono text-stone-600 tabular-nums">
                  {result.rows.length} {result.rows.length === 1 ? 'linha' : 'linhas'} ·{' '}
                  {result.durationMs} ms
                </span>
              )}
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-stone-600">Executando consulta...</div>
            ) : !result || result.rows.length === 0 ? (
              <div className="p-8 text-center text-sm text-stone-600">
                A consulta retornou 0 linhas.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-xs font-mono font-semibold text-stone-700">
                      {result.columns.map((col) => (
                        <th key={col} className="py-2.5 px-4 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-xs font-mono">
                    {result.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-stone-50">
                        {result.columns.map((col) => {
                          const raw = row[col];
                          const formatted = formatCellValue(col, raw);
                          const isNumeric =
                            typeof raw === 'number' ||
                            MONEY_COLS.has(col) ||
                            (raw !== null && raw !== undefined && /^-?\d+(\.\d+)?$/.test(String(raw)));
                          return (
                            <td
                              key={col}
                              className={`py-2.5 px-4 whitespace-nowrap tabular-nums ${
                                raw === null ? 'text-stone-500 italic' : 'text-stone-800'
                              } ${isNumeric ? 'text-right' : 'text-left'}`}
                            >
                              {formatted}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
