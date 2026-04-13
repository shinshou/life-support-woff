/**
 * RoomModel.gs
 * ルーム CRUD
 */

var RoomModel = (function () {
  var SHEET = 'ルーム';

  function getAll() {
    return SpreadsheetUtil.getAllRows(SpreadsheetUtil.getSheet(SHEET));
  }

  function getById(roomId) {
    var rows = SpreadsheetUtil.findRowsByField(SpreadsheetUtil.getSheet(SHEET), 'room_id', roomId);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * @param {{room_id:string, room_name:string}} data
   */
  function create(data) {
    SpreadsheetUtil.appendRow(SpreadsheetUtil.getSheet(SHEET), {
      room_id: data.room_id,
      room_name: data.room_name
    });
  }

  function update(roomId, data) {
    SpreadsheetUtil.updateRowById(SpreadsheetUtil.getSheet(SHEET), 'room_id', roomId, data);
  }

  function deleteById(roomId) {
    SpreadsheetUtil.deleteRowById(SpreadsheetUtil.getSheet(SHEET), 'room_id', roomId);
  }

  function getByProjectId(projectId) {
    var roomIds = ProjectRoomModel.getRoomIdsByProjectId(projectId);
    if (roomIds.length === 0) return [];
    return getAll().filter(function (r) {
      return roomIds.indexOf(r.room_id) !== -1;
    });
  }

  return {
    getAll: getAll,
    getById: getById,
    create: create,
    update: update,
    deleteById: deleteById,
    getByProjectId: getByProjectId
  };
})();
