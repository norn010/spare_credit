import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useEffect, useMemo, useRef, useState } from 'react';

function SalesTable({ data, onSelectionChange, loading }) {
  const [sorting, setSorting] = useState([]);
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 30,
  });

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        size: 40,
      },
      {
        accessorKey: 'เลขที่เอกสาร',
        header: 'เลขที่ใบกำกับ',
      },
      {
        accessorKey: 'สาขา',
        header: 'สาขา',
      },
      {
        accessorKey: 'วันที่ใบกำกับ',
        header: 'วันที่ใบกำกับ',
        cell: ({ getValue }) => {
          const value = getValue();
          if (!value) return '';
          const date = new Date(value);
          return date.toLocaleDateString();
        },
      },
      {
        accessorKey: 'เลขที่PK',
        header: 'เลขที่ใบเบิก',
      },
      {
        accessorKey: 'รหัสลูกค้า',
        header: 'รหัสลูกค้า',
      },
      {
        accessorKey: 'ชื่อลูกค้า',
        header: 'ชื่อลูกค้า',
      },
      {
        accessorKey: 'ยอดสุทธิ',
        header: 'ยอดสุทธิ',
        cell: ({ getValue }) => {
          const value = getValue();
          if (value == null) return '';
          return Number(value).toLocaleString(undefined, {
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
          const value = getValue();
          if (value == null) return '';
          return Number(value).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        },
        meta: { isNumeric: true },
      },
      {
        accessorKey: 'กำไร',
        header: 'กำไร',
        cell: ({ getValue }) => {
          const value = getValue();
          if (value == null) return '';
          return Number(value).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        },
        meta: { isNumeric: true },
      },
      {
        accessorKey: 'สถานะ',
        header: 'สถานะ',
      },
      {
        accessorKey: 'ประเภทเอกสาร',
        header: 'ประเภทเอกสาร',
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      pagination,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const tableRef = useRef(table);
  tableRef.current = table;

  useEffect(() => {
    setRowSelection({});
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [data]);

  useEffect(() => {
    const selected = tableRef.current.getSelectedRowModel().flatRows.map((row) => row.original);
    onSelectionChange(selected);
  }, [rowSelection, onSelectionChange]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">Sales Credit Returns</h2>
        <p className="text-xs text-slate-500">
          {loading ? 'Loading data...' : `${data.length.toLocaleString()} records`}
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-slate-200">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    className={`px-3 py-2 text-left text-xs font-semibold text-slate-600 select-none ${
                      header.column.getCanSort() ? 'cursor-pointer' : ''
                    }`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: '▲',
                        desc: '▼',
                      }[header.column.getIsSorted()] && (
                        <span className="text-[10px] text-slate-400">
                          {{
                            asc: '▲',
                            desc: '▼',
                          }[header.column.getIsSorted()] || null}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-slate-100 hover:bg-slate-50 ${
                  row.getIsSelected() ? 'bg-primary-50/60' : ''
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`px-3 py-2 whitespace-nowrap ${
                      cell.column.columnDef.meta?.isNumeric ? 'text-right' : 'text-left'
                    } text-xs text-slate-700`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && !loading && (
              <tr>
                <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={columns.length}>
                  No data. Adjust filters and search.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={columns.length}>
                  Loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-600">
        <div>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-2 py-1 border border-slate-300 rounded disabled:opacity-40"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </button>
          <button
            type="button"
            className="px-2 py-1 border border-slate-300 rounded disabled:opacity-40"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default SalesTable;

