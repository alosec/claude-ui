import winston from 'winston';

// Create a silent logger for tests to eliminate console noise
export const createTestLogger = (service) => {
  if (process.env.NODE_ENV === 'test') {
    return winston.createLogger({
      level: 'error',
      format: winston.format.json(),
      defaultMeta: { service },
      transports: [
        // Use a null transport that discards all logs in test mode
        new winston.transports.Stream({
          stream: {
            write: () => {} // Discard all log messages
          }
        })
      ],
      silent: true
    });
  }

  // For non-test environments, return a regular logger
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    defaultMeta: { service },
    transports: [
      new winston.transports.Console()
    ]
  });
};