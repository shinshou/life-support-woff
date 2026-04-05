/**
 * Router.gs
 * APIルーティング処理
 */

var Router = (function () {

  /**
   * GET ルーティング
   * @param {GoogleAppsScript.Events.DoGet} e
   * @returns {GoogleAppsScript.Content.TextOutput}
   */
  function routeGet(e) {
    var params = AuthService.extractGetParams(e);
    var action = params.action;

    try {
      switch (action) {
        case 'getProjects': {
          AuthService.verifyAccess(params.userId, params.roomId, null, params.displayName);
          var isCreator = UserModel.canCreate(params.userId);
          var isAdmin = MemberModel.isAdmin(params.userId);
          var projectList = isCreator
            ? ProjectModel.getAll()
            : ProjectService.getProjects(params.roomId);
          return ResponseUtil.success({ projects: projectList, canCreate: isCreator, isAdmin: isAdmin });
        }

        case 'getUsers':
          AuthService.verifyAccess(params.userId, params.roomId, null, params.displayName);
          if (!MemberModel.isAdmin(params.userId)) throw new Error('管理者権限がありません');
          return ResponseUtil.success(_getUsersWithCreatorStatus());

        case 'getTasks':
          AuthService.verifyAccess(params.userId, params.roomId, params.projectId);
          return ResponseUtil.success(TaskService.getTasks(params.projectId));

        case 'getDefaultTasks':
          return ResponseUtil.success(DefaultTaskModel.getAll());

        case 'getRooms':
          return ResponseUtil.success(RoomModel.getAll());

        case 'getProjectRooms':
          AuthService.verifyAccess(params.userId, params.roomId, params.projectId);
          return ResponseUtil.success(RoomModel.getByProjectId(params.projectId));

        case 'writeLog':
          return _writeLog(params.msg, params.ctx);

        default:
          return ResponseUtil.error('不明な action: ' + action);
      }
    } catch (err) {
      return ResponseUtil.error(err.message);
    }
  }

  /**
   * POST ルーティング
   * @param {GoogleAppsScript.Events.DoPost} e
   * @returns {GoogleAppsScript.Content.TextOutput}
   */
  function routePost(e) {
    var ctx;
    try {
      ctx = AuthService.extractContext(e);
    } catch (err) {
      return ResponseUtil.error(err.message);
    }

    var action = ctx.action;

    try {
      switch (action) {

        // ── プロジェクト ──────────────────────────────
        case 'createProject':
          AuthService.verifyAccess(ctx.userId, ctx.roomId);
          AuthService.requireCreatePermission(ctx.userId);
          return ResponseUtil.success({
            project_id: ProjectService.createProject(ctx)
          });

        case 'updateProject':
          AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
          AuthService.requireCreatePermission(ctx.userId);
          ProjectService.updateProject(ctx.projectId, ctx);
          return ResponseUtil.success(null);

        case 'deleteProject':
          AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
          AuthService.requireCreatePermission(ctx.userId);
          ProjectService.deleteProject(ctx.projectId);
          return ResponseUtil.success(null);

        // ── タスク ───────────────────────────────────
        case 'createTask':
          AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
          return ResponseUtil.success({
            task_id: TaskService.createTask(ctx)
          });

        case 'updateTask':
          AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
          TaskService.updateTask(ctx.taskId, ctx);
          return ResponseUtil.success(null);

        case 'deleteTask':
          AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
          TaskService.deleteTask(ctx.taskId);
          return ResponseUtil.success(null);

        case 'createDefaultTasks':
          AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
          TaskService.createDefaultTasks(ctx.projectId, ctx.start_date, ctx.defaultTaskIds);
          return ResponseUtil.success(null);

        case 'saveAsDefaultTask':
          return ResponseUtil.success({
            default_task_id: DefaultTaskModel.create({
              task_name: ctx.task_name,
              offset_days: ctx.offset_days
            })
          });

        // ── 管理者：作成者設定 ────────────────────────
        case 'setCreator': {
          AuthService.verifyAccess(ctx.userId, ctx.roomId);
          if (!MemberModel.isAdmin(ctx.userId)) throw new Error('管理者権限がありません');
          var target = UserModel.getByUserId(ctx.targetUserId);
          if (target) {
            UserModel.update(ctx.targetUserId, ctx.canCreate);
          } else {
            UserModel.create(ctx.targetUserId, ctx.canCreate);
          }
          return ResponseUtil.success(null);
        }

        // ── ルーム紐付け ──────────────────────────────
        case 'linkRoom':
          AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
          AuthService.requireCreatePermission(ctx.userId);
          ProjectService.linkRoom(ctx.projectId, ctx.targetRoomId);
          return ResponseUtil.success(null);

        case 'unlinkRoom':
          AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
          AuthService.requireCreatePermission(ctx.userId);
          ProjectService.unlinkRoom(ctx.projectId, ctx.targetRoomId);
          return ResponseUtil.success(null);

        default:
          return ResponseUtil.error('不明な action: ' + action);
      }
    } catch (err) {
      return ResponseUtil.error(err.message);
    }
  }

  function _writeLog(msg, ctx) {
    try {
      var ss = SpreadsheetApp.openById(
        PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
      );
      var sheet = ss.getSheetByName('ログ') || ss.insertSheet('ログ');
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['日時', 'メッセージ', 'コンテキスト']);
      }
      sheet.appendRow([new Date(), msg || '', ctx || '']);
    } catch (e) { /* ログ失敗は無視 */ }
    return ResponseUtil.success(null);
  }

  /**
   * GET経由の書き込み処理（CORS対応）
   * @param {Object} ctx - dataパラメータからパースしたオブジェクト
   */
  function routeByData(ctx) {
    var action = ctx.action;
    try {
      switch (action) {
        case 'createProject':
          AuthService.verifyAccess(ctx.userId, ctx.roomId);
          AuthService.requireCreatePermission(ctx.userId);
          return ResponseUtil.success({ project_id: ProjectService.createProject(ctx) });

        case 'updateProject':
          AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
          AuthService.requireCreatePermission(ctx.userId);
          ProjectService.updateProject(ctx.projectId, ctx);
          return ResponseUtil.success(null);

        case 'deleteProject':
          AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
          AuthService.requireCreatePermission(ctx.userId);
          ProjectService.deleteProject(ctx.projectId);
          return ResponseUtil.success(null);

        case 'createTask':
          AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
          ctx.project_id = ctx.project_id || ctx.projectId;
          return ResponseUtil.success({ task_id: TaskService.createTask(ctx) });

        case 'updateTask':
          AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
          ctx.project_id = ctx.project_id || ctx.projectId;
          TaskService.updateTask(ctx.taskId, ctx);
          return ResponseUtil.success(null);

        case 'deleteTask':
          AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
          TaskService.deleteTask(ctx.taskId);
          return ResponseUtil.success(null);

        case 'createDefaultTasks':
          AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
          TaskService.createDefaultTasks(ctx.projectId, ctx.start_date, ctx.defaultTaskIds);
          return ResponseUtil.success(null);

        case 'saveAsDefaultTask':
          return ResponseUtil.success({ default_task_id: DefaultTaskModel.create({ task_name: ctx.task_name, offset_days: ctx.offset_days }) });

        case 'linkRoom':
          AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
          AuthService.requireCreatePermission(ctx.userId);
          ProjectService.linkRoom(ctx.projectId, ctx.targetRoomId);
          return ResponseUtil.success(null);

        case 'unlinkRoom':
          AuthService.verifyAccess(ctx.userId, ctx.roomId, ctx.projectId);
          AuthService.requireCreatePermission(ctx.userId);
          ProjectService.unlinkRoom(ctx.projectId, ctx.targetRoomId);
          return ResponseUtil.success(null);

        case 'setCreator': {
          AuthService.verifyAccess(ctx.userId, ctx.roomId);
          if (!MemberModel.isAdmin(ctx.userId)) throw new Error('管理者権限がありません');
          var target = UserModel.getByUserId(ctx.targetUserId);
          if (target) {
            UserModel.update(ctx.targetUserId, ctx.canCreate);
          } else {
            UserModel.create(ctx.targetUserId, ctx.canCreate);
          }
          return ResponseUtil.success(null);
        }

        default:
          return ResponseUtil.error('不明な action: ' + action);
      }
    } catch (err) {
      return ResponseUtil.error(err.message);
    }
  }

  /**
   * ユーザー一覧に作成者フラグを付与
   */
  function _getUsersWithCreatorStatus() {
    var members = MemberModel.getAll();
    return members.map(function (m) {
      return {
        user_id: m.user_id,
        display_name: m.display_name,
        is_admin: m.is_admin === true || m.is_admin === 'TRUE',
        can_create: UserModel.canCreate(m.user_id)
      };
    });
  }

  return {
    routeGet: routeGet,
    routePost: routePost,
    routeByData: routeByData
  };
})();
