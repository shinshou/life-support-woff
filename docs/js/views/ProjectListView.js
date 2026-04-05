/**
 * ProjectListView.js
 * P02 プロジェクト一覧
 */

var ProjectListView = (function () {
  var _canCreate = false;

  function mount(params) {
    var projects = params.projects || [];
    _canCreate = !!params.canCreate;

    _renderHeader(!!params.isAdmin);
    _renderList(projects);
    _renderFab();
  }

  function _renderHeader(isAdmin) {
    var header = document.getElementById('header-project-list');
    if (!header) return;
    header.querySelector('.header-title').textContent = 'タスク管理';

    var existing = document.getElementById('btn-admin');
    if (existing) existing.remove();

    if (isAdmin) {
      var btn = document.createElement('button');
      btn.id = 'btn-admin';
      btn.className = 'header-action-btn';
      btn.textContent = '管理者設定';
      btn.onclick = function () {
        Api.get('getUsers', { userId: App.getUserId(), roomId: App.getRoomId(), displayName: App.getDisplayName() })
          .then(function (users) {
            App.navigate('admin', { users: users || [] });
          });
      };
      header.appendChild(btn);
    }
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
      el.addEventListener('click', function (e) {
        if (e.target.classList.contains('btn-manage-rooms')) return;
        var projectId = el.dataset.projectId;
        var project = projects.find(function (p) { return p.project_id === projectId; });
        _openTaskList(project);
      });
    });

    if (_canCreate) {
      container.querySelectorAll('.btn-manage-rooms').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var projectId = btn.dataset.projectId;
          var project = projects.find(function (p) { return p.project_id === projectId; });
          _openRoomManage(project);
        });
      });
    }
  }

  function _buildProjectCard(p) {
    var startDate = p.start_date ? String(p.start_date).slice(0, 10) : '—';
    var manageBtn = _canCreate
      ? '<button class="btn-manage-rooms" data-project-id="' + _esc(p.project_id) + '">ルーム管理</button>'
      : '';
    return [
      '<div class="card" data-project-id="' + _esc(p.project_id) + '">',
      '  <div class="card-title">' + _esc(p.project_name) + '</div>',
      '  <div class="card-sub">',
      '    <span class="badge badge-type">' + _esc(p.project_type) + '</span>',
      '    <span>開始: ' + _esc(startDate) + '</span>',
      '  </div>',
      manageBtn,
      '</div>'
    ].join('');
  }

  function _openRoomManage(project) {
    Promise.all([
      Api.get('getProjectRooms', { userId: App.getUserId(), roomId: App.getRoomId(), projectId: project.project_id }),
      Api.get('getRooms', {})
    ]).then(function (results) {
      App.navigate('project-room', { project: project, linkedRooms: results[0] || [], allRooms: results[1] || [] });
    }).catch(function (err) {
      alert('ルーム情報の取得に失敗しました: ' + err.message);
    });
  }

  function _renderFab() {
    var fab = document.getElementById('fab-project');
    if (!fab) return;

    if (_canCreate) {
      fab.style.display = 'flex';
    }

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
