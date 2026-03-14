/**
 * Jest setup file - runs before all tests
 * Mocks modules with problematic ESM dependencies
 */

// Mock document-structure to provide shared types in tests
jest.mock('@modules/llm/parsers/document-structure', () => {
  // Recursive flatten implementation
  const flattenSections = (sections: any[]): any[] => {
    const result: any[] = [];
    for (const section of sections) {
      result.push(section);
      if (section.children && section.children.length > 0) {
        result.push(...flattenSections(section.children));
      }
    }
    return result;
  };

  const buildHeadingPath = (section: any, allSections: any[]): string[] => {
    const path: string[] = [];
    let current = section;

    // Build path by traversing up to find parents
    while (current) {
      if (current.heading) {
        path.unshift(current.heading);
      }
      // Find parent by checking if current is a child of any section
      current = allSections.find(s =>
        s.children && s.children.some((c: any) => c === current)
      );
    }

    return path;
  };

  return {
    buildHeadingPath,
    flattenSections,
  };
});
