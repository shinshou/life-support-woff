/**
 * Tests.gs
 * テストケース（GASエディタから runTests() を実行）
 *
 * テスト用データはプレフィックス "TEST_" で識別し、終了後に自動削除される
 */

// ─────────────────────────────────────────
// エントリポイント（GASエディタから実行）
// ─────────────────────────────────────────
function runTests() {
  var results = _TestRunner.run([
    // SpreadsheetUtil
    T_date_fieldsReturnedAsString,

    // TaskModel
    T_task_create_savesProjectId,
    T_task_create_savesAllFields,
    T_task_update_changesFields,
    T_task_getByProjectId_returnsLinkedTasks,
    T_task_deleteById_removes,
    T_task_deleteByProjectId_removesAll,
    T_task_getOverdueTasks_detectsOverdue,
    T_task_getTasksDueToday_detectsToday,
    T_task_getTasksDueSoon_detectsWithinDays,

    // ProjectModel
    T_project_create_savesFields,
    T_project_update_changesFields,
    T_project_getByRoomId_returnsLinked,
    T_project_deleteById_removes,

    // ProjectRoomModel
    T_projectRoom_create_linksProjectAndRoom,
    T_projectRoom_exists_returnsTrueWhenLinked,
    T_projectRoom_deleteByProjectIdAndRoomId_unlinks,
    T_projectRoom_deleteByProjectId_removesAll,

    // DefaultTaskModel
    T_defaultTask_create_savesFields,
    T_defaultTask_update_changesFields,
    T_defaultTask_deleteById_removes,

    // RoomModel
    T_room_create_savesFields,
    T_room_getById_returnsRoom,

    // UserModel
    T_user_canCreate_falseForUnknown,

    // AuthService
    T_auth_verifyAccess_allowsEmptyRoomId,
    T_auth_verifyAccess_autoRegistersNewRoom,
    T_auth_verifyAccess_creatorBypassesProjectCheck,

    // ProjectService
    T_projectService_createProject_linksRooms,
    T_projectService_deleteProject_cascades,

    // TaskService
    T_taskService_createDefaultTasks_expandsTasks,

    // DateUtil
    T_dateUtil_addDays_correct,
  ]);

  // ログシートに結果を書き出し
  var sheet = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  ).getSheetByName('ログ') || SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  ).insertSheet('ログ');

  sheet.appendRow([new Date(), 'テスト結果', results.passed + '/' + results.total + ' 成功']);
  results.failures.forEach(function (f) {
    sheet.appendRow([new Date(), 'FAIL: ' + f.name, f.message]);
  });

  Logger.log('=== テスト結果: ' + results.passed + '/' + results.total + ' 成功 ===');
  results.failures.forEach(function (f) {
    Logger.log('[FAIL] ' + f.name + ' : ' + f.message);
  });
}

// ─────────────────────────────────────────
// テストランナー
// ─────────────────────────────────────────
var _TestRunner = (function () {
  function run(testFns) {
    var passed = 0, total = 0, failures = [];
    testFns.forEach(function (fn) {
      total++;
      try {
        fn(); // アサーション失敗は例外を投げる
        passed++;
      } catch (e) {
        failures.push({ name: fn.name, message: e.message });
      }
    });
    return { passed: passed, total: total, failures: failures };
  }
  return { run: run };
})();

function _assert(condition, message) {
  if (!condition) throw new Error(message || 'アサーション失敗');
}
function _assertEqual(expected, actual, label) {
  if (expected !== actual) {
    throw new Error((label || '') + ' 期待値:' + expected + ' 実際値:' + actual);
  }
}
function _assertNotNull(val, label) {
  if (val === null || val === undefined) throw new Error((label || '') + ' はnullであってはならない');
}

// テスト用ヘルパー
var _TP = 'TEST_'; // テスト用プレフィックス

// ─────────────────────────────────────────
// SpreadsheetUtil
// ─────────────────────────────────────────
function T_date_fieldsReturnedAsString() {
  var rows = SpreadsheetUtil.getAllRows(SpreadsheetUtil.getSheet('タスク'));
  rows.forEach(function (row) {
    if (row.due_date && row.due_date !== '') {
      _assert(typeof row.due_date === 'string',
        'due_dateはstring型であるべき。実際: ' + typeof row.due_date);
    }
    if (row.start_date && row.start_date !== '') {
      _assert(typeof row.start_date === 'string',
        'start_dateはstring型であるべき。実際: ' + typeof row.start_date);
    }
  });
}

// ─────────────────────────────────────────
// TaskModel
// ─────────────────────────────────────────
function T_task_create_savesProjectId() {
  var projectId = _TP + 'proj_' + Date.now();
  var taskId = TaskModel.create({ project_id: projectId, task_name: _TP + 'task', status: '未着手' });
  try {
    var task = TaskModel.getById(taskId);
    _assertNotNull(task, 'task');
    _assertEqual(projectId, task.project_id, 'project_id');
  } finally {
    try { TaskModel.deleteById(taskId); } catch (e) {}
  }
}

function T_task_create_savesAllFields() {
  var projectId = _TP + 'proj_' + Date.now();
  var taskId = TaskModel.create({
    project_id: projectId,
    task_name: _TP + 'full',
    assignee: _TP + '担当',
    start_date: '2024-01-01',
    due_date: '2024-01-10',
    status: '進行中',
    comment: _TP + 'コメント'
  });
  try {
    var task = TaskModel.getById(taskId);
    _assertEqual(_TP + 'full',    task.task_name, 'task_name');
    _assertEqual(_TP + '担当',    task.assignee,  'assignee');
    _assertEqual('2024-01-01',   task.start_date, 'start_date');
    _assertEqual('2024-01-10',   task.due_date,   'due_date');
    _assertEqual('進行中',        task.status,     'status');
    _assertEqual(_TP + 'コメント', task.comment,   'comment');
  } finally {
    try { TaskModel.deleteById(taskId); } catch (e) {}
  }
}

function T_task_update_changesFields() {
  var taskId = TaskModel.create({ project_id: _TP + 'proj', task_name: _TP + '更新前', status: '未着手' });
  try {
    TaskModel.update(taskId, { task_name: _TP + '更新後', status: '完了' });
    var task = TaskModel.getById(taskId);
    _assertEqual(_TP + '更新後', task.task_name, 'task_name after update');
    _assertEqual('完了',          task.status,    'status after update');
  } finally {
    try { TaskModel.deleteById(taskId); } catch (e) {}
  }
}

function T_task_getByProjectId_returnsLinkedTasks() {
  var projectId = _TP + 'proj_' + Date.now();
  var id1 = TaskModel.create({ project_id: projectId, task_name: 'T1', status: '未着手' });
  var id2 = TaskModel.create({ project_id: projectId, task_name: 'T2', status: '未着手' });
  try {
    var tasks = TaskModel.getByProjectId(projectId);
    _assertEqual(2, tasks.length, 'getByProjectId 件数');
  } finally {
    try { TaskModel.deleteById(id1); } catch (e) {}
    try { TaskModel.deleteById(id2); } catch (e) {}
  }
}

function T_task_deleteById_removes() {
  var taskId = TaskModel.create({ project_id: _TP + 'proj', task_name: _TP + 'del', status: '未着手' });
  TaskModel.deleteById(taskId);
  var task = TaskModel.getById(taskId);
  _assert(!task, '削除後はnullになるべき');
}

function T_task_deleteByProjectId_removesAll() {
  var projectId = _TP + 'proj_' + Date.now();
  TaskModel.create({ project_id: projectId, task_name: 'T1', status: '未着手' });
  TaskModel.create({ project_id: projectId, task_name: 'T2', status: '未着手' });
  TaskModel.deleteByProjectId(projectId);
  _assertEqual(0, TaskModel.getByProjectId(projectId).length, '削除後0件');
}

function T_task_getOverdueTasks_detectsOverdue() {
  var projectId = _TP + 'proj_' + Date.now();
  var taskId = TaskModel.create({ project_id: projectId, task_name: _TP + 'overdue', due_date: '2000-01-01', status: '未着手' });
  try {
    var overdue = TaskModel.getOverdueTasks('2024-01-01');
    var found = overdue.some(function (t) { return t.task_id === taskId; });
    _assert(found, '期限超過タスクが検出されるべき');
  } finally {
    try { TaskModel.deleteById(taskId); } catch (e) {}
  }
}

function T_task_getTasksDueToday_detectsToday() {
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var taskId = TaskModel.create({ project_id: _TP + 'proj', task_name: _TP + 'today', due_date: today, status: '未着手' });
  try {
    var tasks = TaskModel.getTasksDueToday(today);
    var found = tasks.some(function (t) { return t.task_id === taskId; });
    _assert(found, '本日期限タスクが検出されるべき');
  } finally {
    try { TaskModel.deleteById(taskId); } catch (e) {}
  }
}

function T_task_getTasksDueSoon_detectsWithinDays() {
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var soon = DateUtil.addDays(today, 2);
  var taskId = TaskModel.create({ project_id: _TP + 'proj', task_name: _TP + 'soon', due_date: soon, status: '未着手' });
  try {
    var tasks = TaskModel.getTasksDueSoon(today, 3);
    var found = tasks.some(function (t) { return t.task_id === taskId; });
    _assert(found, '近日期限タスクが検出されるべき');
  } finally {
    try { TaskModel.deleteById(taskId); } catch (e) {}
  }
}

// ─────────────────────────────────────────
// ProjectModel
// ─────────────────────────────────────────
function T_project_create_savesFields() {
  var projectId = ProjectModel.create({ project_name: _TP + 'proj', project_type: 'その他', start_date: '2024-01-01' });
  try {
    var p = ProjectModel.getById(projectId);
    _assertNotNull(p, 'project');
    _assertEqual(_TP + 'proj', p.project_name, 'project_name');
    _assertEqual('その他',      p.project_type, 'project_type');
    _assertEqual('2024-01-01', p.start_date,   'start_date');
  } finally {
    try { ProjectModel.deleteById(projectId); } catch (e) {}
  }
}

function T_project_update_changesFields() {
  var projectId = ProjectModel.create({ project_name: _TP + '更新前', project_type: 'その他', start_date: '2024-01-01' });
  try {
    ProjectModel.update(projectId, { project_name: _TP + '更新後' });
    var p = ProjectModel.getById(projectId);
    _assertEqual(_TP + '更新後', p.project_name, 'project_name after update');
  } finally {
    try { ProjectModel.deleteById(projectId); } catch (e) {}
  }
}

function T_project_getByRoomId_returnsLinked() {
  var projectId = ProjectModel.create({ project_name: _TP + 'p', project_type: 'その他', start_date: '2024-01-01' });
  var roomId = _TP + 'room_' + Date.now();
  ProjectRoomModel.create(projectId, roomId);
  try {
    var projects = ProjectModel.getByRoomId(roomId);
    var found = projects.some(function (p) { return p.project_id === projectId; });
    _assert(found, 'getByRoomId でプロジェクトが取得できるべき');
  } finally {
    try { ProjectRoomModel.deleteByProjectId(projectId); } catch (e) {}
    try { ProjectModel.deleteById(projectId); } catch (e) {}
  }
}

function T_project_deleteById_removes() {
  var projectId = ProjectModel.create({ project_name: _TP + 'del', project_type: 'その他', start_date: '2024-01-01' });
  ProjectModel.deleteById(projectId);
  _assert(!ProjectModel.getById(projectId), '削除後はnullになるべき');
}

// ─────────────────────────────────────────
// ProjectRoomModel
// ─────────────────────────────────────────
function T_projectRoom_create_linksProjectAndRoom() {
  var pid = _TP + 'proj_' + Date.now();
  var rid = _TP + 'room_' + Date.now();
  ProjectRoomModel.create(pid, rid);
  try {
    _assert(ProjectRoomModel.exists(pid, rid), '紐づけが存在するべき');
  } finally {
    try { ProjectRoomModel.deleteByProjectIdAndRoomId(pid, rid); } catch (e) {}
  }
}

function T_projectRoom_exists_returnsTrueWhenLinked() {
  var pid = _TP + 'proj_' + Date.now();
  var rid = _TP + 'room_' + Date.now();
  _assert(!ProjectRoomModel.exists(pid, rid), '未登録はfalseのべき');
  ProjectRoomModel.create(pid, rid);
  _assert(ProjectRoomModel.exists(pid, rid), '登録後はtrueであるべき');
  ProjectRoomModel.deleteByProjectIdAndRoomId(pid, rid);
}

function T_projectRoom_deleteByProjectIdAndRoomId_unlinks() {
  var pid = _TP + 'proj_' + Date.now();
  var rid = _TP + 'room_' + Date.now();
  ProjectRoomModel.create(pid, rid);
  ProjectRoomModel.deleteByProjectIdAndRoomId(pid, rid);
  _assert(!ProjectRoomModel.exists(pid, rid), '解除後はfalseであるべき');
}

function T_projectRoom_deleteByProjectId_removesAll() {
  var pid = _TP + 'proj_' + Date.now();
  var rid1 = _TP + 'room1_' + Date.now();
  var rid2 = _TP + 'room2_' + Date.now();
  ProjectRoomModel.create(pid, rid1);
  ProjectRoomModel.create(pid, rid2);
  ProjectRoomModel.deleteByProjectId(pid);
  _assertEqual(0, ProjectRoomModel.getRoomIdsByProjectId(pid).length, '削除後0件');
}

// ─────────────────────────────────────────
// DefaultTaskModel
// ─────────────────────────────────────────
function T_defaultTask_create_savesFields() {
  var id = DefaultTaskModel.create({ task_name: _TP + 'デフォルト', offset_days: 5 });
  try {
    var dt = DefaultTaskModel.getById(id);
    _assertNotNull(dt, 'defaultTask');
    _assertEqual(_TP + 'デフォルト', dt.task_name, 'task_name');
    _assertEqual(5, Number(dt.offset_days), 'offset_days');
  } finally {
    try { DefaultTaskModel.deleteById(id); } catch (e) {}
  }
}

function T_defaultTask_update_changesFields() {
  var id = DefaultTaskModel.create({ task_name: _TP + '更新前', offset_days: 3 });
  try {
    DefaultTaskModel.update(id, { task_name: _TP + '更新後', offset_days: 7 });
    var dt = DefaultTaskModel.getById(id);
    _assertEqual(_TP + '更新後', dt.task_name, 'task_name after update');
    _assertEqual(7, Number(dt.offset_days), 'offset_days after update');
  } finally {
    try { DefaultTaskModel.deleteById(id); } catch (e) {}
  }
}

function T_defaultTask_deleteById_removes() {
  var id = DefaultTaskModel.create({ task_name: _TP + 'del', offset_days: 0 });
  DefaultTaskModel.deleteById(id);
  _assert(!DefaultTaskModel.getById(id), '削除後はnullになるべき');
}

// ─────────────────────────────────────────
// RoomModel
// ─────────────────────────────────────────
function T_room_create_savesFields() {
  var roomId = _TP + 'room_' + Date.now();
  RoomModel.create({ room_id: roomId, room_name: _TP + 'ルーム' });
  try {
    var room = RoomModel.getById(roomId);
    _assertNotNull(room, 'room');
    _assertEqual(_TP + 'ルーム', room.room_name, 'room_name');
  } finally {
    try { RoomModel.deleteById(roomId); } catch (e) {}
  }
}

function T_room_getById_returnsRoom() {
  var roomId = _TP + 'room_' + Date.now();
  RoomModel.create({ room_id: roomId, room_name: _TP + 'R' });
  try {
    var room = RoomModel.getById(roomId);
    _assertEqual(roomId, room.room_id, 'room_id');
  } finally {
    try { RoomModel.deleteById(roomId); } catch (e) {}
  }
}

// ─────────────────────────────────────────
// UserModel
// ─────────────────────────────────────────
function T_user_canCreate_falseForUnknown() {
  _assertEqual(false, UserModel.canCreate(_TP + 'unknown_user'), '未登録ユーザーはfalse');
}

// ─────────────────────────────────────────
// AuthService
// ─────────────────────────────────────────
function T_auth_verifyAccess_allowsEmptyRoomId() {
  // roomId が空でも例外が出ないこと
  AuthService.verifyAccess('some_user', '', null, '');
  // ここまで到達 = OK
}

function T_auth_verifyAccess_autoRegistersNewRoom() {
  var roomId = _TP + 'newroom_' + Date.now();
  _assert(!RoomModel.getById(roomId), '事前: ルームは未登録のはず');
  AuthService.verifyAccess('some_user', roomId, null, _TP + 'テスト');
  var room = RoomModel.getById(roomId);
  try {
    _assertNotNull(room, '初回アクセスでルームが自動登録される');
  } finally {
    try { RoomModel.deleteById(roomId); } catch (e) {}
  }
}

function T_auth_verifyAccess_creatorBypassesProjectCheck() {
  // 実際の作成者IDを使う（スプシの作成者管理シートに登録があること）
  var creators = UserModel.getAll().filter(function (u) {
    return u['作成可否'] === true || u['作成可否'] === 'TRUE';
  });
  if (creators.length === 0) {
    Logger.log('T_auth_creatorBypass: 作成者が未登録のためスキップ');
    return;
  }
  var creatorId = creators[0].user_id;
  var roomId = _TP + 'room_' + Date.now();
  var projectId = _TP + 'proj_' + Date.now();

  // roomとprojectを登録し、紐づけはしない
  RoomModel.create({ room_id: roomId, room_name: _TP + 'R' });

  try {
    // 作成者なので、紐づけなしでもエラーが出ないこと
    AuthService.verifyAccess(creatorId, roomId, projectId, '');
  } finally {
    try { RoomModel.deleteById(roomId); } catch (e) {}
  }
}

// ─────────────────────────────────────────
// ProjectService
// ─────────────────────────────────────────
function T_projectService_createProject_linksRooms() {
  var roomId = _TP + 'room_' + Date.now();
  RoomModel.create({ room_id: roomId, room_name: _TP + 'R' });

  var projectId = ProjectService.createProject({
    project_name: _TP + 'サービスプロジェクト',
    project_type: 'その他',
    start_date: '2024-01-01',
    roomIds: [roomId],
    defaultTaskIds: []
  });

  try {
    var p = ProjectModel.getById(projectId);
    _assertNotNull(p, 'プロジェクトが作成される');
    _assert(ProjectRoomModel.exists(projectId, roomId), 'ルームが紐づく');
  } finally {
    try { ProjectService.deleteProject(projectId); } catch (e) {}
    try { RoomModel.deleteById(roomId); } catch (e) {}
  }
}

function T_projectService_deleteProject_cascades() {
  var projectId = ProjectModel.create({ project_name: _TP + 'カスケード', project_type: 'その他', start_date: '2024-01-01' });
  var taskId = TaskModel.create({ project_id: projectId, task_name: _TP + 't', status: '未着手' });
  var roomId = _TP + 'room_' + Date.now();
  ProjectRoomModel.create(projectId, roomId);

  ProjectService.deleteProject(projectId);

  _assert(!ProjectModel.getById(projectId),              'プロジェクトが削除される');
  _assert(!TaskModel.getById(taskId),                     'タスクが削除される');
  _assert(!ProjectRoomModel.exists(projectId, roomId),   '紐づけが削除される');
}

// ─────────────────────────────────────────
// TaskService
// ─────────────────────────────────────────
function T_taskService_createDefaultTasks_expandsTasks() {
  var defaultId = DefaultTaskModel.create({ task_name: _TP + 'デフォルト', offset_days: 3 });
  var projectId = ProjectModel.create({ project_name: _TP + 'p', project_type: 'その他', start_date: '2024-01-01' });

  try {
    TaskService.createDefaultTasks(projectId, '2024-01-01', [defaultId]);
    var tasks = TaskModel.getByProjectId(projectId);
    _assertEqual(1, tasks.length, 'タスクが1件作成される');
    _assertEqual(_TP + 'デフォルト', tasks[0].task_name, 'task_name');
    _assertEqual('2024-01-04', tasks[0].due_date, 'due_date（開始日+3日）');
  } finally {
    try { TaskModel.deleteByProjectId(projectId); } catch (e) {}
    try { ProjectModel.deleteById(projectId); } catch (e) {}
    try { DefaultTaskModel.deleteById(defaultId); } catch (e) {}
  }
}

// ─────────────────────────────────────────
// DateUtil
// ─────────────────────────────────────────
function T_dateUtil_addDays_correct() {
  _assertEqual('2024-01-04', DateUtil.addDays('2024-01-01', 3), 'addDays(+3)');
  _assertEqual('2024-01-01', DateUtil.addDays('2024-01-01', 0), 'addDays(+0)');
  _assertEqual('2024-02-01', DateUtil.addDays('2024-01-25', 7), 'addDays(月跨ぎ)');
}
