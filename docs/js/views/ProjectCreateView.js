/**
 * ProjectCreateView.js
 * P03 プロジェクト作成
 */

var ProjectCreateView = (function () {

  function mount(params) {
    var defaultTasks = params.defaultTasks || [];
    var rooms = params.rooms || [];

    _renderDefaultTaskList(defaultTasks);
    _renderRoomList(rooms);
    _bindForm();
  }

  function _renderDefaultTaskList(tasks) {
    var container = document.getElementById('default-task-list');
    if (!container) return;

    if (tasks.length === 0) {
      container.innerHTML = '<p style="color:#888;font-size:13px;">デフォルトタスクがありません</p>';
      return;
    }

    var html = '<div class="check-list">' +
      tasks.map(function (t) {
        return [
          '<label class="check-item">',
          '  <input type="checkbox" name="default_task" value="' + _esc(t.default_task_id) + '">',
          '  <div>',
          '    <div class="check-item-label">' + _esc(t.task_name) + '</div>',
          '    <div class="check-item-sub">開始日 +' + Number(t.offset_days) + '日</div>',
          '  </div>',
          '</label>'
        ].join('');
      }).join('') +
      '</div>';
    container.innerHTML = html;
  }

  function _renderRoomList(rooms) {
    var container = document.getElementById('room-check-list');
    if (!container) return;

    var currentRoomId = App.getRoomId();

    if (rooms.length === 0) {
      // 現在のルームのみチェック
      rooms = [{ room_id: currentRoomId, room_name: '現在のルーム' }];
    }

    var html = '<div class="check-list">' +
      rooms.map(function (r) {
        var checked = r.room_id === currentRoomId ? 'checked' : '';
        return [
          '<label class="check-item">',
          '  <input type="checkbox" name="room" value="' + _esc(r.room_id) + '" ' + checked + '>',
          '  <div class="check-item-label">' + _esc(r.room_name) + '</div>',
          '</label>'
        ].join('');
      }).join('') +
      '</div>';
    container.innerHTML = html;
  }

  function _bindForm() {
    // 全選択・解除ボタン
    var selectAllBtn = document.getElementById('btn-select-all-tasks');
    if (selectAllBtn) {
      selectAllBtn.onclick = function () {
        var checkboxes = document.querySelectorAll('input[name="default_task"]');
        var allChecked = Array.from(checkboxes).every(function (c) { return c.checked; });
        checkboxes.forEach(function (c) { c.checked = !allChecked; });
        selectAllBtn.textContent = allChecked ? 'すべて選択' : 'すべて解除';
      };
    }

    // 戻るボタン
    var backBtn = document.getElementById('btn-back-project-create');
    if (backBtn) {
      backBtn.onclick = function () { App.back(); };
    }

    // 送信
    var form = document.getElementById('form-project-create');
    if (!form) return;
    form.onsubmit = function (e) {
      e.preventDefault();
      _submit(form);
    };
  }

  function _submit(form) {
    var projectName = form.querySelector('#input-project-name').value.trim();
    var projectType = form.querySelector('#input-project-type').value;
    var startDate   = form.querySelector('#input-start-date').value;

    if (!projectName || !projectType || !startDate) {
      _showError('必須項目を入力してください');
      return;
    }

    var roomIds = Array.from(form.querySelectorAll('input[name="room"]:checked'))
      .map(function (c) { return c.value; });
    if (roomIds.length === 0) roomIds = [App.getRoomId()];

    var defaultTaskIds = Array.from(form.querySelectorAll('input[name="default_task"]:checked'))
      .map(function (c) { return c.value; });

    _setLoading(true);

    Api.post('createProject', {
      userId: App.getUserId(),
      roomId: App.getRoomId(),
      project_name: projectName,
      project_type: projectType,
      start_date: startDate,
      roomIds: roomIds,
      defaultTaskIds: defaultTaskIds
    }).then(function (data) {
      // 作成後はプロジェクト一覧を更新して遷移
      return Api.get('getProjects', { userId: App.getUserId(), roomId: App.getRoomId() });
    }).then(function (projects) {
      App.navigate('project-list', { projects: projects });
    }).catch(function (err) {
      _setLoading(false);
      _showError(err.message);
    });
  }

  function _setLoading(flag) {
    var btn = document.getElementById('btn-create-project');
    if (!btn) return;
    btn.disabled = flag;
    btn.textContent = flag ? '作成中...' : '作成する';
  }

  function _showError(msg) {
    var el = document.getElementById('project-create-error');
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
