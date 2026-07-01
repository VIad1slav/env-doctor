/**
 * Пытается угадать тип значения переменной окружения.
 * Используется командой `init` для генерации схемы.
 */
function inferType(value) {
  if (value === '') return 'string';
  if (/^(true|false)$/i.test(value)) return 'boolean';
  if (/^-?\d+(\.\d+)?$/.test(value)) return 'number';
  if (/^https?:\/\/.+/i.test(value)) return 'url';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
  return 'string';
}

module.exports = { inferType };
