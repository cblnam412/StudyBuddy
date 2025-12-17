import Logger from '../utils/Logger.js';

export const errorLogger = (err, req, res, next) => {
    const context = `ErrorHandler - ${req.method} ${req.path}`;
    Logger.error(err.message || 'Lỗi server không xác định', err, context);

    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        message: err.message || 'Đã có lỗi xảy ra trên server',
    });
};

export const requestLogger = (req, res, next) => {
    Logger.info(`Request: ${req.method} ${req.originalUrl}`, 'RequestLogger');
    next(); 
};