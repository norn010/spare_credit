import { useEffect, useState } from 'react';
import { fetchReconcileBatches } from '../services/api';

function AutomationReconcileReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchReconcileBatches({});
        setRows(data);
      } catch (err) {
        setError('Failed to load reconcile batch report.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <header className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Automation รายงานตัดชำระหนี้
          </h1>
          <p className="text-sm text-slate-500">
            แสดง `reconcile_batch` ที่ `bank_statement=confirm`
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">
            {loading ? 'Loading...' : `${rows.length.toLocaleString()} รายการ`}
          </div>
        </div>
      </header>

      {error && (
        <div className="shrink-0 bg-rose-50 text-rose-800 border border-rose-200 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="shrink-0 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">รายการ batch</h2>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="border-b border-slate-200">
                {[
                  ['id', 'id', 'left'],
                  ['database_name', 'database_name', 'left'],
                  ['branch', 'branch', 'left'],
                  ['rs_docno', 'rs_docno', 'left'],
                  ['fee', 'fee', 'right'],
                  ['diff_debit', 'diff_debit', 'right'],
                  ['diff_credit', 'diff_credit', 'right'],
                  ['bank_statement', 'bank_statement', 'left'],
                  ['รหัสลูกค้า', 'รหัสลูกค้า', 'left'],
                  ['ยอดรวมสุทธิ', 'ยอดรวมสุทธิ', 'right'],
                  ['created_at', 'created_at', 'left'],
                ].map(([key, label, align]) => (
                  <th
                    key={key}
                    className={`px-3 py-2 font-semibold text-slate-600 ${
                      align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-3 py-2">{row.id}</td>
                  <td className="px-3 py-2">{row.database_name}</td>
                  <td className="px-3 py-2">{row.branch ?? ''}</td>
                  <td className="px-3 py-2">{row.rs_docno}</td>
                  <td className="px-3 py-2 text-right">
                    {row.fee != null ? Number(row.fee).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.diff_debit != null ? Number(row.diff_debit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.diff_credit != null ? Number(row.diff_credit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                  </td>
                  <td className="px-3 py-2">{row.bank_statement}</td>
                  <td className="px-3 py-2">{row['รหัสลูกค้า']}</td>
                  <td className="px-3 py-2 text-right">
                    {row['ยอดรวมสุทธิ'] != null
                      ? Number(row['ยอดรวมสุทธิ']).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : ''}
                  </td>
                  <td className="px-3 py-2">
                    {row.created_at ? new Date(row.created_at).toLocaleString() : ''}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-sm text-slate-500"
                    colSpan={11}
                  >
                    No data.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-sm text-slate-500"
                    colSpan={11}
                  >
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AutomationReconcileReport;

