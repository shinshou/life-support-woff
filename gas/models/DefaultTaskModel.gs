/**
 * DefaultTaskModel.gs
 * デフォルトタスク CRUD
 */

var DefaultTaskModel = (function () {
  var SHEET = 'デフォルトタスク';

  function getAll() {
    return SpreadsheetUtil.getAllRows(SpreadsheetUtil.getSheet(SHEET));
  }

  function getById(defaultTaskId) {
    var rows = SpreadsheetUtil.findRowsByField(SpreadsheetUtil.getSheet(SHEET), 'default_task_id', defaultTaskId);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * @param {{task_name:string, offset_days:number}} data
   * @returns {string} 新規 default_task_id
   */
  function create(data) {
    var id = SpreadsheetUtil.generateId('dtask');
    SpreadsheetUtil.appendRow(SpreadsheetUtil.getSheet(SHEET), {
      default_task_id: id,
      task_name: data.task_name,
      offset_days: data.offset_days
    });
    return id;
  }

  function update(defaultTaskId, data) {
    var row = getById(defaultTaskId);
    if (!row) throw new Error('デフォルトタスクが見つかりません: ' + defaultTaskId);
    SpreadsheetUtil.updateRow(SpreadsheetUtil.getSheet(SHEET), row._rowIndex, data);
  }

  function deleteById(defaultTaskId) {
    var row = getById(defaultTaskId);
    if (!row) throw new Error('デフォルトタスクが見つかりません: ' + defaultTaskId);
    SpreadsheetUtil.deleteRow(SpreadsheetUtil.getSheet(SHEET), row._rowIndex);
  }

  return {
    getAll: getAll,
    getById: getById,
    create: create,
    update: update,
    deleteById: deleteById
  };
})();
