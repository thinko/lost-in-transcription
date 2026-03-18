#!/usr/bin/env node
/**
 * Pseudo-locale generator for Lost in Transcription.
 *
 * Reads _locales/en/messages.json and produces _locales/qps-ploc/messages.json
 * with accented, padded strings wrapped in brackets for stress-testing UI layouts.
 *
 * Usage:  node _dev_tests/generate-pseudo-locale.js
 */

const fs = require('fs');
const path = require('path');

const ACCENT_MAP = {
  a: 'ä', b: 'β', c: 'ç', d: 'đ', e: 'ë', f: 'ƒ',
  g: 'ğ', h: 'ħ', i: 'ï', j: 'ĵ', k: 'ķ', l: 'ĺ',
  m: 'ɱ', n: 'ñ', o: 'ö', p: 'þ', q: 'ǫ', r: 'ŕ',
  s: 'š', t: 'ŧ', u: 'ü', v: 'ṽ', w: 'ŵ', x: 'ẍ',
  y: 'ÿ', z: 'ž',
  A: 'Ä', B: 'Ɓ', C: 'Ç', D: 'Đ', E: 'Ë', F: 'Ƒ',
  G: 'Ğ', H: 'Ħ', I: 'Ï', J: 'Ĵ', K: 'Ķ', L: 'Ĺ',
  M: 'Ṁ', N: 'Ñ', O: 'Ö', P: 'Þ', Q: 'Ǫ', R: 'Ŕ',
  S: 'Š', T: 'Ŧ', U: 'Ü', V: 'Ṽ', W: 'Ŵ', X: 'Ẍ',
  Y: 'Ÿ', Z: 'Ž',
};

const PAD_CHAR = '~';
const PAD_RATIO = 0.4;

function pseudoLocalize(message) {
  if (!message || typeof message !== 'string') return message;

  const placeholderPattern = /(\$[A-Z_]+\$|\{\{[A-Z_]+\}\}|%[sd])/g;
  const segments = message.split(placeholderPattern);

  let accented = segments.map((seg) => {
    if (placeholderPattern.test(seg)) {
      placeholderPattern.lastIndex = 0;
      return seg;
    }
    return seg.split('').map((ch) => ACCENT_MAP[ch] || ch).join('');
  }).join('');

  const padLen = Math.ceil(message.length * PAD_RATIO);
  const padding = PAD_CHAR.repeat(padLen);

  return `[${accented}${padding}]`;
}

const enPath = path.resolve(__dirname, '..', '_locales', 'en', 'messages.json');
const outDir = path.resolve(__dirname, '..', '_locales', 'qps-ploc');
const outPath = path.join(outDir, 'messages.json');

const enMessages = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const pseudoMessages = {};

for (const [key, value] of Object.entries(enMessages)) {
  pseudoMessages[key] = {
    message: pseudoLocalize(value.message),
  };
  if (value.placeholders) {
    pseudoMessages[key].placeholders = value.placeholders;
  }
}

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(outPath, JSON.stringify(pseudoMessages, null, 2) + '\n', 'utf8');

const count = Object.keys(pseudoMessages).length;
console.log(`Generated ${count} pseudo-localized strings → ${outPath}`);
