'use strict';

const ss = require('../utils/spreadsheetUtil');
const dateUtil = require('../utils/dateUtil');
const SHEET = 'タスク';

async function getByProjectId(projectId) {
  return ss.findRowsByField(SHEET, 'project_id', projectId);
}

async function getById(taskId) {
  const rows = await ss.findRowsByField(SHEET, 'task_id', taskId);
  return rows.length > 0 ? rows[0] : null;
}

async function getAll() {
  return ss.getAllRows(SHEET);
}

async function create(data) {
  const id = ss.generateId('task');
  await ss.appendRow(SHEET, {
    task_id: id,
    project_id: data.project_id || data.projectId || '',
    default_task_id: data.default_task_id || '',
    task_name: data.task_name,
    assignee: data.assignee || '',
    start_date: data.start_date || '',
    due_date: data.due_date || '',
    status: data.status || '未着手',
    comment: data.comment || '',
  });
  return id;
}

async function update(taskId, data) {
  const row = await getById(taskId);
  if (!row) throw new Error('タスクが見つかりません: ' + taskId);
  await ss.updateRow(SHEET, row._rowIndex, data);
}

async function deleteById(taskId) {
  const row = await getById(taskId);
  if (!row) throw new Error('タスクが見つかりません: ' + taskId);
  await ss.deleteRow(SHEET, row._rowIndex);
}

async function deleteByProjectId(projectId) {
  const rows = (await getByProjectId(projectId))
    .sort((a, b) => b._rowIndex - a._rowIndex);
  for (const row of rows) {
    await ss.deleteRow(SHEET, row._rowIndex);
  }
}

async function getOverdueTasks(today) {
  const all = await getAll();
  return all.filter(t => t.due_date && t.status !== '完了' && String(t.due_date) < today);
}

async function getTasksDueToday(today) {
  const all = await getAll();
  return all.filter(t => t.due_date && t.status !== '完了' && String(t.due_date) === today);
}

async function getTasksStartingToday(today) {
  const all = await getAll();
  return all.filter(t => t.start_date && t.status !== '完了' && String(t.start_date) === today);
}

async function getTasksDueSoon(today, days) {
  const limit = dateUtil.addDays(today, days);
  const all = await getAll();
  return all.filter(t =>
    t.due_date && t.status !== '完了' &&
    String(t.due_date) > today && String(t.due_date) <= limit
  );
}

module.exports = {
  getByProjectId, getById, getAll, create, update,
  deleteById, deleteByProjectId,
  getOverdueTasks, getTasksDueToday, getTasksStartingToday, getTasksDueSoon,
};
