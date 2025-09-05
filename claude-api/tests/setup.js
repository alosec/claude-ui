import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

// Suppress console outputs during tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock child_process globally for all tests
jest.unstable_mockModule('child_process', () => ({
  spawn: jest.fn()
}));

// Mock Claude CLI for tests
const mockClaudeCli = {
  executeCommand: jest.fn(),
  killProcess: jest.fn(),
  testClaudeAvailability: jest.fn().mockResolvedValue(false), // Default to unavailable in tests
  getProcessStats: jest.fn(),
  createConversation: jest.fn(),
  continueConversation: jest.fn(),
  cleanup: jest.fn(),
  buildClaudeArgs: jest.fn()
};

// Setup global test timeout
jest.setTimeout(15000); // Extended timeout for integration tests

// Global test hooks
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Reset mock implementations
  mockClaudeCli.testClaudeAvailability.mockResolvedValue(false);
});

afterEach(async () => {
  // Clear any pending timers after each test
  jest.clearAllTimers();
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  
  // Small delay to allow async cleanup
  await new Promise(resolve => setTimeout(resolve, 10));
});

afterAll(async () => {
  // Cleanup after all tests
  mockClaudeCli.cleanup();
  
  // Clear any pending timers
  jest.clearAllTimers();
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  // Give time for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Restore console
  global.console = originalConsole;
});

export { mockClaudeCli };