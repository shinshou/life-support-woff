/**
 * ProjectRoomModel.gs
 * プロジェクト_ルーム紐付け CRUD
 */

var ProjectRoomModel = (function () {
  var SHEET = 'プロジェクト_ルーム紐付け';

  function getAll() {
    return SpreadsheetUtil.getAllRows(SpreadsheetUtil.getSheet(SHEET));
  }

  function getByProjectId(projectId) {
    return SpreadsheetUtil.findRowsByField(SpreadsheetUtil.getSheet(SHEET), 'project_id', projectId);
  }

  function getByRoomId(roomId) {
    return SpreadsheetUtil.findRowsByField(SpreadsheetUtil.getSheet(SHEET), 'room_id', roomId);
  }

  function getRoomIdsByProjectId(projectId) {
    return getByProjectId(projectId).map(function (r) { return r.room_id; });
  }

  function getProjectIdsByRoomId(roomId) {
    return getByRoomId(roomId).map(function (r) { return r.project_id; });
  }

  /**
   * 紐付けが存在するか確認
   */
  function exists(projectId, roomId) {
    return getAll().some(function (r) {
      return r.project_id === projectId && r.room_id === roomId;
    });
  }

  function create(projectId, roomId) {
    if (exists(projectId, roomId)) return;
    SpreadsheetUtil.appendRow(SpreadsheetUtil.getSheet(SHEET), {
      project_id: projectId,
      room_id: roomId
    });
  }

  function deleteByProjectIdAndRoomId(projectId, roomId) {
    SpreadsheetUtil.deleteRowsByFields(SpreadsheetUtil.getSheet(SHEET), {
      project_id: projectId,
      room_id: roomId
    });
  }

  function deleteByProjectId(projectId) {
    SpreadsheetUtil.deleteRowsByField(SpreadsheetUtil.getSheet(SHEET), 'project_id', projectId);
  }

  return {
    getByProjectId: getByProjectId,
    getByRoomId: getByRoomId,
    getRoomIdsByProjectId: getRoomIdsByProjectId,
    getProjectIdsByRoomId: getProjectIdsByRoomId,
    exists: exists,
    create: create,
    deleteByProjectIdAndRoomId: deleteByProjectIdAndRoomId,
    deleteByProjectId: deleteByProjectId
  };
})();
