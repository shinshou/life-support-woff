'use strict';

const ss = require('../utils/spreadsheetUtil');
const ProjectRoomModel = require('./projectRoomModel');
const SHEET = 'ルーム';

async function getAll() {
  return ss.getAllRows(SHEET);
}

async function getById(roomId) {
  const rows = await ss.findRowsByField(SHEET, 'room_id', roomId);
  return rows.length > 0 ? rows[0] : null;
}

async function create(data) {
  await ss.appendRow(SHEET, {
    room_id: data.room_id,
    room_name: data.room_name || data.room_id,
  });
}

async function update(roomId, data) {
  const row = await getById(roomId);
  if (!row) throw new Error('ルームが見つかりません: ' + roomId);
  await ss.updateRow(SHEET, row._rowIndex, data);
}

async function getByProjectId(projectId) {
  const roomIds = await ProjectRoomModel.getRoomIdsByProjectId(projectId);
  if (roomIds.length === 0) return [];
  const all = await getAll();
  return all.filter(r => roomIds.includes(r.room_id));
}

module.exports = { getAll, getById, create, update, getByProjectId };
