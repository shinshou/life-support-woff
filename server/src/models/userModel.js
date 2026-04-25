'use strict';

const MemberModel = require('./memberModel');

async function getAll() {
  return MemberModel.getAll();
}

async function getByUserId(userId) {
  return MemberModel.getById(userId);
}

async function canCreate(userId) {
  return MemberModel.canCreate(userId);
}

async function create(userId, canCreateFlag) {
  await MemberModel.upsert(userId, '');
  await MemberModel.setCanCreate(userId, !!canCreateFlag);
}

async function update(userId, canCreateFlag) {
  await MemberModel.setCanCreate(userId, !!canCreateFlag);
}

module.exports = { getAll, getByUserId, canCreate, create, update };
