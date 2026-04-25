'use strict';

const ss = require('../utils/spreadsheetUtil');
const SHEET = 'プロジェクト_ルーム紐付け';

async function getAll() {
  return ss.getAllRows(SHEET);
}

async function getByProjectId(projectId) {
  return ss.findRowsByField(SHEET, 'project_id', projectId);
}

async function getByRoomId(roomId) {
  return ss.findRowsByField(SHEET, 'room_id', roomId);
}

async function getRoomIdsByProjectId(projectId) {
  const rows = await getByProjectId(projectId);
  return rows.map(r => r.room_id);
}

async function getProjectIdsByRoomId(roomId) {
  const rows = await getByRoomId(roomId);
  return rows.map(r => r.project_id);
}

async function exists(projectId, roomId) {
  const all = await getAll();
  return all.some(r => r.project_id === projectId && r.room_id === roomId);
}

async function create(projectId, roomId) {
  if (await exists(projectId, roomId)) return;
  await ss.appendRow(SHEET, { project_id: projectId, room_id: roomId });
}

async function deleteByProjectIdAndRoomId(projectId, roomId) {
  const all = await getAll();
  const rows = all
    .filter(r => r.project_id === projectId && r.room_id === roomId)
    .sort((a, b) => b._rowIndex - a._rowIndex);
  for (const r of rows) {
    await ss.deleteRow(SHEET, r._rowIndex);
  }
}

async function deleteByProjectId(projectId) {
  const rows = (await getByProjectId(projectId))
    .sort((a, b) => b._rowIndex - a._rowIndex);
  for (const r of rows) {
    await ss.deleteRow(SHEET, r._rowIndex);
  }
}

module.exports = {
  getByProjectId,
  getByRoomId,
  getRoomIdsByProjectId,
  getProjectIdsByRoomId,
  exists,
  create,
  deleteByProjectIdAndRoomId,
  deleteByProjectId,
};
