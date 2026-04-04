/**
 * NotificationService.gs
 * LINE WORKS Bot 通知
 */

var NotificationService = (function () {

  var props = PropertiesService.getScriptProperties();

  function _getAccessToken() {
    var clientId = props.getProperty('LINEWORKS_CLIENT_ID');
    var clientSecret = props.getProperty('LINEWORKS_CLIENT_SECRET');
    var serviceAccount = props.getProperty('LINEWORKS_SERVICE_ACCOUNT');
    var rawKey = props.getProperty('LINEWORKS_PRIVATE_KEY')
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();

    // 改行がない場合（スクリプトプロパティで改行が失われた場合）はPEM形式に再整形
    var privateKey = rawKey;
    if (rawKey.indexOf('\n') === -1) {
      var body = rawKey
        .replace('-----BEGIN PRIVATE KEY-----', '')
        .replace('-----END PRIVATE KEY-----', '')
        .replace(/ /g, '');
      var lines = [];
      for (var i = 0; i < body.length; i += 64) {
        lines.push(body.substring(i, i + 64));
      }
      privateKey = '-----BEGIN PRIVATE KEY-----\n' + lines.join('\n') + '\n-----END PRIVATE KEY-----';
    }

    // JWT 生成
    var now = Math.floor(Date.now() / 1000);
    var header = Utilities.base64EncodeWebSafe(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    var payload = Utilities.base64EncodeWebSafe(JSON.stringify({
      iss: clientId,
      sub: serviceAccount,
      iat: now,
      exp: now + 3600
    }));
    var signature = Utilities.base64EncodeWebSafe(
      Utilities.computeRsaSha256Signature(header + '.' + payload, privateKey)
    );
    var jwt = header + '.' + payload + '.' + signature;

    var res = UrlFetchApp.fetch('https://auth.worksmobile.com/oauth2/v2.0/token', {
      method: 'post',
      payload: {
        assertion: jwt,
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'bot'
      }
    });
    return JSON.parse(res.getContentText()).access_token;
  }

  /**
   * 指定ルームにメッセージを送信
   * @param {string} roomId
   * @param {string} message
   */
  function _postToRoom(roomId, message) {
    try {
      var botId = props.getProperty('LINEWORKS_BOT_ID');
      var token = _getAccessToken();
      UrlFetchApp.fetch(
        'https://www.worksapis.com/v1.0/bots/' + botId + '/channels/' + roomId + '/messages',
        {
          method: 'post',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify({
            content: { type: 'text', text: message }
          }),
          muteHttpExceptions: true
        }
      );
    } catch (e) {
      console.error('通知送信エラー roomId=' + roomId + ' : ' + e.message);
    }
  }

  /**
   * プロジェクトに紐づく全ルームへ通知
   * @param {Object} task
   * @param {string} message
   */
  function _notifyProjectRooms(task, message) {
    var roomIds = ProjectRoomModel.getRoomIdsByProjectId(task.project_id);
    roomIds.forEach(function (roomId) {
      _postToRoom(roomId, message);
    });
  }

  function sendTaskComplete(task) {
    var project = ProjectModel.getById(task.project_id);
    var projectName = project ? project.project_name : task.project_id;
    _notifyProjectRooms(task,
      '[完了] ' + task.task_name + '（' + projectName + '）\n担当: ' + (task.assignee || '未設定')
    );
  }

  function sendDueToday(task) {
    _notifyProjectRooms(task,
      '[本日期限] ' + task.task_name + '\n担当: ' + (task.assignee || '未設定') +
      '　期日: ' + task.due_date
    );
  }

  function sendDueSoon(task, daysLeft) {
    _notifyProjectRooms(task,
      '[期限' + daysLeft + '日前] ' + task.task_name + '\n担当: ' + (task.assignee || '未設定') +
      '　期日: ' + task.due_date
    );
  }

  function sendOverdue(task) {
    _notifyProjectRooms(task,
      '[期限超過] ' + task.task_name + '\n担当: ' + (task.assignee || '未設定') +
      '　期日: ' + task.due_date
    );
  }

  return {
    sendTaskComplete: sendTaskComplete,
    sendDueToday: sendDueToday,
    sendDueSoon: sendDueSoon,
    sendOverdue: sendOverdue,
    getAccessToken: _getAccessToken
  };
})();
