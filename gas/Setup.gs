/**
 * Setup.gs
 * スプレッドシートの初期セットアップ
 *
 * スプレッドシートのメニュー「タスク管理」→「シートを初期化」から実行する
 */

// ── メニュー登録 ──────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('タスク管理')
    .addItem('シートを初期化', 'setupSheets')
    .addSeparator()
    .addItem('デフォルトタスクを追加', 'showDefaultTaskDialog')
    .addItem('作成者ユーザーを追加', 'showAddCreatorDialog')
    .addSeparator()
    .addItem('固定メニューを登録', 'setupPersistentMenu')
    .addItem('日次通知トリガーを登録', 'setupDailyTrigger')
    .addToUi();
}

/**
 * Botの固定メニューを登録する（一度だけ実行）
 */
function setupPersistentMenu() {
  var props = PropertiesService.getScriptProperties();
  var botId = props.getProperty('LINEWORKS_BOT_ID');
  var woffId = props.getProperty('LINEWORKS_WOFF_ID');

  if (!botId || !woffId) {
    SpreadsheetApp.getUi().alert(
      'スクリプトプロパティに LINEWORKS_BOT_ID と LINEWORKS_WOFF_ID を設定してください。'
    );
    return;
  }

  var token = NotificationService.getAccessToken();
  var url = 'https://www.worksapis.com/v1.0/bots/' + botId + '/persistentmenu';

  var body = {
    content: {
      actions: [
        {
          type: 'uri',
          label: 'タスク管理を開く',
          uri: 'https://woff.worksmobile.com/woff/' + woffId
        }
      ]
    }
  };

  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  if (code === 200 || code === 201) {
    SpreadsheetApp.getUi().alert('固定メニューの登録が完了しました。');
  } else {
    SpreadsheetApp.getUi().alert('エラー: ' + code + '\n' + res.getContentText());
  }
}

/**
 * 日次通知トリガーを登録（毎日AM8時）
 * 既存のトリガーがあれば削除してから再登録
 */
function setupDailyTrigger() {
  var ui = SpreadsheetApp.getUi();

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'runDailyNotification') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('runDailyNotification')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  ui.alert('完了', '日次通知トリガーを登録しました。\n毎日 AM 8:00 に実行されます。', ui.ButtonSet.OK);
}

// ── シート定義 ────────────────────────────────────────────────

var SHEET_DEFINITIONS = [
  {
    name: 'プロジェクト',
    headers: ['project_id', 'project_name', 'project_type', 'start_date'],
    headerColor: '#1565c0',
    colWidths: [200, 240, 120, 120]
  },
  {
    name: 'タスク',
    headers: ['task_id', 'project_id', 'default_task_id', 'task_name', 'assignee', 'start_date', 'due_date', 'status', 'comment'],
    headerColor: '#2e7d32',
    colWidths: [200, 200, 200, 200, 120, 120, 120, 80, 240]
  },
  {
    name: 'デフォルトタスク',
    headers: ['default_task_id', 'task_name', 'offset_days'],
    headerColor: '#6a1b9a',
    colWidths: [200, 240, 100]
  },
  {
    name: 'ルーム',
    headers: ['room_id', 'room_name'],
    headerColor: '#e65100',
    colWidths: [220, 240]
  },
  {
    name: 'ユーザー',
    headers: ['user_id', 'display_name', 'is_admin', 'can_create'],
    headerColor: '#0277bd',
    colWidths: [220, 240, 100, 100]
  },
  {
    name: 'プロジェクト_ルーム紐付け',
    headers: ['project_id', 'room_id'],
    headerColor: '#37474f',
    colWidths: [200, 220]
  },
];

// ── メイン処理 ────────────────────────────────────────────────

/**
 * 全シートを初期化（ヘッダ・書式設定）
 * 既存データがある場合は上書きしない
 */
function setupSheets() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var result = ui.alert(
    'シートを初期化',
    '6つのシートを作成・フォーマットします。\n' +
    '既存のシートがある場合はヘッダ行のみ更新されます（データは保持）。\n\n' +
    '実行しますか？',
    ui.ButtonSet.OK_CANCEL
  );
  if (result !== ui.Button.OK) return;

  SHEET_DEFINITIONS.forEach(function (def) {
    _setupSheet(ss, def);
  });

  // スクリプトプロパティにスプレッドシートIDを自動登録
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());

  ui.alert(
    '完了',
    '全シートのセットアップが完了しました。\n\n' +
    '作成・更新されたシート:\n' +
    SHEET_DEFINITIONS.map(function (d) { return '  ・' + d.name; }).join('\n'),
    ui.ButtonSet.OK
  );
}

/**
 * 1シートのセットアップ
 */
function _setupSheet(ss, def) {
  var sheet = ss.getSheetByName(def.name);

  // シートが存在しない場合は新規作成
  if (!sheet) {
    sheet = ss.insertSheet(def.name);
  }

  var numCols = def.headers.length;

  // ── ヘッダ行（1行目）を設定 ──
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setValues([def.headers]);

  // ヘッダのスタイル
  headerRange
    .setBackground(def.headerColor)
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(11)
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('center')
    .setBorder(true, true, true, true, true, true, '#ffffff', SpreadsheetApp.BorderStyle.SOLID);

  // ヘッダ行の高さ
  sheet.setRowHeight(1, 36);

  // ── 列幅の設定 ──
  def.colWidths.forEach(function (width, i) {
    sheet.setColumnWidth(i + 1, width);
  });

  // ── データ行（2行目以降）のスタイル ──
  var lastRow = Math.max(sheet.getMaxRows(), 100);
  if (lastRow > 1) {
    var dataRange = sheet.getRange(2, 1, lastRow - 1, numCols);
    dataRange
      .setBackground('#ffffff')
      .setFontColor('#333333')
      .setFontSize(11)
      .setVerticalAlignment('middle')
      .setBorder(null, null, null, null, true, true, '#e0e0e0', SpreadsheetApp.BorderStyle.SOLID);
  }

  // ── 交互に背景色（縞模様）を設定 ──
  _applyBanding(sheet, numCols, def.headerColor);

  // ── ヘッダ行を固定 ──
  sheet.setFrozenRows(1);

  // ── status列があれば入力規則を設定 ──
  var statusIdx = def.headers.indexOf('status');
  if (statusIdx !== -1) {
    var statusRange = sheet.getRange(2, statusIdx + 1, sheet.getMaxRows() - 1, 1);
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['未着手', '進行中', '完了'], true)
      .setAllowInvalid(false)
      .build();
    statusRange.setDataValidation(rule);
  }

  // ── 作成可否列があればチェックボックスを設定 ──
  var boolIdx = def.headers.indexOf('作成可否');
  if (boolIdx !== -1) {
    var boolRange = sheet.getRange(2, boolIdx + 1, sheet.getMaxRows() - 1, 1);
    boolRange.insertCheckboxes();
  }

  // ── due_date / start_date 列があれば日付フォーマットを設定 ──
  ['due_date', 'start_date'].forEach(function (col) {
    var idx = def.headers.indexOf(col);
    if (idx !== -1) {
      sheet.getRange(2, idx + 1, sheet.getMaxRows() - 1, 1)
        .setNumberFormat('yyyy-mm-dd');
    }
  });

  // ── offset_days 列があれば数値フォーマット ──
  var offsetIdx = def.headers.indexOf('offset_days');
  if (offsetIdx !== -1) {
    sheet.getRange(2, offsetIdx + 1, sheet.getMaxRows() - 1, 1)
      .setNumberFormat('0');
  }
}

/**
 * 縞模様（バンディング）を適用
 */
function _applyBanding(sheet, numCols, headerColor) {
  // 既存のバンディングを削除してから再設定
  var bandings = sheet.getBandings();
  bandings.forEach(function (b) { b.remove(); });

  var range = sheet.getRange(1, 1, sheet.getMaxRows(), numCols);
  range.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false);
}

// ── デフォルトタスク追加ダイアログ ───────────────────────────

function showDefaultTaskDialog() {
  var ui = SpreadsheetApp.getUi();

  var nameResult = ui.prompt(
    'デフォルトタスクを追加',
    'タスク名を入力してください:',
    ui.ButtonSet.OK_CANCEL
  );
  if (nameResult.getSelectedButton() !== ui.Button.OK) return;
  var taskName = nameResult.getResponseText().trim();
  if (!taskName) { ui.alert('タスク名が入力されていません'); return; }

  var offsetResult = ui.prompt(
    'デフォルトタスクを追加',
    'オフセット日数（開始日から何日後か）を入力してください:\n例: 0 = 当日、7 = 7日後',
    ui.ButtonSet.OK_CANCEL
  );
  if (offsetResult.getSelectedButton() !== ui.Button.OK) return;
  var offsetDays = parseInt(offsetResult.getResponseText().trim(), 10);
  if (isNaN(offsetDays)) { ui.alert('数値を入力してください'); return; }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('デフォルトタスク');
  if (!sheet) { ui.alert('「デフォルトタスク」シートが見つかりません。先にシートを初期化してください'); return; }

  var id = 'dtask_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  sheet.appendRow([id, taskName, offsetDays]);

  ui.alert('追加しました', '「' + taskName + '」（+' + offsetDays + '日）を追加しました。', ui.ButtonSet.OK);
}

// ── 作成者ユーザー追加ダイアログ ─────────────────────────────

function showAddCreatorDialog() {
  var ui = SpreadsheetApp.getUi();

  var result = ui.prompt(
    '作成者ユーザーを追加',
    'LINE WORKS ユーザーID を入力してください:',
    ui.ButtonSet.OK_CANCEL
  );
  if (result.getSelectedButton() !== ui.Button.OK) return;
  var userId = result.getResponseText().trim();
  if (!userId) { ui.alert('ユーザーIDが入力されていません'); return; }

  // 重複チェック
  var existing = UserModel.getByUserId(userId);
  if (existing) {
    ui.alert('このユーザーIDはすでに登録されています');
    return;
  }

  UserModel.create(userId, true);
  ui.alert('追加しました', 'ユーザーID「' + userId + '」をプロジェクト作成者として登録しました。', ui.ButtonSet.OK);
}
