/**
 * Mock JSDOM for E2E tests.
 * Supports both WebStrategy (uses Readability) and ConfluenceStrategy (uses body.textContent).
 */
export class JSDOM {
  window: {
    document: {
      html: string;
      url?: string;
      body: {
        textContent: string;
      };
    };
  };

  constructor(html: string, options?: { url?: string }) {
    // Extract text content by stripping HTML tags (simple regex for mock)
    const textContent = html
      .replace(/<[^>]*>/g, ' ')  // Replace tags with spaces
      .replace(/\s+/g, ' ')       // Normalize whitespace
      .trim();

    this.window = {
      document: {
        html,
        url: options?.url,
        body: {
          textContent,
        },
      },
    };
  }
}
