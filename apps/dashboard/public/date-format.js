(function (root) {
  'use strict';
  const config = Object.freeze({
    timeZone: 'Etc/GMT+7',
    label: 'MST',
    locale: 'en-US'
  });
  const formatter = new Intl.DateTimeFormat(config.locale, {
    timeZone: config.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, hourCycle: 'h23'
  });
  function format(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value ?? '');
    const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
    return `${parts.month}/${parts.day}/${parts.year} ${parts.hour}:${parts.minute} ${config.label}`;
  }
  const dateKeys = /^(?:timestamp|date|time|created_?at|updated_?at|sent_?at|deleted_?at|started_?at|finished_?at|expires_?at|last_?seen|last_?updated)$/i;
  const isoDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i;
  function displayValue(value, key = '') {
    if (Array.isArray(value)) return value.map(item => displayValue(item));
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, displayValue(v, k)]));
    }
    if (typeof value === 'string' && (dateKeys.test(key) || isoDate.test(value)) && isoDate.test(value)) return format(value);
    if (value instanceof Date) return format(value);
    return value;
  }
  function stringify(value) { return JSON.stringify(displayValue(value), null, 2); }
  root.RustezeDateTime = Object.freeze({ config, format, displayValue, stringify });
})(typeof window !== 'undefined' ? window : globalThis);
