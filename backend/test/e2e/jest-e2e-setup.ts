// Increase Jest timeout for container startup
jest.setTimeout(120000);

// Suppress console.log during tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  };
}
