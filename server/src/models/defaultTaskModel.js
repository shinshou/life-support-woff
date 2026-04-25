'use strict';

const ss = require('../utils/spreadsheetUtil');
const SHEET = 'デフォルトタスク';

async function getAll() {
  return ss.getAllRows(SHEET);
}

async function getById(defaultTaskId) {
  const rows = await ss.findRowsByField(SHEET, 'default_task_id', defaultTaskId);
  return rows.length > 0 ? rows[0] : null;
}

async function create(data) {
  const id = ss.generateId('dtask');
  await ss.appendRow(SHEET, {
    default_task_id: id,
    task_name: data.task_name,
    offset_days: data.offset_days,
  });
  return id;
}

async function update(defaultTaskId, data) {
  const row = await getById(defaultTaskId);
  if (!row) throw new Error('デフォルトタスクが見つかりません: ' + defaultTaskId);
  await ss.updateRow(SHEET, row._rowIndex, data);
}

async function deleteById(defaultTaskId) {
  const row = await getById(defaultTaskId);
  if (!row) throw new Error('デフォルトタスクが見つかりません: ' + defaultTaskId);
  await ss.deleteRow(SHEET, row._rowIndex);
}

module.exports = { getAll, getById, create, update, deleteById };
