/**
 * TaskFromDefaultView.js
 * P07 デフォルトタスクから追加
 */

var TaskFromDefaultView = (function () {
  var _project = null;
  var _defaultTasks = [];

  function mount(params) {
    _project = params.project;
    _defaultTasks = params.defaultTasks || [];

    _renderList();
    _bindEvents();
  }

  function _renderList() {
    var container = document.getElementById('default-task-select-list');
    if (!container) return;

    if (_defaultTasks.length === 0) {
      container.innerHTML = '<p style="color:#888;font-size:13px;">デフォルトタスクがありません</p>';
      return;
    }

    var html = '<div class="check-list">' +
      _defaultTasks.map(function (t) {
        return [
          '<label class="check-item">',
          '  <input type="checkbox" name="default_task" value="' + _esc(t.default_task_id) + '">',
          '  <div>',
          '    <div class="check-item-label">' + _esc(t.task_name) + '</div>',
          '    <div class="check-item-sub">工数: ' + Number(t.offset_days) + '日</div>',
          '  </div>',
          '</label>'
        ].join('');
      }).join('') +
      '</div>';
    container.innerHTML = html;
  }

  function _bindEvents() {
    var backBtn = document.getElementById('btn-back-task-from-default');
    if (backBtn) backBtn.onclick = _goBack;

    var selectAllBtn = document.getElementById('btn-select-all-default');
    if (selectAllBtn) {
      selectAllBtn.onclick = function () {
        var checkboxes = document.querySelectorAll('input[name="default_task"]');
        var allChecked = Array.from(checkboxes).every(function (c) { return c.checked; });
        checkboxes.forEach(function (c) { c.checked = !allChecked; });
        selectAllBtn.textContent = allChecked ? 'すべて選択' : 'すべて解除';
      };
    }

    var submitBtn = document.getElementById('btn-submit-default-tasks');
    if (submitBtn) submitBtn.onclick = _submit;
  }

  function _submit() {
    var startDate = document.getElementById('input-default-start-date').value;
    if (!startDate) {
      _showError('開始日を入力してください');
      return;
    }

    var selectedIds = Array.from(document.querySelectorAll('input[name="default_task"]:checked'))
      .map(function (c) { return c.value; });
    if (selectedIds.length === 0) {
      _showError('タスクを1つ以上選択してください');
      return;
    }

    var btn = document.getElementById('btn-submit-default-tasks');
    if (btn) { btn.disabled = true; btn.textContent = '追加中...'; }

    Api.post('createDefaultTasks', {
      userId: App.getUserId(),
      roomId: App.getRoomId(),
      projectId: _project.project_id,
      start_date: startDate,
      defaultTaskIds: selectedIds
    }).then(function () {
      return Api.get('getTasks', {
        userId: App.getUserId(),
        roomId: App.getRoomId(),
        projectId: _project.project_id
      });
    }).then(function (tasks) {
      App.navigate('task-list', { project: _project, tasks: tasks || [] });
    }).catch(function (err) {
      if (btn) { btn.disabled = false; btn.textContent = '追加する'; }
      _showError(err.message);
    });
  }

  function _goBack() {
    Api.get('getTasks', {
      userId: App.getUserId(),
      roomId: App.getRoomId(),
      projectId: _project.project_id
    }).then(function (tasks) {
      App.navigate('task-list', { project: _project, tasks: tasks || [] });
    }).catch(function () {
      App.navigate('task-list', { project: _project, tasks: [] });
    });
  }

  function _showError(msg) {
    var el = document.getElementById('task-from-default-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
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
