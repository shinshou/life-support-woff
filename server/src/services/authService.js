'use strict';

const MemberModel = require('../models/memberModel');
const UserModel = require('../models/userModel');
const RoomModel = require('../models/roomModel');
const ProjectRoomModel = require('../models/projectRoomModel');
const BotEventService = require('./botEventService');

async function verifyAccess(userId, roomId, projectId, displayName) {
  if (userId) {
    try { await MemberModel.upsert(userId, displayName || ''); } catch {}
  }

  if (!roomId) return;

  const room = await RoomModel.getById(roomId);
  if (!room) {
    try {
      await BotEventService.ensureRegistered(roomId, displayName);
    } catch (e) {
      console.error('ensureRegistered失敗 roomId=' + roomId, e);
    }
  }

  if (projectId) {
    if (await UserModel.canCreate(userId)) return;
    const linked = await ProjectRoomModel.exists(projectId, roomId);
    if (!linked) throw new Error('このルームからはアクセスできないプロジェクトです');
  }
}

async function requireCreatePermission(userId) {
  if (!userId) throw new Error('userId が指定されていません');
  if (!(await UserModel.canCreate(userId))) throw new Error('プロジェクト作成権限がありません');
}

module.exports = { verifyAccess, requireCreatePermission };
