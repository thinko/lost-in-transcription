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

// Google Translate translator backend, using the Google Cloud Translation API.
// Google and Cloud Translation are trademarks of Google LLC. All rights reserved.
// This software is not affiliated with Google LLC or its subsidiaries.

import { GOOGLE_DIALECT_MAP } from '../languages.js';

export async function translate(text, apiKey, options = {}) {
  const source = options.sourceDialect && GOOGLE_DIALECT_MAP[options.sourceDialect]
    ? GOOGLE_DIALECT_MAP[options.sourceDialect]
    : (options.sourceLang || 'fr');

  const target = options.targetDialect && GOOGLE_DIALECT_MAP[options.targetDialect]
    ? GOOGLE_DIALECT_MAP[options.targetDialect]
    : (options.targetLang || 'en');

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source, target, format: 'text' }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Translate error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.data.translations[0].translatedText;
}
