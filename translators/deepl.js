/*
 * (c) 2026, Alex Handy <ahandy@gmail.com>
 *
 * This file is part of Lost in Transcription
 *
 * Lost in Transcription is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Lost in Transcription is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Lost in Transcription.  If not, see <http://www.gnu.org/licenses/>.
 */

// DeepL translator backend, using the DeepL API.
// DeepL and DeepL Pro are trademarks of DeepL GmbH. All rights reserved.
// This software is not affiliated with DeepL GmbH or its subsidiaries.

import { DEEPL_DIALECT_MAP } from '../languages.js';

export async function translate(text, apiKey, options = {}) {
  const baseSrc = (options.sourceLang || 'fr').toUpperCase();
  const baseTgt = (options.targetLang || 'en').toUpperCase();

  const source = options.sourceDialect && DEEPL_DIALECT_MAP[options.sourceDialect]
    ? DEEPL_DIALECT_MAP[options.sourceDialect]
    : baseSrc;

  const target = options.targetDialect && DEEPL_DIALECT_MAP[options.targetDialect]
    ? DEEPL_DIALECT_MAP[options.targetDialect]
    : (baseTgt === 'EN' ? 'EN-US' : baseTgt);

  const isFreeKey = apiKey.endsWith(':fx');
  const baseUrl = isFreeKey
    ? 'https://api-free.deepl.com'
    : 'https://api.deepl.com';

  const response = await fetch(`${baseUrl}/v2/translate`, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [text],
      source_lang: source,
      target_lang: target,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepL error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.translations[0].text;
}
