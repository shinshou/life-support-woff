'use strict';

const AuthService = require('./services/authService');
const ProjectService = require('./services/projectService');
const TaskService = require('./services/taskService');
const BotEventService = require('./services/botEventService');
const DailyTrigger = require('./triggers/dailyTrigger');
const ProjectModel = require('./models/projectModel');
const TaskModel = require('./models/taskModel');
const RoomModel = require('./models/roomModel');
const MemberModel = require('./models/memberModel');
const UserModel = require('./models/userModel');
const DefaultTaskModel = require('./models/defaultTaskModel');
const ResponseUtil = require('./utils/responseUtil');
const ss = require('./utils/spreadsheetUtil');

const wrap = fn => (req, res, next) => fn(req, res).catch(next);

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------
const handleGet = wrap(async (req, res) => {
  const params = req.query;

  // 書き込み系: ?data=JSON（GAS フロントエンドとの後方互換）
  if (params.data) {
    let ctx;
    try { ctx = JSON.parse(params.data); } catch {
      return res.json(ResponseUtil.error('dataパラメータのパースに失敗しました'));
    }
    return _handleWrite(ctx, res);
  }

  const action = params.action;
  try {
    switch (action) {
      case 'getInitialData': {
        await AuthService.verifyAccess(params.userId, params.roomId, null, params.displayName);
        const [isCreator, isAdmin] = await Promise.all([
          UserModel.canCreate(params.userId),
          MemberModel.isAdmin(params.userId),
        ]);
        const projects = isCreator
          ? await ProjectModel.getAll()
          : await ProjectService.getProjects(params.roomId);
        const defaultTasks = await DefaultTaskModel.getAll();
        return res.json(ResponseUtil.success({ projects, defaultTasks, canCreate: isCreator, isAdmin }));
      }

      case 'getProjects': {
        await AuthService.verifyAccess(params.userId, params.roomId, null, params.displayName);
        const [isCreator, isAdmin] = await Promise.all([
          UserModel.canCreate(params.userId),
          MemberModel.isAdmin(params.userId),
        ]);
        const projects = isCreator
          ? await ProjectModel.getAll()
          : await ProjectService.getProjects(params.roomId);
        return res.json(ResponseUtil.success({ projects, canCreate: isCreator, isAdmin }));
      }

      case 'getUsers':
        await AuthService.verifyAccess(params.userId, params.roomId, null, params.displayName);
        if (!(await MemberModel.isAdmin(params.userId))) throw new Error('管理者権限がありません');
        return res.json(ResponseUtil.success(await _getUsersWithCreatorStatus()));

      case 'getTasks':
        await AuthService.verifyAccess(params.userId, params.roomId, params.projectId);
        return res.json(ResponseUtil.success(await TaskService.getTasks(params.projectId)));

      case 'getDefaultTasks':
        return res.json(ResponseUtil.success(await DefaultTaskModel.getAll()));

      case 'getRooms':
        return res.json(ResponseUtil.success(await RoomModel.getAll()));

      case 'getProjectRooms':
        await AuthService.verifyAccess(params.userId, params.roomId, params.projectId);
        return res.json(ResponseUtil.success(await RoomModel.getByProjectId(params.projectId)));

      case 'writeLog':
        await _writeLog(params.msg, params.ctx);
        return res.json(ResponseUtil.success(null));

      default:
        return res.json(ResponseUtil.error('不明な action: ' + action));
    }
  } catch (err) {
    return res.json(ResponseUtil.error(err.message));
  }
});

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------
const handlePost = wrap(async (req, res) => {
  const body = req.body;

  // LINE WORKS Bot Callback
  if (body && body.type) {
    await BotEventService.handleEvent(body);
    return res.json(ResponseUtil.success(null));
  }

  return _handleWrite(body, res);
});

// ---------------------------------------------------------------------------
// 書き込み共通処理
// ---------------------------------------------------------------------------
async function _handleWrite(ctx, res) {
  const action = ctx.action;
  try {
    switch (action) {
      case 'createProject':
        await AuthService.verifyAccess(ctx.userId, ctx.roomId);
        await AuthService.requireCreatePermission(ctx.userId);
        return res.json(ResponseUtil.success({ project_id: await ProjectService.createProject(ctx) }));

      case 'updateProject':
        await AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
        await AuthService.requireCreatePermission(ctx.userId);
        await ProjectService.updateProject(ctx.projectId, ctx);
        return res.json(ResponseUtil.success(null));

      case 'deleteProject':
        await AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
        await AuthService.requireCreatePermission(ctx.userId);
        await ProjectService.deleteProject(ctx.projectId);
        return res.json(ResponseUtil.success(null));

      case 'createTask':
        await AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
        ctx.project_id = ctx.project_id || ctx.projectId;
        return res.json(ResponseUtil.success({ task_id: await TaskService.createTask(ctx) }));

      case 'updateTask':
        await AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
        ctx.project_id = ctx.project_id || ctx.projectId;
        await TaskService.updateTask(ctx.taskId, ctx);
        return res.json(ResponseUtil.success(null));

      case 'deleteTask':
        await AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
        await TaskService.deleteTask(ctx.taskId);
        return res.json(ResponseUtil.success(null));

      case 'deleteTasks':
        await AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
        if (!Array.isArray(ctx.taskIds) || ctx.taskIds.length === 0) {
          return res.json(ResponseUtil.error('taskIdsが空です'));
        }
        await TaskService.deleteTasks(ctx.taskIds);
        return res.json(ResponseUtil.success(null));

      case 'createDefaultTasks':
        await AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
        await TaskService.createDefaultTasks(ctx.projectId, ctx.start_date, ctx.defaultTaskIds);
        return res.json(ResponseUtil.success(null));

      case 'saveAsDefaultTask':
        return res.json(ResponseUtil.success({
          default_task_id: await DefaultTaskModel.create({
            task_name: ctx.task_name,
            offset_days: ctx.offset_days,
          }),
        }));

      case 'setCreator': {
        await AuthService.verifyAccess(ctx.userId, ctx.roomId);
        if (!(await MemberModel.isAdmin(ctx.userId))) throw new Error('管理者権限がありません');
        const target = await UserModel.getByUserId(ctx.targetUserId);
        if (target) {
          await UserModel.update(ctx.targetUserId, ctx.canCreate);
        } else {
          await UserModel.create(ctx.targetUserId, ctx.canCreate);
        }
        return res.json(ResponseUtil.success(null));
      }

      case 'linkRoom':
        await AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
        await AuthService.requireCreatePermission(ctx.userId);
        await ProjectService.linkRoom(ctx.projectId, ctx.targetRoomId);
        return res.json(ResponseUtil.success(null));

      case 'unlinkRoom':
        await AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
        await AuthService.requireCreatePermission(ctx.userId);
        await ProjectService.unlinkRoom(ctx.projectId, ctx.targetRoomId);
        return res.json(ResponseUtil.success(null));

      default:
        return res.json(ResponseUtil.error('不明な action: ' + action));
    }
  } catch (err) {
    return res.json(ResponseUtil.error(err.message));
  }
}

// ---------------------------------------------------------------------------
// Daily Trigger（Cloud Scheduler から POST /trigger/daily）
// ---------------------------------------------------------------------------
const handleDailyTrigger = wrap(async (req, res) => {
  await DailyTrigger.run();
  return res.json(ResponseUtil.success(null));
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function _getUsersWithCreatorStatus() {
  const members = await MemberModel.getAll();
  return members.map(m => ({
    user_id: m.user_id,
    display_name: m.display_name,
    is_admin: m.is_admin === true || m.is_admin === 'TRUE',
    can_create: m.can_create === true || m.can_create === 'TRUE',
  }));
}

async function _writeLog(msg, ctx) {
  try {
    await ss.appendRow('ログ', {
      日時: new Date().toISOString(),
      メッセージ: msg || '',
      コンテキスト: ctx || '',
    });
  } catch (e) {
    console.error('ログ書き込み失敗', e);
  }
}

module.exports = { handleGet, handlePost, handleDailyTrigger };
