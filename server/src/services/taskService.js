'use strict';

const TaskModel = require('../models/taskModel');
const DefaultTaskModel = require('../models/defaultTaskModel');
const NotificationService = require('./notificationService');
const dateUtil = require('../utils/dateUtil');

async function getTasks(projectId) {
  return TaskModel.getByProjectId(projectId);
}

async function createTask(data) {
  return TaskModel.create(data);
}

async function updateTask(taskId, data) {
  const before = await TaskModel.getById(taskId);
  if (!before) throw new Error('タスクが見つかりません: ' + taskId);

  await TaskModel.update(taskId, data);

  if (data.status === '完了' && before.status !== '完了') {
    try {
      const updated = await TaskModel.getById(taskId);
      await NotificationService.sendTaskComplete(updated);
    } catch {}
  }
}

async function deleteTask(taskId) {
  await TaskModel.deleteById(taskId);
}

async function createDefaultTasks(projectId, startDate, selectedDefaultTaskIds) {
  for (const id of selectedDefaultTaskIds) {
    const defaultTask = await DefaultTaskModel.getById(id);
    if (!defaultTask) continue;
    const dueDate = dateUtil.addDays(startDate, Number(defaultTask.offset_days));
    await TaskModel.create({
      project_id: projectId,
      default_task_id: defaultTask.default_task_id,
      task_name: defaultTask.task_name,
      start_date: startDate,
      due_date: dueDate,
      status: '未着手',
    });
  }
}

module.exports = { getTasks, createTask, updateTask, deleteTask, createDefaultTasks };
