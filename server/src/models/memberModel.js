'use strict';

const ss = require('../utils/spreadsheetUtil');
const SHEET = 'ユーザー';

async function getAll() {
  return ss.getAllRows(SHEET);
}

async function getById(userId) {
  const rows = await ss.findRowsByField(SHEET, 'user_id', userId);
  return rows.length > 0 ? rows[0] : null;
}

async function create(data) {
  await ss.appendRow(SHEET, {
    user_id: data.user_id,
    display_name: data.display_name || '',
  });
}

async function update(userId, data) {
  const row = await getById(userId);
  if (!row) throw new Error('ユーザーが見つかりません: ' + userId);
  await ss.updateRow(SHEET, row._rowIndex, data);
}

async function upsert(userId, displayName) {
  if (!userId) return;
  const existing = await getById(userId);
  if (!existing) {
    await create({ user_id: userId, display_name: displayName || '' });
  } else if (displayName && existing.display_name !== displayName) {
    await update(userId, { display_name: displayName });
  }
}

async function isAdmin(userId) {
  const row = await getById(userId);
  if (!row) return false;
  return row['is_admin'] === true || row['is_admin'] === 'TRUE';
}

async function canCreate(userId) {
  const row = await getById(userId);
  if (!row) return false;
  return row['can_create'] === true || row['can_create'] === 'TRUE';
}

async function setCanCreate(userId, flag) {
  const row = await getById(userId);
  if (!row) throw new Error('ユーザーが見つかりません: ' + userId);
  await ss.updateRow(SHEET, row._rowIndex, { can_create: flag ? 'TRUE' : 'FALSE' });
}

module.exports = { getAll, getById, create, update, upsert, isAdmin, canCreate, setCanCreate };
