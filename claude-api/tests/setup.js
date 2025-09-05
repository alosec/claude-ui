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
jest.setTimeout(10000); // Reduced timeout for faster test runs

// Global test hooks
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Reset mock implementations
  mockClaudeCli.testClaudeAvailability.mockResolvedValue(false);
});

afterAll(() => {
  // Cleanup after all tests
  mockClaudeCli.cleanup();
  
  // Restore console
  global.console = originalConsole;
});

export { mockClaudeCli };