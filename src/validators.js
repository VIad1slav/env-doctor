function validateType(value, expectedType) {
  if (!expectedType || expectedType === 'string') return true;
  if (expectedType === 'number') return /^-?\d+(\.\d+)?$/.test(value);
  if (expectedType === 'boolean') return /^(true|false)$/i.test(value);
  if (expectedType === 'url') return /^https?:\/\/.+/i.test(value);
  if (expectedType === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  return true;
}

/**
 * Сравнивает значения из .env файла со схемой.
 * Возвращает список проблем: { level: 'error' | 'warning', key, message }
 */
function checkEnv(schema, envValues, { strict = false } = {}) {
  const issues = [];

  for (const [key, rule] of Object.entries(schema)) {
    const hasKey = Object.prototype.hasOwnProperty.call(envValues, key);

    if (rule.required && !hasKey) {
      issues.push({
        level: 'error',
        key,
        message: `Отсутствует обязательная переменная "${key}"`,
      });
      continue;
    }

    if (hasKey) {
      const value = envValues[key];

      if (rule.required && value === '') {
        issues.push({
          level: 'error',
          key,
          message: `Переменная "${key}" обязательна, но пустая`,
        });
        continue;
      }

      if (value !== '' && rule.type && !validateType(value, rule.type)) {
        issues.push({
          level: 'error',
          key,
          message: `Переменная "${key}" должна быть типа ${rule.type}, получено "${value}"`,
        });
      }
    }
  }

  for (const key of Object.keys(envValues)) {
    if (!schema[key]) {
      issues.push({
        level: strict ? 'error' : 'warning',
        key,
        message: `Переменная "${key}" не описана в схеме`,
      });
    }
  }

  return issues;
}

module.exports = { checkEnv, validateType };
