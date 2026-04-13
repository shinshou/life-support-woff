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
    SpreadsheetUtil.updateRowById(SpreadsheetUtil.getSheet(SHEET), 'default_task_id', defaultTaskId, data);
  }

  function deleteById(defaultTaskId) {
    SpreadsheetUtil.deleteRowById(SpreadsheetUtil.getSheet(SHEET), 'default_task_id', defaultTaskId);
  }

  return {
    getAll: getAll,
    getById: getById,
    create: create,
    update: update,
    deleteById: deleteById
  };
})();
