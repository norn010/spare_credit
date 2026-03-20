const express = require('express');
const { executeQuery, getQueueDatabaseName } = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  const queueDb = getQueueDatabaseName();
  if (!queueDb) {
    return res.status(500).json({ error: 'Queue database not configured' });
  }

  const { database } = req.query;

  const query = `
    SELECT
      id,
      database_name,
      [branch],
      rs_docno,
      fee,
      diff_debit,
      diff_credit,
      bank_statement,
      [รหัสลูกค้า],
      [ยอดรวมสุทธิ],
      created_at
    FROM [dbo].[reconcile_batch]
    WHERE
      bank_statement = N'confirm'
      AND (@database IS NULL OR database_name = @database)
    ORDER BY created_at DESC
  `;

  try {
    const result = await executeQuery(queueDb, query, { database: database || null });
    return res.json(result.recordset || []);
  } catch (err) {
    console.error('Error fetching reconcile batches', err);
    return res.status(500).json({ error: 'Failed to fetch reconcile batches' });
  }
});

module.exports = router;

