const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Rate limiting específico para endpoints de autenticación
const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 intentos por IP cada 15 minutos
    message: {
        ok: false,
        msg: 'Demasiados intentos de login desde esta IP, intenta de nuevo en 15 minutos'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        res.status(429).json({
            ok: false,
            msg: 'Demasiados intentos de login desde esta IP, intenta de nuevo en 15 minutos',
            retryAfter: Math.round(15 * 60) // 15 minutos en segundos
        });
    },
    // Función para identificar al usuario (por IP por defecto)
    keyGenerator: (req) => {
        // Usar IP del usuario como clave única
        return req.ip || req.connection.remoteAddress;
    },
    // Saltar rate limiting si es un login exitoso
    skipSuccessfulRequests: true,
    // Saltar rate limiting si hay un error interno del servidor
    skipFailedRequests: false
});

// Rate limiting más estricto para administradores
const adminRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 3, // máximo 3 intentos por IP cada 15 minutos (más estricto)
    message: {
        ok: false,
        msg: 'Demasiados intentos de login de administrador desde esta IP, intenta de nuevo en 15 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            ok: false,
            msg: 'Demasiados intentos de login de administrador desde esta IP, intenta de nuevo en 15 minutos',
            retryAfter: Math.round(15 * 60)
        });
    },
    keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress;
    },
    skipSuccessfulRequests: true,
    skipFailedRequests: false
});

// Rate limiting para endpoints de registro (menos estricto)
const registerRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10, // máximo 10 registros por IP cada hora
    message: {
        ok: false,
        msg: 'Demasiados intentos de registro desde esta IP, intenta de nuevo en 1 hora'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            ok: false,
            msg: 'Demasiados intentos de registro desde esta IP, intenta de nuevo en 1 hora',
            retryAfter: Math.round(60 * 60) // 1 hora en segundos
        });
    },
    keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress;
    },
    skipSuccessfulRequests: true,
    skipFailedRequests: false
});

// Rate limiting progresivo - aumenta el tiempo de espera con más intentos
const progressiveRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: (req) => {
        // Obtener número de intentos previos (esto requeriría implementar tracking)
        // Por ahora, usar límite fijo
        return 5;
    },
    message: {
        ok: false,
        msg: 'Demasiados intentos de login, el tiempo de espera aumentará con cada intento fallido'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        const attempts = req.rateLimit?.current || 0;
        const delayMinutes = Math.min(attempts * 5, 60); // Máximo 1 hora
        
        res.status(429).json({
            ok: false,
            msg: `Demasiados intentos de login. Espera ${delayMinutes} minutos antes del siguiente intento`,
            retryAfter: Math.round(delayMinutes * 60)
        });
    },
    keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress;
    },
    skipSuccessfulRequests: true,
    skipFailedRequests: false
});

// Middleware para logging de intentos de login
const loginAttemptLogger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const email = req.body?.email || 'No email provided';
    
    console.log(`[${timestamp}] Login attempt - IP: ${ip}, Email: ${email}, User-Agent: ${userAgent}`);
    
    next();
};

// Middleware para detectar patrones sospechosos
const suspiciousActivityDetector = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';
    
    // Detectar User-Agents sospechosos o faltantes
    if (!userAgent || userAgent === 'Unknown' || userAgent.length < 10) {
        console.warn(`[SUSPICIOUS] Login attempt with unusual User-Agent from IP: ${ip}`);
    }
    
    // Detectar emails obviamente falsos
    const email = req.body?.email || '';
    if (email && (email.includes('test') || email.includes('fake') || email.includes('admin@admin'))) {
        console.warn(`[SUSPICIOUS] Login attempt with suspicious email: ${email} from IP: ${ip}`);
    }
    
    next();
};

module.exports = {
    authRateLimit,
    adminRateLimit,
    registerRateLimit,
    progressiveRateLimit,
    loginAttemptLogger,
    suspiciousActivityDetector
};
