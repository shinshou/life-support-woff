'use strict';

const jwt = require('jsonwebtoken');
const ProjectRoomModel = require('../models/projectRoomModel');
const ProjectModel = require('../models/projectModel');

function _getPrivateKey() {
  return (process.env.LINEWORKS_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .trim();
}

async function getAccessToken() {
  const clientId = process.env.LINEWORKS_CLIENT_ID;
  const clientSecret = process.env.LINEWORKS_CLIENT_SECRET;
  const serviceAccount = process.env.LINEWORKS_SERVICE_ACCOUNT;
  const privateKey = _getPrivateKey();

  const assertion = jwt.sign(
    { iss: clientId, sub: serviceAccount },
    privateKey,
    { algorithm: 'RS256', expiresIn: '1h' }
  );

  const res = await fetch('https://auth.worksmobile.com/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      assertion,
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'bot',
    }),
  });
  const data = await res.json();
  return data.access_token;
}

async function _postToRoom(roomId, message) {
  try {
    const botId = process.env.LINEWORKS_BOT_ID;
    const token = await getAccessToken();
    let url;
    if (roomId.startsWith('user_')) {
      const userId = roomId.slice('user_'.length);
      url = `https://www.worksapis.com/v1.0/bots/${botId}/users/${userId}/messages`;
    } else {
      url = `https://www.worksapis.com/v1.0/bots/${botId}/channels/${roomId}/messages`;
    }
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { type: 'text', text: message } }),
    });
  } catch (e) {
    console.error('通知送信エラー roomId=' + roomId, e);
  }
}

async function _notifyProjectRooms(task, message) {
  const roomIds = await ProjectRoomModel.getRoomIdsByProjectId(task.project_id);
  await Promise.all(roomIds.map(roomId => _postToRoom(roomId, message)));
}

async function sendStartToday(task) {
  const project = await ProjectModel.getById(task.project_id);
  const projectName = project ? project.project_name : task.project_id;
  await _notifyProjectRooms(task,
    `[本日開始] ${task.task_name}（${projectName}）\n担当: ${task.assignee || '未設定'}`
  );
}

async function sendTaskComplete(task) {
  const project = await ProjectModel.getById(task.project_id);
  const projectName = project ? project.project_name : task.project_id;
  await _notifyProjectRooms(task,
    `[完了] ${task.task_name}（${projectName}）\n担当: ${task.assignee || '未設定'}`
  );
}

async function sendDueToday(task) {
  await _notifyProjectRooms(task,
    `[本日期限] ${task.task_name}\n担当: ${task.assignee || '未設定'}　期日: ${task.due_date}`
  );
}

async function sendDueSoon(task, daysLeft) {
  await _notifyProjectRooms(task,
    `[期限${daysLeft}日前] ${task.task_name}\n担当: ${task.assignee || '未設定'}　期日: ${task.due_date}`
  );
}

async function sendOverdue(task) {
  await _notifyProjectRooms(task,
    `[期限超過] ${task.task_name}\n担当: ${task.assignee || '未設定'}　期日: ${task.due_date}`
  );
}

module.exports = { getAccessToken, sendStartToday, sendTaskComplete, sendDueToday, sendDueSoon, sendOverdue };
