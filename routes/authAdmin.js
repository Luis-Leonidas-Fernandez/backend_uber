/*
    path: api/loginadmin

*/
const { Router } = require( 'express');
const { check } = require( 'express-validator');

const { crearAdmin, loginAdmin, renewTokenAdmin } = require( '../controllers/authAdmin');
const { validarCampos } = require( '../middlewares/validar-campos');
const { validarJWT } = require( '../middlewares/validar-jwt');
const { adminRateLimit, registerRateLimit, loginAttemptLogger, suspiciousActivityDetector } = require('../middlewares/rateLimiter');


const router = Router();



router.post('/new', [
    registerRateLimit, // Rate limiting para registro de admin
    check('nombre', 'El nombre es obligatorio').not().isEmpty(),
    check('password', 'La contraseña es obligatoria').not().isEmpty(),
    check('email', 'El correo es obligatorio').isEmail(),
    validarCampos
], crearAdmin);



router.post('/', [
    adminRateLimit, // Rate limiting más estricto para admin
    loginAttemptLogger, // Log de intentos de login de admin
    suspiciousActivityDetector, // Detección de actividad sospechosa
    check('password', 'La contraseña es obligatoria').not().isEmpty(),
    check('email', 'El correo es obligatorio').isEmail(),
], loginAdmin);

router.get('/renew', validarJWT, renewTokenAdmin);

module.exports = router;
