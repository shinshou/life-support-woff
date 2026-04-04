/**
 * ProjectRoomView.js
 * P06 プロジェクト ルーム管理（作成者専用）
 */

var ProjectRoomView = (function () {
  var _project = null;
  var _linkedRooms = [];
  var _allRooms = [];

  function mount(params) {
    _project = params.project;
    _linkedRooms = params.linkedRooms || [];
    _allRooms = params.allRooms || [];

    _renderHeader();
    _renderRooms();
  }

  function _renderHeader() {
    var title = document.getElementById('project-room-title');
    if (title) title.textContent = _project.project_name + ' ルーム管理';

    var backBtn = document.getElementById('btn-back-project-room');
    if (backBtn) {
      backBtn.onclick = function () {
        Api.get('getProjects', { userId: App.getUserId(), roomId: App.getRoomId(), displayName: App.getDisplayName() })
          .then(function (res) {
            App.navigate('project-list', { projects: res.projects || [], canCreate: res.canCreate });
          });
      };
    }
  }

  function _renderRooms() {
    _renderLinked();
    _renderUnlinked();
  }

  function _renderLinked() {
    var container = document.getElementById('linked-room-list');
    if (!container) return;

    if (_linkedRooms.length === 0) {
      container.innerHTML = '<p style="color:#888;font-size:13px;">紐付きルームなし</p>';
      return;
    }

    var html = _linkedRooms.map(function (r) {
      return [
        '<div class="room-item" data-room-id="' + _esc(r.room_id) + '">',
        '  <span class="room-item-name">' + _esc(r.room_name || r.room_id) + '</span>',
        '  <button class="btn-unlink" data-room-id="' + _esc(r.room_id) + '">解除</button>',
        '</div>'
      ].join('');
    }).join('');
    container.innerHTML = html;

    container.querySelectorAll('.btn-unlink').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _unlink(btn.dataset.roomId);
      });
    });
  }

  function _renderUnlinked() {
    var container = document.getElementById('unlinked-room-list');
    if (!container) return;

    var linkedIds = _linkedRooms.map(function (r) { return r.room_id; });
    var unlinked = _allRooms.filter(function (r) { return linkedIds.indexOf(r.room_id) === -1; });

    if (unlinked.length === 0) {
      container.innerHTML = '<p style="color:#888;font-size:13px;">追加できるルームなし</p>';
      return;
    }

    var html = unlinked.map(function (r) {
      return [
        '<div class="room-item" data-room-id="' + _esc(r.room_id) + '">',
        '  <span class="room-item-name">' + _esc(r.room_name || r.room_id) + '</span>',
        '  <button class="btn-link" data-room-id="' + _esc(r.room_id) + '">追加</button>',
        '</div>'
      ].join('');
    }).join('');
    container.innerHTML = html;

    container.querySelectorAll('.btn-link').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _link(btn.dataset.roomId);
      });
    });
  }

  function _link(roomId) {
    Api.post('linkRoom', {
      userId: App.getUserId(),
      roomId: App.getRoomId(),
      projectId: _project.project_id,
      targetRoomId: roomId
    }).then(function () {
      return _reload();
    }).catch(function (err) {
      _showError(err.message);
    });
  }

  function _unlink(roomId) {
    Api.post('unlinkRoom', {
      userId: App.getUserId(),
      roomId: App.getRoomId(),
      projectId: _project.project_id,
      targetRoomId: roomId
    }).then(function () {
      return _reload();
    }).catch(function (err) {
      _showError(err.message);
    });
  }

  function _reload() {
    return Promise.all([
      Api.get('getProjectRooms', { userId: App.getUserId(), roomId: App.getRoomId(), projectId: _project.project_id }),
      Api.get('getRooms', {})
    ]).then(function (results) {
      _linkedRooms = results[0] || [];
      _allRooms = results[1] || [];
      _renderRooms();
    });
  }

  function _showError(msg) {
    var el = document.getElementById('project-room-error');
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
    }
  }

  function _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return { mount: mount };
})();
