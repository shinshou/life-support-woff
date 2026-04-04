/**
 * TaskModel.gs
 * タスク CRUD
 */

var TaskModel = (function () {
  var SHEET = 'タスク';

  function getByProjectId(projectId) {
    return SpreadsheetUtil.findRowsByField(SpreadsheetUtil.getSheet(SHEET), 'project_id', projectId);
  }

  function getById(taskId) {
    var rows = SpreadsheetUtil.findRowsByField(SpreadsheetUtil.getSheet(SHEET), 'task_id', taskId);
    return rows.length > 0 ? rows[0] : null;
  }

  function getAll() {
    return SpreadsheetUtil.getAllRows(SpreadsheetUtil.getSheet(SHEET));
  }

  /**
   * @param {{project_id:string, default_task_id:string, task_name:string,
   *          assignee:string, due_date:string, status:string, comment:string}} data
   * @returns {string} 新規 task_id
   */
  function create(data) {
    var id = SpreadsheetUtil.generateId('task');
    var projectId = data.project_id || data.projectId || '';
    SpreadsheetUtil.appendRow(SpreadsheetUtil.getSheet(SHEET), {
      task_id: id,
      project_id: projectId,
      default_task_id: data.default_task_id || '',
      task_name: data.task_name,
      assignee: data.assignee || '',
      start_date: data.start_date || '',
      due_date: data.due_date || '',
      status: data.status || '未着手',
      comment: data.comment || ''
    });
    return id;
  }

  function update(taskId, data) {
    var row = getById(taskId);
    if (!row) throw new Error('タスクが見つかりません: ' + taskId);
    SpreadsheetUtil.updateRow(SpreadsheetUtil.getSheet(SHEET), row._rowIndex, data);
  }

  function deleteById(taskId) {
    var row = getById(taskId);
    if (!row) throw new Error('タスクが見つかりません: ' + taskId);
    SpreadsheetUtil.deleteRow(SpreadsheetUtil.getSheet(SHEET), row._rowIndex);
  }

  function deleteByProjectId(projectId) {
    var sheet = SpreadsheetUtil.getSheet(SHEET);
    var rows = getByProjectId(projectId);
    // 行番号の降順で削除（削除後に行番号がずれるため）
    rows.sort(function (a, b) { return b._rowIndex - a._rowIndex; });
    rows.forEach(function (row) {
      SpreadsheetUtil.deleteRow(sheet, row._rowIndex);
    });
  }

  /**
   * 期限超過タスク取得（status != "完了"）
   * @param {string} today YYYY-MM-DD
   * @returns {Object[]}
   */
  function getOverdueTasks(today) {
    return getAll().filter(function (t) {
      return t.due_date && t.status !== '完了' && String(t.due_date) < today;
    });
  }

  /**
   * 本日期限タスク取得
   * @param {string} today YYYY-MM-DD
   * @returns {Object[]}
   */
  function getTasksDueToday(today) {
    return getAll().filter(function (t) {
      return t.due_date && t.status !== '完了' && String(t.due_date) === today;
    });
  }

  /**
   * 本日開始タスク取得
   * @param {string} today YYYY-MM-DD
   * @returns {Object[]}
   */
  function getTasksStartingToday(today) {
    return getAll().filter(function (t) {
      return t.start_date && t.status !== '完了' && String(t.start_date) === today;
    });
  }

  /**
   * N日以内に期限が来るタスク取得（当日は除く）
   * @param {string} today YYYY-MM-DD
   * @param {number} days
   * @returns {Object[]}
   */
  function getTasksDueSoon(today, days) {
    var limit = DateUtil.addDays(today, days);
    return getAll().filter(function (t) {
      return t.due_date && t.status !== '完了' &&
        String(t.due_date) > today && String(t.due_date) <= limit;
    });
  }

  return {
    getByProjectId: getByProjectId,
    getById: getById,
    getAll: getAll,
    create: create,
    update: update,
    deleteById: deleteById,
    deleteByProjectId: deleteByProjectId,
    getOverdueTasks: getOverdueTasks,
    getTasksDueToday: getTasksDueToday,
    getTasksDueSoon: getTasksDueSoon,
    getTasksStartingToday: getTasksStartingToday
  };
})();
