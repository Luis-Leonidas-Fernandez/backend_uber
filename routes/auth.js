/*
    path: api/login

*/
const { Router } = require( 'express');
const { check } = require( 'express-validator');

const { crearUsuario, login, renewToken } = require( '../controllers/auth');
const { validarCampos } = require( '../middlewares/validar-campos');
const { validarJWT } = require( '../middlewares/validar-jwt');
const { authRateLimit, registerRateLimit, loginAttemptLogger, suspiciousActivityDetector } = require('../middlewares/rateLimiter');


const router = Router();



router.post('/new', [
    registerRateLimit, // Rate limiting para registro
    check('nombre', 'El nombre es obligatorio').not().isEmpty(),
    check('password', 'La contraseña es obligatoria').not().isEmpty(),
    check('email', 'El correo es obligatorio').isEmail(),
    validarCampos
], crearUsuario);



router.post('/', [
    authRateLimit, // Rate limiting para login
    loginAttemptLogger, // Log de intentos de login
    suspiciousActivityDetector, // Detección de actividad sospechosa
    check('password', 'La contraseña es obligatoria').not().isEmpty(),
    check('email', 'El correo es obligatorio').isEmail(),
], login);

router.get('/renew', validarJWT, renewToken);

module.exports = router;