/**
 * DefaultTaskManageView.js
 * P09 デフォルトタスク管理（can_create ユーザー専用）
 */

var DefaultTaskManageView = (function () {
  var _defaultTasks = [];
  var PROJECT_TYPES = ['研修', 'イベント', '業務改善', 'その他'];

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
      var typeLabel = dt.project_type ? _esc(dt.project_type) : '（全種別）';
      var typeOptions = ['<option value="">全種別</option>']
        .concat(PROJECT_TYPES.map(function (t) {
          return '<option value="' + _esc(t) + '"' + (dt.project_type === t ? ' selected' : '') + '>' + _esc(t) + '</option>';
        })).join('');

      return [
        '<div class="card" style="padding:12px 16px;" data-default-task-id="' + _esc(dt.default_task_id) + '">',
        '  <div style="display:flex;align-items:center;justify-content:space-between;">',
        '    <div>',
        '      <div style="font-size:14px;font-weight:bold;">' + _esc(dt.task_name) + '</div>',
        '      <div style="font-size:12px;color:#888;margin-top:2px;">' + offsetLabel + '</div>',
        '    </div>',
        '    <button class="btn-delete-default-task" data-default-task-id="' + _esc(dt.default_task_id) + '" style="flex-shrink:0;margin-left:8px;">削除</button>',
        '  </div>',
        '  <div style="display:flex;align-items:center;gap:8px;margin-top:10px;">',
        '    <span style="font-size:12px;color:#555;">種別:</span>',
        '    <select class="form-select select-default-task-type" data-default-task-id="' + _esc(dt.default_task_id) + '" style="flex:1;font-size:13px;padding:4px 8px;">',
        typeOptions,
        '    </select>',
        '    <button class="btn-save-default-task-type" data-default-task-id="' + _esc(dt.default_task_id) + '" style="font-size:12px;padding:4px 10px;">保存</button>',
        '  </div>',
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

    container.querySelectorAll('.btn-save-default-task-type').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var defaultTaskId = btn.dataset.defaultTaskId;
        var select = container.querySelector('.select-default-task-type[data-default-task-id="' + defaultTaskId + '"]');
        var projectType = select ? select.value : '';
        _updateProjectType(defaultTaskId, projectType, btn);
      });
    });
  }

  function _updateProjectType(defaultTaskId, projectType, btn) {
    var origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '保存中...';

    Api.post('updateDefaultTask', {
      userId: App.getUserId(),
      roomId: App.getRoomId(),
      defaultTaskId: defaultTaskId,
      project_type: projectType
    }).then(function () {
      var task = _defaultTasks.find(function (dt) { return dt.default_task_id === defaultTaskId; });
      if (task) task.project_type = projectType;
      Cache.set('defaultTasks', _defaultTasks);
      btn.textContent = '保存済';
      setTimeout(function () {
        btn.disabled = false;
        btn.textContent = origText;
      }, 1500);
    }).catch(function (err) {
      btn.disabled = false;
      btn.textContent = origText;
      alert('保存に失敗しました: ' + err.message);
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
      _defaultTasks = _defaultTasks.filter(function (dt) {
        return String(dt.default_task_id) !== String(defaultTaskId);
      });
      Cache.set('defaultTasks', _defaultTasks);
      _render();
    }).catch(function (err) {
      alert('削除に失敗しました: ' + err.message);
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
