/**
 * ProjectListView.js
 * P02 プロジェクト一覧
 */

var ProjectListView = (function () {

  function mount(params) {
    var projects = params.projects || [];

    _renderHeader();
    _renderList(projects);
    _renderFab();
  }

  function _renderHeader() {
    var header = document.getElementById('header-project-list');
    if (header) header.querySelector('.header-title').textContent = 'タスク管理';
  }

  function _renderList(projects) {
    var container = document.getElementById('project-list-container');
    if (!container) return;

    if (projects.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
        '<div class="empty-state-icon">📋</div>' +
        '<div class="empty-state-text">プロジェクトがありません</div>' +
        '</div>';
      return;
    }

    var html = projects.map(function (p) {
      return _buildProjectCard(p);
    }).join('');
    container.innerHTML = html;

    // タップイベント登録
    container.querySelectorAll('.card[data-project-id]').forEach(function (el) {
      el.addEventListener('click', function () {
        var projectId = el.dataset.projectId;
        var project = projects.find(function (p) { return p.project_id === projectId; });
        _openTaskList(project);
      });
    });
  }

  function _buildProjectCard(p) {
    var startDate = p.start_date ? String(p.start_date).slice(0, 10) : '—';
    return [
      '<div class="card" data-project-id="' + _esc(p.project_id) + '">',
      '  <div class="card-title">' + _esc(p.project_name) + '</div>',
      '  <div class="card-sub">',
      '    <span class="badge badge-type">' + _esc(p.project_type) + '</span>',
      '    <span>開始: ' + _esc(startDate) + '</span>',
      '  </div>',
      '</div>'
    ].join('');
  }

  function _renderFab() {
    var fab = document.getElementById('fab-project');
    if (!fab) return;

    // 作成権限がある場合のみ表示
    Api.get('getProjects', { userId: App.getUserId(), roomId: App.getRoomId() })
      .then(function () {
        // 権限確認はサーバー側で行うため、ここでは常に表示
        // createProject が 403 を返した場合は View でエラー表示
        fab.style.display = 'flex';
      })
      .catch(function () {});

    fab.onclick = function () {
      // デフォルトタスク一覧とルーム一覧を取得してから遷移
      Promise.all([
        Api.get('getDefaultTasks', {}),
        Api.get('getRooms', {})
      ]).then(function (results) {
        App.navigate('project-create', {
          defaultTasks: results[0] || [],
          rooms: results[1] || []
        });
      }).catch(function (err) {
        alert('データ取得に失敗しました: ' + err.message);
      });
    };
  }

  function _openTaskList(project) {
    Api.get('getTasks', {
      userId: App.getUserId(),
      roomId: App.getRoomId(),
      projectId: project.project_id
    }).then(function (tasks) {
      App.navigate('task-list', { project: project, tasks: tasks || [] });
    }).catch(function (err) {
      alert('タスク取得に失敗しました: ' + err.message);
    });
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
