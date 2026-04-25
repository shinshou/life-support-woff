'use strict';

function getToday() {
  return formatDate(new Date());
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDate(str) {
  if (str instanceof Date) return str;
  const parts = String(str).split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function addDays(dateOrStr, days) {
  const date = parseDate(dateOrStr);
  date.setDate(date.getDate() + Number(days));
  return formatDate(date);
}

function diffDays(date1, date2) {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

module.exports = { getToday, formatDate, parseDate, addDays, diffDays };
