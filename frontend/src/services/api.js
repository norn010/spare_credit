import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 60000,
});

export async function fetchDatabases() {
  const { data } = await api.get('/databases');
  return data;
}

export async function fetchBranches(params) {
  const { data } = await api.get('/branches', { params });
  return data;
}

export async function fetchSales(params) {
  const { data } = await api.get('/sales', { params });
  return data;
}

export async function sendToAutomate(database, rows) {
  const { data } = await api.post('/automate', { database, rows });
  return data;
}

export async function fetchAutomateQueue(params) {
  const { data } = await api.get('/automate-queue', { params });
  return data;
}

export async function updateAutomateQueueRow(id, payload) {
  const { data } = await api.put(`/automate-queue/${id}`, payload);
  return data;
}

export async function sendToDebtClearing(id) {
  const { data } = await api.post(`/automate-queue/${id}/send-to-debt-clearing`);
  return data;
}

export async function createDebtClearingBatch(payload) {
  const { data } = await api.post('/debt-clearing-batch', payload);
  return data;
}

export default api;

