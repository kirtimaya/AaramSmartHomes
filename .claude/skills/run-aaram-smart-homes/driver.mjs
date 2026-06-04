#!/usr/bin/env node
/**
 * Smoke/interaction driver for AaramSmartHomes (Next.js 16 + React 19).
 *
 * Requires: `npx playwright install chromium` (run once).
 * Playwright package is resolved from /tmp/aaramsmoke/node_modules if not in project.
 *
 * Usage:
 *   node .claude/skills/run-aaram-smart-homes/driver.mjs           # smoke all pages
 *   node .claude/skills/run-aaram-smart-homes/driver.mjs screenshot /login /tmp/out.png
 *   node .claude/skills/run-aaram-smart-homes/driver.mjs api /api/admin/pending-requests
 */

import { spawn, execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const BASE_URL = process.env.NEXT_URL || 'http://localhost:3000';
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp/aaramhomes-screenshots';
const [, , cmd, ...args] = process.argv;

// ── Resolve playwright ────────────────────────────────────────────────────────
async function loadPlaywright() {
  // Try project node_modules first, then temp install location
  const candidates = [
    join(fileURLToPath(import.meta.url), '../../../../node_modules/playwright'),
    '/tmp/aaramsmoke/node_modules/playwright',
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      const { chromium } = await import(p + '/index.js');
      return chromium;
    }
  }
  // Auto-install in temp dir
  console.log('Installing playwright in /tmp/aaramsmoke …');
  mkdirSync('/tmp/aaramsmoke', { recursive: true });
  if (!existsSync('/tmp/aaramsmoke/package.json')) {
    execSync('npm init -y', { cwd: '/tmp/aaramsmoke', stdio: 'inherit' });
  }
  execSync('npm install playwright@1.60.0', { cwd: '/tmp/aaramsmoke', stdio: 'inherit' });
  execSync('npx playwright install chromium', { cwd: '/tmp/aaramsmoke', stdio: 'inherit' });
  const { chromium } = await import('/tmp/aaramsmoke/node_modules/playwright/index.js');
  return chromium;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function screenshot(chromium, path, url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  const res = await page.goto(BASE_URL + url, { waitUntil: 'domcontentloaded' });
  mkdirSync(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: false });
  await browser.close();
  console.log(`Screenshot saved: ${path} (HTTP ${res.status()})`);
  return path;
}

async function smokeAll(chromium) {
  const routes = ['/', '/login', '/adminLogin', '/admin', '/food-hub', '/properties'];
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  const results = [];
  for (const route of routes) {
    const slug = route === '/' ? 'landing' : route.replace(/\//g, '');
    const outPath = join(SCREENSHOT_DIR, `${slug}.png`);
    try {
      const res = await page.goto(BASE_URL + route, { waitUntil: 'domcontentloaded' });
      await page.screenshot({ path: outPath });
      const status = res.status();
      console.log(`✓ ${route} → HTTP ${status}  → ${outPath}`);
      results.push({ route, status, screenshot: outPath });
    } catch (e) {
      console.error(`✗ ${route}: ${e.message}`);
      results.push({ route, error: e.message });
    }
  }
  await browser.close();
  console.log('\nAll screenshots in:', SCREENSHOT_DIR);
  return results;
}

function apiTest(endpoint) {
  const url = BASE_URL + endpoint;
  console.log(`Testing ${url}`);
  try {
    const out = execSync(`curl -s -o /dev/null -w "%{http_code}" "${url}"`).toString();
    console.log(`HTTP ${out}`);
    return parseInt(out);
  } catch (e) {
    console.error(e.message);
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (cmd === 'api') {
    apiTest(args[0] || '/api/admin/pending-requests');
    return;
  }

  const chromium = await loadPlaywright();

  if (cmd === 'screenshot') {
    const [url, path] = args;
    if (!url) { console.error('Usage: driver.mjs screenshot <url> [<path>]'); process.exit(1); }
    const outPath = path || join(SCREENSHOT_DIR, url.replace(/\//g, '') + '.png');
    await screenshot(chromium, outPath, url);
    return;
  }

  // Default: smoke all pages
  await smokeAll(chromium);
}

main().catch(e => { console.error(e); process.exit(1); });