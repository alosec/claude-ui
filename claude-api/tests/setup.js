import { jest } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Mock Claude CLI for tests
const mockClaudeCli = {
  executeCommand: jest.fn(),
  killProcess: jest.fn(),
  testClaudeAvailability: jest.fn(),
  getProcessStats: jest.fn(),
  createConversation: jest.fn(),
  continueConversation: jest.fn(),
  cleanup: jest.fn()
};

// Setup global test timeout
jest.setTimeout(30000);

// Setup before/after hooks
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
});

afterAll(() => {
  // Cleanup after all tests
  mockClaudeCli.cleanup();
});

export { mockClaudeCli };