import { useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchAutomateQueue,
  updateAutomateQueueRow,
  createDebtClearingBatch,
} from '../services/api';

const initialBatchForm = {
  rs_docno: '',
  bank_account: '',
  ar_account: '',
  fee_account: '',
  diff_account: '',
  fee: '',
  diff_debit: '',
  diff_credit: '',
  bank_statement: 'confirm',
};

const ACCOUNT_OPTIONS_BY_DB = {
  GWM: {
    default: {
      bank_account: [
        '1101-04-02 | BAY 634-0-00147-5',
        '1101-05-01 | BBL 339-5-08912-5',
        '1101-05-02 | BAY 634-1-174852',
      ],
      ar_account: [
        '1102-01-02 | ลูกหนี้การค้า-ฝ่ายศูนย์บริการ/อะไหล่',
      ],
      fee_account: [
        '6221-02-00 | ค่าธรรมเนียมธนาคารและอื่นๆ-โคราช',
      ],
      diff_account: [
        '6225-99-00 | ส่วนต่างเงินสดจ่าย-เงินสดรับ',
      ],
    },
  },
};

function getAccountOptions(databaseName, branch) {
  const dbConfig = ACCOUNT_OPTIONS_BY_DB[databaseName] || {};
  return dbConfig[branch] || dbConfig.default || {
    bank_account: [],
    ar_account: [],
    fee_account: [],
    diff_account: [],
  };
}

function parseAccountValue(value) {
  const raw = (value || '').trim();
  if (!raw) return { code: null, name: null };
  const parts = raw.split('|');
  if (parts.length >= 2) {
    return {
      code: parts[0].trim() || null,
      name: parts.slice(1).join('|').trim() || null,
    };
  }
  return { code: raw, name: null };
}

function AutomateCompleted() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchForm, setBatchForm] = useState(initialBatchForm);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    setSelectedRows((prev) =>
      new Set([...prev].filter((id) => rows.some((r) => r.id === id))),
    );
  }, [rows]);

  const brands = useMemo(() => {
    const set = new Set();
    rows.forEach((row) => {
      if (row.database_name) set.add(row.database_name);
    });
    return Array.from(set).sort();
  }, [rows]);

  const typeOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((row) => {
      if (row['ประเภท']) set.add(row['ประเภท']);
    });
    return Array.from(set).sort();
  }, [rows]);

  const selectedBatchRows = useMemo(
    () => rows.filter((r) => selectedRows.has(r.id)),
    [rows, selectedRows],
  );

  const batchContext = selectedBatchRows[0]
    ? {
        database_name: selectedBatchRows[0].database_name || '',
        branch: selectedBatchRows[0]['สาขา'] || '',
      }
    : null;

  const accountOptions = useMemo(
    () => getAccountOptions(batchContext?.database_name, batchContext?.branch),
    [batchContext?.database_name, batchContext?.branch],
  );

  const selectedNetTotal = useMemo(
    () => selectedBatchRows.reduce((sum, r) => sum + (r['ยอดสุทธิ'] != null ? Number(r['ยอดสุทธิ']) : 0), 0),
    [selectedBatchRows],
  );

  function getAgingDays(dateStr) {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return Math.floor((today - d) / (1000 * 60 * 60 * 24));
  }

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      if (sortKey === 'aging') {
        const va = getAgingDays(a['วันที่ใบกำกับ']);
        const vb = getAgingDays(b['วันที่ใบกำกับ']);
        if (va == null && vb == null) return 0;
        if (va == null) return sortAsc ? 1 : -1;
        if (vb == null) return sortAsc ? -1 : 1;
        return sortAsc ? va - vb : vb - va;
      }
      let va = a[sortKey];
      let vb = b[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return sortAsc ? 1 : -1;
      if (vb == null) return sortAsc ? -1 : 1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortAsc ? va - vb : vb - va;
      }
      const da = new Date(va).getTime();
      const db = new Date(vb).getTime();
      if (!Number.isNaN(da) && !Number.isNaN(db)) {
        return sortAsc ? da - db : db - da;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      const cmp = sa < sb ? -1 : sa > sb ? 1 : 0;
      return sortAsc ? cmp : -cmp;
    });
  }, [rows, sortKey, sortAsc]);

  function toggleSort(key) {
    if (sortKey === key) setSortAsc((a) => !a);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  async function loadData(brand = selectedBrand) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAutomateQueue({
        status: 'เสร็จแล้ว',
        database: brand || undefined,
      });
      setRows(data);
    } catch (err) {
      setError('Failed to load completed automation queue.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData('');
    // no auto-refresh here by default; user can refresh via browser
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData(selectedBrand);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrand]);

  function updateLocalRow(id, patch) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }

  async function handleSave(row) {
    setSavingId(row.id);
    setError(null);
    try {
      await updateAutomateQueueRow(row.id, {
        ประเภท: row['ประเภท'] || null,
        BankStatement: row.BankStatement || null,
        ส่งBP: row['ส่งBP'] || null,
        หมายเหตุ: row['หมายเหตุ'] || null,
        หักค่าธรรมเนียม: row['หักค่าธรรมเนียม'] ?? null,
        ส่วนต่างเดบิต: row['ส่วนต่างเดบิต'] ?? null,
        ส่วนต่างเครดิต: row['ส่วนต่างเครดิต'] ?? null,
      });
    } catch (err) {
      setError('Failed to save row changes.');
    } finally {
      setSavingId(null);
    }
  }

  function updateAndSave(row, patch) {
    updateLocalRow(row.id, patch);
    handleSave({ ...row, ...patch });
  }

  function updateAndSaveOnBlur(rowId) {
    const r = rowsRef.current.find((x) => x.id === rowId);
    if (r) handleSave(r);
  }

  function toggleRowSelection(id) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected =
    sortedRows.length > 0 && sortedRows.every((r) => selectedRows.has(r.id));
  function toggleSelectAll() {
    if (allSelected) {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        sortedRows.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        sortedRows.forEach((r) => next.add(r.id));
        return next;
      });
    }
  }

  function handleOpenBatchModal() {
    setBatchForm(initialBatchForm);
    setShowBatchModal(true);
  }

  function handleBatchFormChange(field, value) {
    setBatchForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreateBatch() {
    if (selectedBatchRows.length === 0) return;
    const first = selectedBatchRows[0];
    const sameDbBranch = selectedBatchRows.every(
      (r) => r.database_name === first.database_name && r['สาขา'] === first['สาขา'],
    );
    if (!sameDbBranch) {
      setError('กรุณาเลือกข้อมูลที่เป็น Database และสาขาเดียวกันก่อนสร้างรายการตัดชำระ');
      return;
    }
    const bank = parseAccountValue(batchForm.bank_account);
    const ar = parseAccountValue(batchForm.ar_account);
    const feeAccount = parseAccountValue(batchForm.fee_account);
    const diff = parseAccountValue(batchForm.diff_account);

    const payload = {
      database_name: first.database_name,
      branch: first['สาขา'] ?? '',
      รหัสลูกค้า: first['รหัสลูกค้า'] ?? null,
      rs_docno: batchForm.rs_docno.trim(),
      bank_account: bank.code,
      bank_account_name: bank.name,
      ar_account: ar.code,
      ar_account_name: ar.name,
      fee_account: feeAccount.code,
      fee_account_name: feeAccount.name,
      diff_account: diff.code,
      diff_account_name: diff.name,
      fee: batchForm.fee === '' ? null : Number(batchForm.fee),
      diff_debit: batchForm.diff_debit === '' ? null : Number(batchForm.diff_debit),
      diff_credit: batchForm.diff_credit === '' ? null : Number(batchForm.diff_credit),
      bank_statement: batchForm.bank_statement || 'confirm',
      rows: selectedBatchRows.map((r) => ({
        id: r.id,
        invoice_no: r['เลขที่ใบกำกับ'] ?? '',
        pk_no: '',
        amount: r['ยอดสุทธิ'] != null ? Number(r['ยอดสุทธิ']) : null,
      })),
    };
    setBatchSubmitting(true);
    setError(null);
    try {
      await createDebtClearingBatch(payload);
      setRows((prev) => prev.filter((r) => !selectedRows.has(r.id)));
      setSelectedRows(new Set());
      setShowBatchModal(false);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to create batch.');
    } finally {
      setBatchSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <header className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">รายงานตัดชำระหนี้ อะไหล่เงินเชื่อ</h1>
          <p className="text-sm text-slate-500">
            Review completed automation records and capture reconciliation details.
          </p>
        </div>
        <div className="flex items-end gap-4">
          <div className="flex flex-col min-w-[160px]">
            <label className="text-xs font-medium text-slate-600 mb-1">Brand / Database</label>
            <select
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
            >
              <option value="">All</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {error && (
        <div className="shrink-0 bg-rose-50 text-rose-800 border border-rose-200 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="shrink-0 border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-800">รายการตัดชำระหนี้</h2>
            <button
              type="button"
              onClick={handleOpenBatchModal}
              disabled={selectedRows.size === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              สร้างรายการตัดชำระ
            </button>
          </div>
          <p className="text-xs text-slate-500 shrink-0">
            {loading ? 'Loading...' : `${rows.length.toLocaleString()} รายการ`}
            {selectedRows.size > 0 && ` · เลือก ${selectedRows.size} แถว`}
          </p>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  aria-label="Select all"
                />
              </th>
              {[
                ['aging', 'Aging', 'right'],
                ['database_name', 'Database', 'left'],
                ['เลขที่ใบกำกับ', 'เลขที่ใบกำกับ', 'left'],
                ['รหัสลูกค้า', 'รหัสลูกค้า', 'left'],
                ['ชื่อลูกค้า', 'ชื่อลูกค้า', 'left'],
                ['สาขา', 'สาขา', 'left'],
                ['วันที่ใบกำกับ', 'วันที่ใบกำกับ', 'left'],
                ['ยอดสุทธิ', 'ยอดสุทธิ', 'right'],
                ['ส่งBP', 'ส่งBP', 'left'],
                
                ['หมายเหตุ', 'หมายเหตุ', 'left'],
                ['ประเภท', 'ประเภท', 'left'],
                ['BankStatement', 'Bank Statement', 'left'],
                ['หักค่าธรรมเนียม', 'หักค่าธรรมเนียม', 'right'],
                ['ส่วนต่างเดบิต', 'ส่วนต่าง เดบิต', 'right'],
                ['ส่วนต่างเครดิต', 'ส่วนต่าง เครดิต', 'right'],
              ].map(([key, label, align]) => (
                  <th
                    key={key}
                    className={`px-3 py-2 font-semibold text-slate-600 select-none cursor-pointer hover:bg-slate-100 ${
                      align === 'right' ? 'text-right' : 'text-left'
                    }`}
                    onClick={() => toggleSort(key)}
                  >
                  <span className="flex items-center gap-1">
                    {label}
                    {sortKey === key && (
                      <span className="text-[10px] text-slate-400">
                        {sortAsc ? '▲' : '▼'}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const agingDays = getAgingDays(row['วันที่ใบกำกับ']);
              const agingColor =
                agingDays == null
                  ? ''
                  : agingDays <= 15
                    ? 'bg-blue-100 text-blue-800'
                    : agingDays <= 29
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800';
              return (
              <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(row.id)}
                    onChange={() => toggleRowSelection(row.id)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    aria-label={`Select row ${row.id}`}
                  />
                </td>
                <td className={`px-3 py-2 text-right font-medium ${agingColor}`}>
                  {agingDays != null ? agingDays : ''}
                </td>
                <td className="px-3 py-2">{row.database_name}</td>
                <td className="px-3 py-2">{row['เลขที่ใบกำกับ']}</td>
                <td className="px-3 py-2">{row['รหัสลูกค้า']}</td>
                <td className="px-3 py-2">{row['ชื่อลูกค้า']}</td>
                <td className="px-3 py-2">{row['สาขา']}</td>
                <td className="px-3 py-2">
                  {row['วันที่ใบกำกับ']
                    ? new Date(row['วันที่ใบกำกับ']).toLocaleString()
                    : ''}
                </td>
                <td className="px-3 py-2 text-right">
                  {row['ยอดสุทธิ'] != null
                    ? Number(row['ยอดสุทธิ']).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : ''}
                </td>
                <td className="px-3 py-2">
                  <select
                    className="w-28 px-2 py-1 border border-slate-300 rounded text-xs"
                    value={row['ส่งBP'] || ''}
                    onChange={(e) => updateAndSave(row, { ส่งBP: e.target.value })}
                  >
                    <option value="">เลือก</option>
                    <option value="ส่งให้BP">ส่งให้BP</option>
                    <option value="BPส่งกลับ">BPส่งกลับ</option>
                  </select>
                </td>
                
                <td className="px-3 py-2">
                  <input
                    type="text"
                    className="min-w-[120px] w-full max-w-[200px] px-2 py-1 border border-slate-300 rounded text-xs"
                    value={row['หมายเหตุ'] || ''}
                    onChange={(e) => updateLocalRow(row.id, { หมายเหตุ: e.target.value })}
                    onBlur={() => updateAndSaveOnBlur(row.id)}
                    placeholder="หมายเหตุ"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    list="type-options"
                    className="w-32 px-2 py-1 border border-slate-300 rounded text-xs"
                    value={row['ประเภท'] || ''}
                    onChange={(e) => updateLocalRow(row.id, { ประเภท: e.target.value })}
                    onBlur={() => updateAndSaveOnBlur(row.id)}
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    className="w-28 px-2 py-1 border border-slate-300 rounded text-xs"
                    value={row.BankStatement || ''}
                    onChange={(e) => updateAndSave(row, { BankStatement: e.target.value })}
                  >
                    <option value="">เลือก</option>
                    <option value="confirm">confirm</option>
                  </select>
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    className="w-24 px-2 py-1 border border-slate-300 rounded text-xs text-right"
                    value={row['หักค่าธรรมเนียม'] ?? ''}
                    onChange={(e) =>
                      updateLocalRow(row.id, {
                        หักค่าธรรมเนียม: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    onBlur={() => updateAndSaveOnBlur(row.id)}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    className="w-24 px-2 py-1 border border-slate-300 rounded text-xs text-right"
                    value={row['ส่วนต่างเดบิต'] ?? ''}
                    onChange={(e) =>
                      updateLocalRow(row.id, {
                        ส่วนต่างเดบิต: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    onBlur={() => updateAndSaveOnBlur(row.id)}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    className="w-24 px-2 py-1 border border-slate-300 rounded text-xs text-right"
                    value={row['ส่วนต่างเครดิต'] ?? ''}
                    onChange={(e) =>
                      updateLocalRow(row.id, {
                        ส่วนต่างเครดิต: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    onBlur={() => updateAndSaveOnBlur(row.id)}
                  />
                </td>
              </tr>
              );
            })}
            {sortedRows.length === 0 && !loading && (
              <tr>
                <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={16}>
                  No completed records.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={16}>
                  Loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <datalist id="type-options">
          {typeOptions.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>

      {showBatchModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-modal-title"
        >
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 id="batch-modal-title" className="text-lg font-semibold text-slate-900 mb-4">
              สร้างรายการตัดชำระ (Batch)
            </h3>
            <p className="text-xs text-slate-500 mb-2">
              เลือกแล้ว {selectedRows.size} แถว · กรอกข้อมูล RS และค่าต่างๆ แล้วกด Create Batch
            </p>
            <p className="text-xs text-slate-500 mb-4">
              DB: {batchContext?.database_name || '-'} · สาขา: {batchContext?.branch || '-'}
            </p>
            <p className="text-xs font-medium text-emerald-700 mb-4">
              ยอดรวมสุทธิจากรายการที่เลือก: {selectedNetTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">RS Document No</label>
                <input
                  type="text"
                  value={batchForm.rs_docno}
                  onChange={(e) => handleBatchFormChange('rs_docno', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g. RS6902-004"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">บัญชีธนาคาร</label>
                <input
                  type="text"
                  list="bank-account-options"
                  value={batchForm.bank_account}
                  onChange={(e) => handleBatchFormChange('bank_account', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="เลือกหรือพิมพ์เอง"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ลูกหนี้การค้า (รวมสุทธิ)</label>
                <input
                  type="text"
                  list="ar-account-options"
                  value={batchForm.ar_account}
                  onChange={(e) => handleBatchFormChange('ar_account', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="เลือกหรือพิมพ์เอง"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ค่าธรรมเนียม (ผังบัญชี)</label>
                <input
                  type="text"
                  list="fee-account-options"
                  value={batchForm.fee_account}
                  onChange={(e) => handleBatchFormChange('fee_account', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="เลือกหรือพิมพ์เอง"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ส่วนต่างเดบิต/เครดิต (ผังบัญชี)</label>
                <input
                  type="text"
                  list="diff-account-options"
                  value={batchForm.diff_account}
                  onChange={(e) => handleBatchFormChange('diff_account', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="เลือกหรือพิมพ์เอง"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">หักค่าธรรมเนียม</label>
                <input
                  type="number"
                  value={batchForm.fee}
                  onChange={(e) => handleBatchFormChange('fee', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ส่วนต่าง เดบิต</label>
                <input
                  type="number"
                  value={batchForm.diff_debit}
                  onChange={(e) => handleBatchFormChange('diff_debit', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ส่วนต่าง เครดิต</label>
                <input
                  type="number"
                  value={batchForm.diff_credit}
                  onChange={(e) => handleBatchFormChange('diff_credit', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bank Statement</label>
                <select
                  value={batchForm.bank_statement}
                  onChange={(e) => handleBatchFormChange('bank_statement', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="confirm">confirm</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                disabled={batchSubmitting}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateBatch}
                disabled={batchSubmitting || !batchForm.rs_docno.trim()}
                className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {batchSubmitting ? 'กำลังสร้าง...' : 'Create Batch'}
              </button>
            </div>
            <datalist id="bank-account-options">
              {accountOptions.bank_account.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id="ar-account-options">
              {accountOptions.ar_account.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id="fee-account-options">
              {accountOptions.fee_account.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id="diff-account-options">
              {accountOptions.diff_account.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>
        </div>
      )}
    </div>
  );
}

export default AutomateCompleted;

