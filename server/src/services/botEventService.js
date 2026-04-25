'use strict';

const RoomModel = require('../models/roomModel');
const MemberModel = require('../models/memberModel');
const NotificationService = require('./notificationService');

async function handleEvent(event) {
  const type = event.type;
  const channelId = (event.source && event.source.channelId) || event.channelId;
  if (type === 'joined' && channelId) {
    await _onJoined(channelId);
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
