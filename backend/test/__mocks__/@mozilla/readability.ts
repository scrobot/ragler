export class Readability {
  private document: unknown;

  constructor(document: unknown) {
    this.document = document;
  }

  parse() {
    return {
      title: 'Mocked Article Title',
      textContent: 'Mocked article content for E2E testing. This is sufficient text.',
      excerpt: 'Mocked excerpt',
      byline: 'Test Author',
      siteName: 'Test Site',
      lang: 'en',
      publishedTime: null,
      length: 100,
    };
  }
}
