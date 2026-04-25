'use strict';

const ss = require('../utils/spreadsheetUtil');
const ProjectRoomModel = require('./projectRoomModel');
const SHEET = 'プロジェクト';

async function getAll() {
  return ss.getAllRows(SHEET);
}

async function getById(projectId) {
  const rows = await ss.findRowsByField(SHEET, 'project_id', projectId);
  return rows.length > 0 ? rows[0] : null;
}

async function getByRoomId(roomId) {
  const projectIds = await ProjectRoomModel.getProjectIdsByRoomId(roomId);
  if (projectIds.length === 0) return [];
  const all = await getAll();
  return all.filter(p => projectIds.includes(p.project_id));
}

async function create(data) {
  const id = ss.generateId('proj');
  await ss.appendRow(SHEET, {
    project_id: id,
    project_name: data.project_name,
    project_type: data.project_type || '',
    start_date: data.start_date || '',
  });
  return id;
}

async function update(projectId, data) {
  const row = await getById(projectId);
  if (!row) throw new Error('プロジェクトが見つかりません: ' + projectId);
  await ss.updateRow(SHEET, row._rowIndex, data);
}

async function deleteById(projectId) {
  const row = await getById(projectId);
  if (!row) throw new Error('プロジェクトが見つかりません: ' + projectId);
  await ss.deleteRow(SHEET, row._rowIndex);
}

module.exports = { getAll, getById, getByRoomId, create, update, deleteById };
