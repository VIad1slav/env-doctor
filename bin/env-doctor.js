#!/usr/bin/env node
const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { parseEnvFile } = require('../src/parser');
const { inferType } = require('../src/inferType');
const { checkEnv } = require('../src/validators');

const DEFAULT_SCHEMA_FILE = 'env.schema.json';

program
  .name('env-doctor')
  .description(
    'Проверяет .env файлы на пропущенные переменные, несоответствие типов и расхождения между окружениями'
  )
  .version('1.0.0');

program
  .command('init')
  .description('Сгенерировать env.schema.json на основе существующего .env файла')
  .option('-f, --file <path>', 'Путь к исходному .env файлу', '.env')
  .option('-o, --output <path>', 'Путь для сохранения схемы', DEFAULT_SCHEMA_FILE)
  .action((opts) => {
    const filePath = path.resolve(process.cwd(), opts.file);
    if (!fs.existsSync(filePath)) {
      console.error(chalk.red(`Файл не найден: ${filePath}`));
      process.exit(1);
    }

    const { values } = parseEnvFile(filePath);
    const schema = {};
    for (const [key, value] of Object.entries(values)) {
      schema[key] = { required: true, type: inferType(value) };
    }

    const schemaPath = path.resolve(process.cwd(), opts.output);
    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2) + '\n');

    console.log(chalk.green(`✔ Схема создана: ${opts.output} (${Object.keys(schema).length} переменных)`));
    console.log(chalk.gray('  Отредактируй файл вручную: пометь опциональные переменные, поправь типы при необходимости.'));
  });

program
  .command('check [files...]')
  .description('Проверить .env файлы на соответствие схеме')
  .option('-s, --strict', 'Считать лишние переменные ошибкой, а не предупреждением')
  .option('--schema <path>', 'Путь к файлу схемы', DEFAULT_SCHEMA_FILE)
  .action((files, opts) => {
    const schemaPath = path.resolve(process.cwd(), opts.schema);
    if (!fs.existsSync(schemaPath)) {
      console.error(chalk.red(`Схема не найдена: ${schemaPath}`));
      console.error(chalk.gray('  Запусти "env-doctor init" сначала, чтобы её создать.'));
      process.exit(1);
    }
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

    let targetFiles = files && files.length ? files : null;
    if (!targetFiles) {
      targetFiles = fs
        .readdirSync(process.cwd())
        .filter((f) => /^\.env(\..+)?$/.test(f));
    }

    if (targetFiles.length === 0) {
      console.error(chalk.red('Не найдено ни одного .env файла для проверки.'));
      process.exit(1);
    }

    let totalErrors = 0;
    let totalWarnings = 0;

    for (const file of targetFiles) {
      const filePath = path.resolve(process.cwd(), file);
      console.log(chalk.bold(`\n${file}`));

      if (!fs.existsSync(filePath)) {
        console.log(chalk.red('  ✘ файл не найден'));
        totalErrors++;
        continue;
      }

      const { values, duplicates } = parseEnvFile(filePath);
      const issues = checkEnv(schema, values, { strict: Boolean(opts.strict) });

      duplicates.forEach((d) => {
        issues.push({
          level: 'warning',
          key: d.key,
          message: `Дублирующийся ключ "${d.key}" (строка ${d.line})`,
        });
      });

      if (issues.length === 0) {
        console.log(chalk.green('  ✔ Всё в порядке'));
        continue;
      }

      issues.forEach((issue) => {
        const icon = issue.level === 'error' ? chalk.red('✘') : chalk.yellow('⚠');
        console.log(`  ${icon} ${issue.message}`);
        if (issue.level === 'error') totalErrors++;
        else totalWarnings++;
      });
    }

    console.log('');
    console.log(chalk.bold(`Итого: ${totalErrors} ошибок, ${totalWarnings} предупреждений`));

    if (totalErrors > 0) process.exit(1);
  });

program.parse();
