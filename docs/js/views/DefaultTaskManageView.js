/**
 * DefaultTaskManageView.js
 * P09 デフォルトタスク管理（can_create ユーザー専用）
 */

var DefaultTaskManageView = (function () {
  var _defaultTasks = [];

  function mount(params) {
    _defaultTasks = params.defaultTasks || [];
    _render();
    _bindBack();
  }

  function _render() {
    var container = document.getElementById('default-task-manage-list');
    if (!container) return;

    if (_defaultTasks.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
        '<div class="empty-state-icon">📋</div>' +
        '<div class="empty-state-text">デフォルトタスクがありません</div>' +
        '</div>';
      return;
    }

    var html = _defaultTasks.map(function (dt) {
      var offsetLabel = (dt.offset_days !== undefined && dt.offset_days !== '')
        ? '開始から ' + _esc(String(dt.offset_days)) + ' 日後'
        : '—';
      return [
        '<div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;"',
        '     data-default-task-id="' + _esc(dt.default_task_id) + '">',
        '  <div>',
        '    <div style="font-size:14px;font-weight:bold;">' + _esc(dt.task_name) + '</div>',
        '    <div style="font-size:12px;color:#888;">' + offsetLabel + '</div>',
        '  </div>',
        '  <button class="btn-delete-default-task" data-default-task-id="' + _esc(dt.default_task_id) + '">削除</button>',
        '</div>'
      ].join('');
    }).join('');

    container.innerHTML = html;

    container.querySelectorAll('.btn-delete-default-task').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var defaultTaskId = btn.dataset.defaultTaskId;
        var task = _defaultTasks.find(function (dt) { return dt.default_task_id === defaultTaskId; });
        App.showDeleteConfirm(
          '「' + (task ? task.task_name : '') + '」を削除しますか？',
          function () { _deleteDefaultTask(defaultTaskId); }
        );
      });
    });
  }

  function _deleteDefaultTask(defaultTaskId) {
    var errorEl = document.getElementById('default-task-manage-error');
    if (errorEl) errorEl.style.display = 'none';

    Api.post('deleteDefaultTask', {
      userId: App.getUserId(),
      roomId: App.getRoomId(),
      defaultTaskId: defaultTaskId
    }).then(function () {
      _defaultTasks = _defaultTasks.filter(function (dt) { return dt.default_task_id !== defaultTaskId; });
      Cache.set('defaultTasks', _defaultTasks);
      _render();
    }).catch(function (err) {
      if (errorEl) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    });
  }

  function _bindBack() {
    var btn = document.getElementById('btn-back-default-task-manage');
    if (btn) btn.onclick = function () { App.back(); };
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
