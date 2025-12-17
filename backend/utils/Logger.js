class Logger {
    constructor() { }

    _formatMessage(level, message, context) {
        const timestamp = new Date().toISOString();
        return `[${level}] - ${timestamp} - [${context}] - ${message}`;
    }

    info(message, context = 'App') {
        const logMessage = this._formatMessage('INFO', message, context);
        console.log(logMessage);
    }

    warn(message, context = 'App') {
        const logMessage = this._formatMessage('WARN', message, context);
        console.warn(logMessage);
    }

    error(message, error, context = 'App') {
        const logMessage = this._formatMessage('ERROR', message, context);
        console.error(logMessage);

        if (error && error instanceof Error) {
            console.error(error.stack || error);
        }
    }
}

const loggerInstance = new Logger();
export default loggerInstance;
