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
      start_date: data.start_date
    });
    return id;
  }

  function update(projectId, data) {
    var row = getById(projectId);
    if (!row) throw new Error('プロジェクトが見つかりません: ' + projectId);
    SpreadsheetUtil.updateRow(SpreadsheetUtil.getSheet(SHEET), row._rowIndex, data);
  }

  function deleteById(projectId) {
    var row = getById(projectId);
    if (!row) throw new Error('プロジェクトが見つかりません: ' + projectId);
    SpreadsheetUtil.deleteRow(SpreadsheetUtil.getSheet(SHEET), row._rowIndex);
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
