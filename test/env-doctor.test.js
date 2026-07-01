const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { parseEnvFile } = require('../src/parser');
const { inferType } = require('../src/inferType');
const { checkEnv, validateType } = require('../src/validators');

function writeTempEnv(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-doctor-test-'));
  const filePath = path.join(dir, '.env');
  fs.writeFileSync(filePath, content);
  return filePath;
}

// --- parser.js ---

test('parser: базовый разбор ключ=значение', () => {
  const filePath = writeTempEnv('PORT=3000\nDEBUG=true\n');
  const { values } = parseEnvFile(filePath);
  assert.equal(values.PORT, '3000');
  assert.equal(values.DEBUG, 'true');
});

test('parser: пропускает комментарии и пустые строки', () => {
  const filePath = writeTempEnv('# это комментарий\n\nPORT=3000\n');
  const { values } = parseEnvFile(filePath);
  assert.deepEqual(Object.keys(values), ['PORT']);
});

test('parser: снимает кавычки вокруг значения', () => {
  const filePath = writeTempEnv('NAME="my app"\nOTHER=\'single\'\n');
  const { values } = parseEnvFile(filePath);
  assert.equal(values.NAME, 'my app');
  assert.equal(values.OTHER, 'single');
});

test('parser: находит дублирующиеся ключи', () => {
  const filePath = writeTempEnv('KEY=1\nKEY=2\n');
  const { duplicates } = parseEnvFile(filePath);
  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0].key, 'KEY');
});

test('parser: пустой файл не падает', () => {
  const filePath = writeTempEnv('');
  const { values } = parseEnvFile(filePath);
  assert.deepEqual(values, {});
});

test('parser: значение с пустой строкой (KEY=)', () => {
  const filePath = writeTempEnv('EMPTY=\n');
  const { values } = parseEnvFile(filePath);
  assert.equal(values.EMPTY, '');
});

// --- inferType.js ---

test('inferType: определяет число', () => {
  assert.equal(inferType('42'), 'number');
  assert.equal(inferType('-17'), 'number');
  assert.equal(inferType('3.14'), 'number');
});

test('inferType: определяет boolean независимо от регистра', () => {
  assert.equal(inferType('true'), 'boolean');
  assert.equal(inferType('FALSE'), 'boolean');
});

test('inferType: определяет url', () => {
  assert.equal(inferType('https://example.com'), 'url');
  assert.equal(inferType('http://localhost:3000'), 'url');
});

test('inferType: определяет email', () => {
  assert.equal(inferType('a@b.com'), 'email');
});

test('inferType: всё остальное — string', () => {
  assert.equal(inferType('postgres://localhost:5432/db'), 'string');
  assert.equal(inferType('sk_test_abc123'), 'string');
  assert.equal(inferType(''), 'string');
});

// --- validators.js ---

test('validateType: number отклоняет нечисловую строку', () => {
  assert.equal(validateType('not-a-number', 'number'), false);
  assert.equal(validateType('42', 'number'), true);
});

test('checkEnv: ловит отсутствующую обязательную переменную', () => {
  const schema = { API_KEY: { required: true, type: 'string' } };
  const issues = checkEnv(schema, {});
  assert.equal(issues.length, 1);
  assert.equal(issues[0].level, 'error');
});

test('checkEnv: ловит пустое значение обязательной переменной', () => {
  const schema = { API_KEY: { required: true, type: 'string' } };
  const issues = checkEnv(schema, { API_KEY: '' });
  assert.equal(issues.some(i => i.message.includes('пустая')), true);
});

test('checkEnv: не ругается на пустое значение необязательной переменной', () => {
  const schema = { DEBUG: { required: false, type: 'boolean' } };
  const issues = checkEnv(schema, { DEBUG: '' });
  assert.equal(issues.length, 0);
});

test('checkEnv: лишний ключ — warning по умолчанию, error в strict', () => {
  const schema = { PORT: { required: true, type: 'number' } };
  const values = { PORT: '3000', LEGACY: 'yes' };

  const normal = checkEnv(schema, values);
  assert.equal(normal.find(i => i.key === 'LEGACY').level, 'warning');

  const strict = checkEnv(schema, values, { strict: true });
  assert.equal(strict.find(i => i.key === 'LEGACY').level, 'error');
});

test('checkEnv: валидный файл не даёт ошибок', () => {
  const schema = {
    PORT: { required: true, type: 'number' },
    DEBUG: { required: true, type: 'boolean' },
  };
  const values = { PORT: '3000', DEBUG: 'true' };
  const issues = checkEnv(schema, values);
  assert.equal(issues.length, 0);
});
