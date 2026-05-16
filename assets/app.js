(function () {
  'use strict';

  const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>'"]+|\b[A-Z0-9.-]+\.[A-Z]{2,}(?:\/[^\s<>'"]*)?/gi;
  const PHONE_PATTERN = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g;

  function normalizeLineBreaks(text) {
    return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  function cleanUrl(url) {
    return String(url || '').replace(/[.,;:!?)]$/g, '');
  }

  function uniquePreserveOrder(items, options = {}) {
    const seen = new Set();
    const output = [];
    items.forEach((item) => {
      const value = options.trim === false ? String(item) : String(item).trim();
      if (!value && options.keepEmpty !== true) return;
      const key = options.caseSensitive === false ? value.toLowerCase() : value;
      if (!seen.has(key)) {
        seen.add(key);
        output.push(value);
      }
    });
    return output;
  }

  function extractEmails(text) {
    const matches = String(text || '').match(EMAIL_PATTERN) || [];
    return uniquePreserveOrder(matches, { caseSensitive: false });
  }

  function extractPhoneNumbers(text) {
    const matches = String(text || '').match(PHONE_PATTERN) || [];
    return uniquePreserveOrder(matches.map((value) => value.trim()), { caseSensitive: true });
  }

  function extractUrls(text) {
    const matches = String(text || '').match(URL_PATTERN) || [];
    return uniquePreserveOrder(matches.map(cleanUrl), { caseSensitive: false });
  }

  function removeDuplicateLines(text) {
    const lines = normalizeLineBreaks(text).split('\n').map((line) => line.trim()).filter(Boolean);
    return uniquePreserveOrder(lines, { caseSensitive: true }).join('\n');
  }

  function sortLines(text) {
    return normalizeLineBreaks(text)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }))
      .join('\n');
  }

  function removeEmptyLines(text) {
    return normalizeLineBreaks(text)
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .join('\n');
  }

  function convertCase(text, mode) {
    const value = String(text || '');
    if (mode === 'upper') return value.toUpperCase();
    if (mode === 'lower') return value.toLowerCase();
    if (mode === 'sentence') {
      const lower = value.toLowerCase();
      return lower.replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (match) => match.toUpperCase());
    }
    if (mode === 'title') {
      const smallWords = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'vs', 'via']);
      return value.toLowerCase().replace(/\b[\p{L}\p{N}'-]+\b/gu, (word, index) => {
        if (index !== 0 && smallWords.has(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      });
    }
    return value;
  }

  function wordStats(text) {
    const value = String(text || '');
    const trimmed = value.trim();
    const words = trimmed ? trimmed.match(/\b[\p{L}\p{N}'-]+\b/gu) || [] : [];
    const characters = value.length;
    const charactersNoSpaces = value.replace(/\s/g, '').length;
    const lines = value.length ? normalizeLineBreaks(value).split('\n').length : 0;
    return { words: words.length, characters, charactersNoSpaces, lines };
  }

  function stripHtml(text) {
    const value = String(text || '');
    const doc = new DOMParser().parseFromString(value, 'text/html');
    return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  }

  function removeExtraSpaces(text) {
    return String(text || '')
      .replace(/[\t ]+/g, ' ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/([([{])\s+/g, '$1')
      .replace(/\s+([)\]}])/g, '$1')
      .replace(/\n\s+/g, '\n')
      .trim();
  }

  function getEl(id) {
    return document.getElementById(id);
  }

  function setStatus(message, type) {
    const status = getEl('status-message');
    if (!status) return;
    status.textContent = message || '';
    status.className = type ? `status ${type}` : 'status';
  }

  function getInputValue() {
    const input = getEl('tool-input');
    return input ? input.value : '';
  }

  function setOutputValue(value) {
    const output = getEl('tool-output');
    if (output) output.value = value;
  }

  function handleToolAction(action) {
    const input = getInputValue();
    let result = '';
    let count = 0;

    switch (action) {
      case 'extract-emails': {
        const emails = extractEmails(input);
        result = emails.join('\n');
        count = emails.length;
        setStatus(count ? `Found ${count} unique email address${count === 1 ? '' : 'es'}.` : 'No email addresses found.', count ? 'success' : 'neutral');
        break;
      }
      case 'extract-phones': {
        const phones = extractPhoneNumbers(input);
        result = phones.join('\n');
        count = phones.length;
        setStatus(count ? `Found ${count} unique phone number${count === 1 ? '' : 's'}.` : 'No phone numbers found.', count ? 'success' : 'neutral');
        break;
      }
      case 'extract-urls': {
        const urls = extractUrls(input);
        result = urls.join('\n');
        count = urls.length;
        setStatus(count ? `Found ${count} unique URL${count === 1 ? '' : 's'}.` : 'No URLs found.', count ? 'success' : 'neutral');
        break;
      }
      case 'remove-duplicates': {
        result = removeDuplicateLines(input);
        const before = normalizeLineBreaks(input).split('\n').filter((line) => line.trim()).length;
        const after = result ? result.split('\n').length : 0;
        setStatus(`Removed ${Math.max(before - after, 0)} duplicate line${Math.max(before - after, 0) === 1 ? '' : 's'}.`, 'success');
        break;
      }
      case 'sort-lines': {
        result = sortLines(input);
        setStatus('Lines sorted alphabetically.', 'success');
        break;
      }
      case 'remove-empty-lines': {
        result = removeEmptyLines(input);
        setStatus('Empty lines removed.', 'success');
        break;
      }
      case 'strip-html': {
        result = stripHtml(input);
        setStatus('HTML tags removed.', 'success');
        break;
      }
      case 'remove-extra-spaces': {
        result = removeExtraSpaces(input);
        setStatus('Extra spaces cleaned.', 'success');
        break;
      }
      default:
        setStatus('Tool action not recognized.', 'error');
        return;
    }

    setOutputValue(result);
  }

  function updateWordCounter() {
    const input = getInputValue();
    const stats = wordStats(input);
    const output = [
      `Words: ${stats.words}`,
      `Characters: ${stats.characters}`,
      `Characters without spaces: ${stats.charactersNoSpaces}`,
      `Lines: ${stats.lines}`,
    ].join('\n');
    setOutputValue(output);
    setStatus('Counts updated.', 'success');
  }

  function updateCasePreview(mode) {
    const selected = mode || (document.querySelector('input[name="case-mode"]:checked') || {}).value || 'upper';
    setOutputValue(convertCase(getInputValue(), selected));
    setStatus('Text case converted.', 'success');
  }

  function copyOutput() {
    const output = getEl('tool-output');
    if (!output || !output.value) {
      setStatus('Nothing to copy yet.', 'neutral');
      return;
    }
    navigator.clipboard.writeText(output.value).then(() => {
      setStatus('Copied to clipboard.', 'success');
    }).catch(() => {
      output.focus();
      output.select();
      setStatus('Select the output and copy it manually.', 'neutral');
    });
  }

  function clearTool() {
    const input = getEl('tool-input');
    if (input) input.value = '';
    setOutputValue('');
    setStatus('', 'neutral');
  }

  function init() {
    const body = document.body;
    const tool = body.getAttribute('data-tool');
    const input = getEl('tool-input');
    const runButton = getEl('run-tool');
    const copyButton = getEl('copy-output');
    const clearButton = getEl('clear-tool');

    if (runButton) {
      runButton.addEventListener('click', () => handleToolAction(runButton.getAttribute('data-action')));
    }
    if (copyButton) copyButton.addEventListener('click', copyOutput);
    if (clearButton) clearButton.addEventListener('click', clearTool);

    if (tool === 'word-counter' && input) {
      input.addEventListener('input', updateWordCounter);
      updateWordCounter();
    }

    if (tool === 'text-case-converter' && input) {
      const radios = document.querySelectorAll('input[name="case-mode"]');
      radios.forEach((radio) => radio.addEventListener('change', () => updateCasePreview(radio.value)));
      input.addEventListener('input', () => updateCasePreview());
      const caseButton = getEl('convert-case');
      if (caseButton) caseButton.addEventListener('click', () => updateCasePreview());
      updateCasePreview();
    }
  }

  const api = {
    extractEmails,
    extractPhoneNumbers,
    extractUrls,
    removeDuplicateLines,
    sortLines,
    removeEmptyLines,
    convertCase,
    wordStats,
    stripHtml,
    removeExtraSpaces,
    _uniquePreserveOrder: uniquePreserveOrder,
  };

  if (typeof window !== 'undefined') {
    window.TextCleanTools = api;
    document.addEventListener('DOMContentLoaded', init);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
