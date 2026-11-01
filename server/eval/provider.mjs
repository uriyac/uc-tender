// ספק file:// ל-promptfoo. קורא ל-engine().parseTender — stub בלי מפתח,
// או Claude כש-ENGINE=claude ו-ANTHROPIC_API_KEY מוגדרים. אין ממשק נפרד.

import { engine, engineName } from '../src/engine/index.js';

export default class TenderParseProvider {
  id() {
    return `uc-tender:${engineName()}`;
  }

  async callApi(prompt) {
    const parsed = await engine().parseTender(String(prompt || ''));
    return { output: JSON.stringify(parsed) };
  }
}
