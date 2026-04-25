'use strict';

const ProjectModel = require('../models/projectModel');
const TaskModel = require('../models/taskModel');
const RoomModel = require('../models/roomModel');
const ProjectRoomModel = require('../models/projectRoomModel');
const TaskService = require('./taskService');

async function getProjects(roomId) {
  return ProjectModel.getByRoomId(roomId);
}

async function createProject(data) {
  const projectId = await ProjectModel.create({
    project_name: data.project_name,
    project_type: data.project_type,
    start_date: data.start_date,
  });

  for (const roomId of (data.roomIds || [])) {
    const room = await RoomModel.getById(roomId);
    if (!room) await RoomModel.create({ room_id: roomId, room_name: roomId });
    await ProjectRoomModel.create(projectId, roomId);
  }

  if (data.defaultTaskIds && data.defaultTaskIds.length > 0) {
    await TaskService.createDefaultTasks(projectId, data.start_date, data.defaultTaskIds);
  }

  return projectId;
}

async function updateProject(projectId, data) {
  await ProjectModel.update(projectId, data);
}

async function deleteProject(projectId) {
  await TaskModel.deleteByProjectId(projectId);
  await ProjectRoomModel.deleteByProjectId(projectId);
  await ProjectModel.deleteById(projectId);
}

async function linkRoom(projectId, roomId) {
  const room = await RoomModel.getById(roomId);
  if (!room) await RoomModel.create({ room_id: roomId, room_name: roomId });
  await ProjectRoomModel.create(projectId, roomId);
}

async function unlinkRoom(projectId, roomId) {
  await ProjectRoomModel.deleteByProjectIdAndRoomId(projectId, roomId);
}

module.exports = { getProjects, createProject, updateProject, deleteProject, linkRoom, unlinkRoom };
