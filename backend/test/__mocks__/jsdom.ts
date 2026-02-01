export class JSDOM {
  window: {
    document: unknown;
  };

  constructor(html: string, options?: { url?: string }) {
    this.window = {
      document: { html, url: options?.url },
    };
  }
}
