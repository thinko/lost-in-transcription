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

export class Glossary {
  constructor(entries = [], enabled = true) {
    this.entries = entries;
    this.enabled = enabled;
  }

  static async load() {
    const data = await chrome.storage.sync.get(['glossary', 'glossaryEnabled']);
    return new Glossary(data.glossary || [], data.glossaryEnabled !== false);
  }

  async save() {
    await chrome.storage.sync.set({
      glossary: this.entries,
      glossaryEnabled: this.enabled,
    });
  }

  apply(text) {
    if (!this.enabled || !this.entries?.length) return text;
    let result = text;
    for (const entry of this.entries) {
      if (!entry.enabled || !entry.pattern) continue;
      const escaped = entry.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(escaped, 'gi'), entry.replacement);
    }
    return result;
  }

  hash() {
    const enabledEntries = this.entries?.filter((e) => e.enabled) || [];
    if (!enabledEntries.length) return '0';
    const sig = enabledEntries
      .map((e) => `${e.pattern}>${e.replacement}`)
      .join('|');
    let h = 0;
    for (let i = 0; i < sig.length; i++) {
      h = ((h << 5) - h + sig.charCodeAt(i)) | 0;
    }
    return h.toString(36);
  }

  get terms() {
    return [
      ...new Set(
        (this.entries || []).filter((e) => e.enabled).map((e) => e.replacement)
      ),
    ];
  }

  addEntry(pattern, replacement) {
    this.entries.push({ pattern, replacement, enabled: true });
  }

  removeEntry(index) {
    this.entries.splice(index, 1);
  }

  toggleEntry(index) {
    if (this.entries[index]) {
      this.entries[index].enabled = !this.entries[index].enabled;
    }
  }

  findSourcesFor(text) {
    return this.entries
      .map((e, i) => ({ ...e, index: i }))
      .filter(
        (e) => e.replacement.toLowerCase() === (text || '').toLowerCase()
      );
  }

  groupedByReplacement() {
    const groups = new Map();
    this.entries.forEach((entry, index) => {
      const key = entry.replacement;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({
        pattern: entry.pattern,
        enabled: entry.enabled,
        index,
      });
    });
    return [...groups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([replacement, entries]) => ({ replacement, entries }));
  }
}
