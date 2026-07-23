'use strict';

const RoomModel = require('../models/roomModel');
const MemberModel = require('../models/memberModel');
const TaskModel = require('../models/taskModel');
const TaskService = require('./taskService');
const NotificationService = require('./notificationService');

async function handleEvent(event) {
  const type = event.type;
  const channelId = (event.source && event.source.channelId) || event.channelId;
  if (type === 'joined' && channelId) {
    await _onJoined(channelId);
  } else if (type === 'message') {
    await _onMessage(event);
  }
}

async function _onMessage(event) {
  const content = event.content || {};
  const postback = content.postback || content.text || '';
  const match = /^complete_task:(.+)$/.exec(postback);
  if (!match) return;
  await _completeTask(match[1], event.source || {});
}

async function _completeTask(taskId, source) {
  const roomId = source.channelId || (source.userId ? `user_${source.userId}` : null);
  try {
    const task = await TaskModel.getById(taskId);
    if (!task) {
      if (roomId) await NotificationService.postToRoom(roomId, '⚠️ タスクが見つかりません（削除済みの可能性があります）');
      return;
    }
    if (task.status === '完了') {
      if (roomId) await NotificationService.postToRoom(roomId, `「${task.task_name}」は既に完了しています`);
      return;
    }
    await TaskService.updateTask(taskId, { status: '完了' });
  } catch (e) {
    if (roomId) await NotificationService.postToRoom(roomId, '⚠️ タスクの更新に失敗しました');
    console.error('タスク完了postbackエラー taskId=' + taskId, e);
  }
}

async function _onJoined(channelId) {
  await ensureRegistered(channelId);
}

async function ensureRegistered(channelId, displayName) {
  if (!channelId) return;
  try {
    const existing = await RoomModel.getById(channelId);
    if (existing) {
      if (!existing.room_name || existing.room_name === channelId) {
        const updatedName = await _fetchChannelName(channelId) || displayName || '';
        if (updatedName && updatedName !== channelId) {
          await RoomModel.update(channelId, { room_name: updatedName });
        }
      }
    } else {
      const roomName = await _fetchChannelName(channelId) || displayName || channelId;
      await RoomModel.create({ room_id: channelId, room_name: roomName });
    }
    await _syncChannelMembers(channelId);
  } catch (e) {
    console.error('ルーム自動登録エラー channelId=' + channelId, e);
  }
}

async function _syncChannelMembers(channelId) {
  try {
    const botId = process.env.LINEWORKS_BOT_ID;
    const token = await NotificationService.getAccessToken();
    let cursor = null;
    do {
      let url = `https://www.worksapis.com/v1.0/bots/${botId}/channels/${channelId}/members?limit=100`;
      if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) break;
      const data = await res.json();
      await Promise.all((data.members || []).map(m => {
        if (m.userId) return MemberModel.upsert(m.userId, m.displayName || '');
      }));
      cursor = data.responseMetaData?.nextCursor || null;
    } while (cursor);
  } catch (e) {
    console.error('メンバー同期エラー channelId=' + channelId, e);
  }
}

async function _fetchChannelName(channelId) {
  try {
    const botId = process.env.LINEWORKS_BOT_ID;
    const token = await NotificationService.getAccessToken();
    const res = await fetch(
      `https://www.worksapis.com/v1.0/bots/${botId}/channels/${channelId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.title || data.channelName || data.name || null;
  } catch {
    return null;
  }
}

module.exports = { handleEvent, ensureRegistered };
