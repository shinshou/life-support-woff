/**
 * ProjectModel.gs
 * プロジェクト CRUD
 */

var ProjectModel = (function () {
  var SHEET = 'プロジェクト';

  function getAll() {
    return SpreadsheetUtil.getAllRows(SpreadsheetUtil.getSheet(SHEET));
  }

  function getById(projectId) {
    var rows = SpreadsheetUtil.findRowsByField(SpreadsheetUtil.getSheet(SHEET), 'project_id', projectId);
    return rows.length > 0 ? rows[0] : null;
  }

  function getByRoomId(roomId) {
    var projectIds = ProjectRoomModel.getProjectIdsByRoomId(roomId);
    if (projectIds.length === 0) return [];
    return getAll().filter(function (p) {
      return projectIds.indexOf(p.project_id) !== -1;
    });
  }

  /**
   * @param {{project_name:string, project_type:string, start_date:string}} data
   * @returns {string} 新規 project_id
   */
  function create(data) {
    var id = SpreadsheetUtil.generateId('proj');
    SpreadsheetUtil.appendRow(SpreadsheetUtil.getSheet(SHEET), {
      project_id: id,
      project_name: data.project_name,
      project_type: data.project_type,
      start_date: data.start_date,
      updated_at: new Date().toISOString()
    });
    return id;
  }

  function update(projectId, data) {
    // data.updated_at が含まれていれば楽観的ロックチェックを行う
    SpreadsheetUtil.updateRowById(SpreadsheetUtil.getSheet(SHEET), 'project_id', projectId, data, data.updated_at);
  }

  function deleteById(projectId) {
    SpreadsheetUtil.deleteRowById(SpreadsheetUtil.getSheet(SHEET), 'project_id', projectId);
  }

  return {
    getAll: getAll,
    getById: getById,
    getByRoomId: getByRoomId,
    create: create,
    update: update,
    deleteById: deleteById
  };
})();
