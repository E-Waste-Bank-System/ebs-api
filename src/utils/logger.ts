import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [new transports.Console()],
});

export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;