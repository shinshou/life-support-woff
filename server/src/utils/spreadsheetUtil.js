'use strict';

const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

let sheetsClient = null;
// ヘッダーとシートIDをキャッシュ（起動中は不変と見なす）
const headerCache = {};
const sheetIdCache = {};

async function _getSheets() {
  if (!sheetsClient) {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    sheetsClient = google.sheets({ version: 'v4', auth });
  }
  return sheetsClient;
}

async function _getHeaders(sheetName) {
  if (headerCache[sheetName]) return headerCache[sheetName];
  const sheets = await _getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!1:1`,
  });
  const headers = (res.data.values || [[]])[0] || [];
  headerCache[sheetName] = headers;
  return headers;
}

async function _getSheetId(sheetName) {
  if (sheetIdCache[sheetName] !== undefined) return sheetIdCache[sheetName];
  const sheets = await _getSheets();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets.properties',
  });
  for (const sheet of res.data.sheets) {
    sheetIdCache[sheet.properties.title] = sheet.properties.sheetId;
  }
  if (sheetIdCache[sheetName] === undefined) {
    throw new Error('シートが見つかりません: ' + sheetName);
  }
  return sheetIdCache[sheetName];
}

// YYYY/MM/DD（日本語ロケール）→ YYYY-MM-DD に正規化
function _normalizeDateStr(v) {
  if (typeof v !== 'string') return v;
  const m = v.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return v;
}

async function getAllRows(sheetName) {
  const sheets = await _getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'`,
  });
  const data = res.data.values || [];
  if (data.length <= 1) return [];
  const headers = data[0];
  headerCache[sheetName] = headers;
  return data.slice(1).map((row, i) => {
    const obj = { _rowIndex: i + 2 };
    headers.forEach((h, j) => {
      obj[h] = _normalizeDateStr(row[j] !== undefined ? row[j] : '');
    });
    return obj;
  });
}

async function findRowsByField(sheetName, key, value) {
  const rows = await getAllRows(sheetName);
  return rows.filter(r => String(r[key]) === String(value));
}

async function appendRow(sheetName, obj) {
  const sheets = await _getSheets();
  const headers = await _getHeaders(sheetName);
  const row = headers.map(h => (obj[h] !== undefined ? String(obj[h]) : ''));
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

async function updateRow(sheetName, rowIndex, obj) {
  const sheets = await _getSheets();
  const [headers, rowRes] = await Promise.all([
    _getHeaders(sheetName),
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A${rowIndex}:Z${rowIndex}`,
    }),
  ]);
  const currentRow = (rowRes.data.values || [[]])[0] || [];
  const newRow = headers.map((h, j) => {
    if (obj[h] !== undefined) return String(obj[h]);
    return currentRow[j] !== undefined ? currentRow[j] : '';
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!A${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [newRow] },
  });
}

async function deleteRow(sheetName, rowIndex) {
  const sheets = await _getSheets();
  const sheetId = await _getSheetId(sheetName);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1, // Sheets API は 0-based
            endIndex: rowIndex,
          },
        },
      }],
    },
  });
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

module.exports = { getAllRows, findRowsByField, appendRow, updateRow, deleteRow, generateId };
