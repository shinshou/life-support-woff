'use strict';

const TaskModel = require('../models/taskModel');
const NotificationService = require('../services/notificationService');
const dateUtil = require('../utils/dateUtil');

async function run() {
  const today = dateUtil.getToday();
  await Promise.all([
    _checkStartTodayTasks(today),
    _checkOverdueTasks(today),
    _checkDueTodayTasks(today),
    _checkDueSoonTasks(today, 3),
  ]);
}

async function _checkStartTodayTasks(today) {
  const tasks = await TaskModel.getTasksStartingToday(today);
  await Promise.all(tasks.map(t => NotificationService.sendStartToday(t)));
}

async function _checkOverdueTasks(today) {
  const tasks = await TaskModel.getOverdueTasks(today);
  await Promise.all(tasks.map(t => NotificationService.sendOverdue(t)));
}

async function _checkDueTodayTasks(today) {
  const tasks = await TaskModel.getTasksDueToday(today);
  await Promise.all(tasks.map(t => NotificationService.sendDueToday(t)));
}

async function _checkDueSoonTasks(today, days) {
  const tasks = await TaskModel.getTasksDueSoon(today, days);
  await Promise.all(tasks.map(t => {
    const daysLeft = dateUtil.diffDays(today, String(t.due_date));
    return NotificationService.sendDueSoon(t, daysLeft);
  }));
}

module.exports = { run };
