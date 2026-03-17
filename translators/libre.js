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

// LibreTranslate translator backend, using the LibreTranslate API.
// LibreTranslate is a trademark of LibreTranslate Inc. All rights reserved.
// This software is not affiliated with LibreTranslate Inc or its subsidiaries.
// LibreTranslate is a free and open-source translation service that allows you 
//   to translate text from one language to another.

import { LIBRE_DIALECT_MAP } from '../languages.js';

export async function translate(text, apiKey, options = {}) {
  const source = options.sourceDialect && LIBRE_DIALECT_MAP[options.sourceDialect]
    ? LIBRE_DIALECT_MAP[options.sourceDialect]
    : (options.sourceLang || 'fr');

  const target = options.targetDialect && LIBRE_DIALECT_MAP[options.targetDialect]
    ? LIBRE_DIALECT_MAP[options.targetDialect]
    : (options.targetLang || 'en');

  const host = options.libreUrl || 'https://libretranslate.com';

  const body = {
    q: text,
    source,
    target,
    format: 'text',
  };
  if (apiKey) body.api_key = apiKey;

  const response = await fetch(`${host}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LibreTranslate error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.translatedText;
}
