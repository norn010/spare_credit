import { useEffect, useState } from 'react';
import { fetchDatabases, fetchSales, sendToAutomate } from '../services/api';
import Filters from '../components/Filters';
import SalesTable from '../components/SalesTable';
import AutomateButton from '../components/AutomateButton';

function Dashboard() {
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState(null);
  const [filters, setFilters] = useState({
    branch: null,
    startDate: null,
    endDate: null,
    docNo: null,
  });
  const [salesData, setSalesData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [loadingAutomate, setLoadingAutomate] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    async function loadDatabases() {
      try {
        const dbs = await fetchDatabases();
        setDatabases(dbs);
        if (dbs.length > 0) {
          setSelectedDatabase(dbs[0].id);
        }
      } catch (err) {
        setError('Failed to load databases.');
      }
    }

    loadDatabases();
  }, []);

  async function handleSearch() {
    if (!selectedDatabase) return;
    setLoadingSales(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const data = await fetchSales({
        database: selectedDatabase,
        branch: filters.branch || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        docNo: filters.docNo || undefined,
      });
      setSalesData(data);
      setSelectedRows([]);
    } catch (err) {
      setError('Failed to load sales data.');
    } finally {
      setLoadingSales(false);
    }
  }

  async function handleSendToAutomate() {
    if (!selectedDatabase || selectedRows.length === 0) return;
    setLoadingAutomate(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await sendToAutomate(selectedDatabase, selectedRows);
      setSuccessMessage(`Queued ${result.inserted} records for automation.`);
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.error || err.message;
      setError(detail ? `Failed to send records to automation queue. ${detail}` : 'Failed to send records to automation queue.');
    } finally {
      setLoadingAutomate(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <header className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Filter and review sales credit return records, then send selected rows to the automation
            queue.
          </p>
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 text-rose-800 border border-rose-200 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2 rounded-lg text-sm">
          {successMessage}
        </div>
      )}

      <Filters
        databases={databases}
        selectedDatabase={selectedDatabase}
        onDatabaseChange={setSelectedDatabase}
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={handleSearch}
        loading={loadingSales}
      />

      <div className="flex flex-col flex-1 min-h-0 gap-3">
        <div className="shrink-0 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            {selectedRows.length > 0
              ? `${selectedRows.length.toLocaleString()} row(s) selected`
              : 'No rows selected'}
          </div>
          <AutomateButton
            disabled={!selectedDatabase || selectedRows.length === 0}
            selectedCount={selectedRows.length}
            onClick={handleSendToAutomate}
            loading={loadingAutomate}
          />
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          <SalesTable
            data={salesData}
            onSelectionChange={setSelectedRows}
            loading={loadingSales}
          />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

