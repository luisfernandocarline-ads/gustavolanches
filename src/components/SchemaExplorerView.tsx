import { useCallback, useEffect, useRef, useState } from 'react';
import { Code2, KeyRound, Link2, RotateCcw, Table2 } from 'lucide-react';
import { DDL_SQL, SCHEMA_TABLES } from '../db/sqlScripts';
import { fetchTableRowsApi } from '../services/apiClient';
import type { TableCount } from '../types/database';
import { ConfirmDialog } from './ConfirmDialog';

interface SchemaExplorerViewProps {
  tableCounts: TableCount[];
  onResetDatabase: () => Promise<void>;
}

const GROUPS: Array<'Cardápio' | 'Estoque & Fornecedores' | 'Clientes & Pedidos' | 'Compras'> = [
  'Cardápio',
  'Estoque & Fornecedores',
  'Clientes & Pedidos',
  'Compras',
];

export function SchemaExplorerView({ tableCounts, onResetDatabase }: SchemaExplorerViewProps) {
  const [selectedTable, setSelectedTable] = useState<string>('pedido');
  const [tableData, setTableData] = useState<{
    columns: string[];
    rows: Record<string, unknown>[];
  } | null>(null);
  const [loadingRows, setLoadingRows] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [showDdl, setShowDdl] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const requestSeqRef = useRef(0);

  const countMap = new Map(tableCounts.map((c) => [c.tabela, c.registros]));

  const loadTable = useCallback(async (tableName: string) => {
    const seq = ++requestSeqRef.current;
    setSelectedTable(tableName);
    setLoadingRows(true);
    setTableError(null);
    try {
      const json = await fetchTableRowsApi(tableName);
      if (seq !== requestSeqRef.current) return;
      setTableData({ columns: json.columns, rows: json.rows });
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      setTableError(err instanceof Error ? err.message : 'Falha ao consultar registros.');
    } finally {
      if (seq === requestSeqRef.current) {
        setLoadingRows(false);
      }
    }
  }, []);

  useEffect(() => {
    loadTable(selectedTable);
  }, [tableCounts, loadTable]);

  const activeMeta = SCHEMA_TABLES.find((t) => t.name === selectedTable) ?? SCHEMA_TABLES[0];

  const handleConfirmReset = async () => {
    if (resetting) return;
    setResetting(true);
    setResetMessage(null);
    setResetError(null);
    try {
      await onResetDatabase();
      setConfirmResetOpen(false);
      setResetMessage('Banco PostgreSQL restaurado com sucesso para os dados iniciais (seed).');
    } catch (err) {
      setConfirmResetOpen(false);
      setResetError(err instanceof Error ? err.message : 'Falha ao restaurar o banco de dados.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Modelo Relacional & Inspetor de Tabelas
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Esquema PostgreSQL (<span className="font-mono text-xs text-stone-800">01_criar_tabelas.sql</span>)
            com todas as 11 tabelas, chaves primárias, estrangeiras e restrições <span className="font-mono text-xs">CHECK</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDdl((v) => !v)}
            aria-expanded={showDdl}
            className="inline-flex items-center gap-1.5 min-h-10 sm:min-h-9 px-3.5 py-2 text-xs font-semibold text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{showDdl ? 'Ocultar DDL SQL' : 'Ver DDL (01_criar_tabelas)'}</span>
          </button>
          <button
            type="button"
            disabled={resetting}
            onClick={() => setConfirmResetOpen(true)}
            className="inline-flex items-center gap-1.5 min-h-10 sm:min-h-9 px-3.5 py-2 text-xs font-semibold text-[#B91C1C] bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{resetting ? 'Restaurando...' : 'Restaurar Seed Original'}</span>
          </button>
        </div>
      </div>

      {resetMessage && (
        <div
          role="status"
          className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900"
        >
          {resetMessage}
        </div>
      )}

      {resetError && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900"
        >
          {resetError}
        </div>
      )}

      {showDdl && (
        <section
          aria-label="Script DDL PostgreSQL"
          className="bg-stone-950 text-stone-100 rounded-xl p-5 overflow-x-auto border border-stone-800"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-stone-300">
              01_criar_tabelas.sql (PostgreSQL)
            </span>
          </div>
          <pre className="text-xs font-mono leading-relaxed whitespace-pre">{DDL_SQL}</pre>
        </section>
      )}

      {/* Visual Relational Map grouped by domain */}
      <section aria-label="Mapa das 11 tabelas do modelo relacional" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {GROUPS.map((group) => {
          const groupTables = SCHEMA_TABLES.filter((t) => t.group === group);
          return (
            <div key={group} className="space-y-2.5">
              <h2 className="text-xs font-bold text-stone-700 pb-1 border-b border-stone-200">
                {group}
              </h2>
              <div className="space-y-2.5">
                {groupTables.map((table) => {
                  const isSelected = table.name === selectedTable;
                  const count = countMap.get(table.name) ?? 0;
                  return (
                    <button
                      key={table.name}
                      type="button"
                      onClick={() => loadTable(table.name)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-red-50/70 text-stone-900 border-[#B91C1C] ring-1 ring-[#B91C1C]'
                          : 'bg-white text-stone-900 border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-mono text-sm font-bold truncate ${
                            isSelected ? 'text-[#991B1B]' : 'text-stone-900'
                          }`}
                        >
                          {table.name}
                        </span>
                        <span className="font-mono text-xs tabular-nums text-stone-600 shrink-0">
                          {count} reg.
                        </span>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {table.columns.map((col) => {
                          const isPk = col.constraints.includes('PK');
                          const isFk = Boolean(col.fkTarget);
                          return (
                            <li
                              key={col.name}
                              className="text-xs font-mono flex items-center justify-between gap-2 text-stone-700"
                            >
                              <span className="flex items-center gap-1 truncate">
                                {isPk && <KeyRound className="w-3 h-3 shrink-0 text-amber-700" aria-hidden="true" />}
                                {!isPk && isFk && (
                                  <Link2 className="w-3 h-3 shrink-0 text-sky-700" aria-hidden="true" />
                                )}
                                <span className="truncate">{col.name}</span>
                              </span>
                              <span className="shrink-0 text-stone-600">{col.type}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* Selected Table Details + Live Rows */}
      <section className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Table2 className="w-4 h-4 text-[#B91C1C]" aria-hidden="true" />
              <h2 className="text-lg font-bold font-mono text-stone-900">{activeMeta.name}</h2>
              <span className="text-xs text-stone-600 font-mono tabular-nums">
                · {tableData?.rows.length ?? 0} registros ao vivo
              </span>
            </div>
            <p className="text-sm text-stone-600 mt-0.5">{activeMeta.description}</p>
          </div>

          {activeMeta.tableConstraints && activeMeta.tableConstraints.length > 0 && (
            <div className="text-xs font-mono text-stone-700 bg-stone-100 px-3 py-1.5 rounded-md">
              {activeMeta.tableConstraints[0]}
            </div>
          )}
        </div>

        {/* Schema structure summary */}
        <div className="px-6 py-3 bg-stone-50 border-b border-stone-200 flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
          {activeMeta.columns.map((col) => (
            <div key={col.name} className="font-mono text-stone-700">
              <span className="font-semibold text-stone-900">{col.name}</span>{' '}
              <span className="text-stone-600">{col.type}</span>
              {col.constraints.length > 0 && (
                <span className="text-[#991B1B]"> [{col.constraints.join(', ')}]</span>
              )}
              {col.fkTarget && <span className="text-sky-800"> → {col.fkTarget}</span>}
            </div>
          ))}
        </div>

        {/* Live Data Rows */}
        {loadingRows ? (
          <div className="p-8 text-center text-sm text-stone-600">
            Consultando registros em <span className="font-mono">{selectedTable}</span>...
          </div>
        ) : tableError ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-medium text-red-900">{tableError}</p>
            <button
              type="button"
              onClick={() => loadTable(selectedTable)}
              className="min-h-9 px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-lg cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        ) : !tableData || tableData.rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone-600">
            Nenhum registro encontrado nesta tabela.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-xs font-mono font-semibold text-stone-700">
                  {tableData.columns.map((col) => (
                    <th key={col} className="py-2.5 px-4 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-xs font-mono">
                {tableData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-stone-50">
                    {tableData.columns.map((col) => {
                      const val = row[col];
                      const display =
                        val === null || val === undefined
                          ? 'NULL'
                          : val instanceof Date
                          ? val.toISOString()
                          : String(val);
                      return (
                        <td
                          key={col}
                          className={`py-2 px-4 whitespace-nowrap tabular-nums ${
                            val === null ? 'text-stone-500 italic' : 'text-stone-800'
                          }`}
                        >
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmResetOpen}
        title="Restaurar banco para o seed original?"
        description="Esta ação apaga todas as tabelas e recria os dados iniciais (01_criar_tabelas.sql e 02_inserir_dados.sql). Pedidos, clientes e alterações feitos nesta sessão serão perdidos."
        confirmLabel="Sim, restaurar banco"
        cancelLabel="Cancelar"
        tone="danger"
        busy={resetting}
        onCancel={() => setConfirmResetOpen(false)}
        onConfirm={handleConfirmReset}
      />
    </div>
  );
}
