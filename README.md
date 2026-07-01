# env-doctor

A CLI that checks your `.env` files for missing variables, type mismatches, and drift between environments (dev / staging / production) — **before** it breaks your deploy.

## The problem

A classic failure mode: everything works locally, but one environment variable was never added to production — so the app crashes right after deploy. Or the variable is there, just in the wrong format (`PORT=abc` instead of a number). Usually this gets caught by eyeballing files side by side, if it gets caught at all.

`env-doctor` automates that check.

## Install

```bash
npm install -g @gudroniy/env-doctor
```

Or without a global install:

```bash
npx @gudroniy/env-doctor check
```

## Quick start

1. Generate a schema from your working `.env`:

```bash
env-doctor init --file .env
```

This creates `env.schema.json` — a description of the expected variables and their types (inferred automatically).

2. Edit the schema if needed — mark optional variables (`"required": false`), adjust types.

3. Check any other `.env` file against that schema:

```bash
env-doctor check .env.production
```

With no arguments, it checks every `.env*` file in the current directory:

```bash
env-doctor check
```

## Example output

```
.env.production
  ✘ Missing required variable "API_KEY"
  ✘ Variable "PORT" should be type number, got "not-a-number"
  ✘ Missing required variable "STRIPE_WEBHOOK_SECRET"
  ⚠ Variable "LEGACY_FLAG" is not defined in the schema

Total: 3 errors, 1 warning
```

## Using it in CI

The command exits with code `1` if any errors are found — drop it into your pipeline before deploy:

```yaml
- run: npx @gudroniy/env-doctor check .env.production --strict
```

`--strict` also treats undeclared variables (e.g. leftover legacy keys) as errors, not just warnings.

## Supported types

`string`, `number`, `boolean`, `url`, `email`

## License

MIT
