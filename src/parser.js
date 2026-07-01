const fs = require('fs');

/**
 * Парсит .env файл в объект ключ-значение.
 * Возвращает также список дублирующихся ключей.
 */
function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const values = {};
  const duplicates = [];
  const seen = new Set();

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) return;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    // убираем окружающие кавычки
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (seen.has(key)) {
      duplicates.push({ key, line: idx + 1 });
    }
    seen.add(key);
    values[key] = value;
  });

  return { values, duplicates };
}

module.exports = { parseEnvFile };
