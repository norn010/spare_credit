import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

function statusColor(status) {
  if (status === 'สำเร็จ') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (status === 'ล้มเหลว') {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  return 'bg-amber-50 text-amber-800 border-amber-200';
}

function QueueTable({ data, loading, onRefresh }) {
  const [sorting, setSorting] = useState([]);

  const columns = useMemo(
    () => [
      { accessorKey: 'id', header: 'Queue ID', size: 80 },
      { accessorKey: 'database_name', header: 'Database' },
      { accessorKey: 'เลขที่ใบกำกับ', header: 'เลขที่ใบกำกับ' },
      { accessorKey: 'เลขที่ใบเบิก', header: 'เลขที่ใบเบิก' },
      { accessorKey: 'สาขา', header: 'สาขา' },
      {
        accessorKey: 'วันที่ใบกำกับ',
        header: 'วันที่ใบกำกับ',
        cell: ({ getValue }) => {
          const v = getValue();
          return v ? new Date(v).toLocaleString() : '';
        },
      },
      { accessorKey: 'ชื่อลูกค้า', header: 'ชื่อลูกค้า' },
      {
        accessorKey: 'ยอดสุทธิ',
        header: 'ยอดสุทธิ',
        cell: ({ getValue }) => {
          const v = getValue();
          if (v == null) return '';
          return Number(v).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        },
        meta: { isNumeric: true },
      },
      {
        accessorKey: 'ต้นทุนรวม',
        header: 'ต้นทุนรวม',
        cell: ({ getValue }) => {
          const v = getValue();
          if (v == null) return '';
          return Number(v).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        },
        meta: { isNumeric: true },
      },
      {
        accessorKey: 'created_at',
        header: 'Created Time',
        cell: ({ getValue }) => {
          const v = getValue();
          return v ? new Date(v).toLocaleString() : '';
        },
      },
      {
        accessorKey: 'automate_status',
        header: 'Automate Status',
        cell: ({ getValue }) => {
          const status = getValue();
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${statusColor(
                status,
              )}`}
            >
              {status}
            </span>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const headerGroups = table.getHeaderGroups();
  const rowModel = table.getRowModel();
  const colCount = headerGroups[0]?.headers.length ?? 11;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Automation Queue</h2>
          <p className="text-xs text-slate-500">
            {loading ? 'Refreshing...' : `${data.length.toLocaleString()} records`}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Refresh
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 sticky top-0 z-10">
            {headerGroups.map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-slate-200">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-3 py-2 text-xs font-semibold text-slate-600 select-none ${
                      header.column.getCanSort() ? 'cursor-pointer hover:bg-slate-100' : ''
                    } ${
                      header.column.columnDef.meta?.isNumeric ? 'text-right' : 'text-left'
                    }`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div
                      className={`flex items-center gap-1 ${
                        header.column.columnDef.meta?.isNumeric ? 'justify-end' : ''
                      }`}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <span className="text-[10px] text-slate-400">
                        {{ asc: '▲', desc: '▼' }[header.column.getIsSorted()] ?? ''}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rowModel.rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`px-3 py-2 whitespace-nowrap ${
                      cell.column.columnDef.meta?.isNumeric ? 'text-right' : 'text-left'
                    } text-slate-700`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {rowModel.rows.length === 0 && !loading && (
              <tr>
                <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={colCount}>
                  No queued records yet.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={colCount}>
                  Loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default QueueTable;
