/*
    path: api/logindriver

*/
const { Router } = require('express');
const { check } = require('express-validator');

const { crearDriver, loginDriver, renewTokenDriver } = require('../controllers/authDriver');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const upload = require('../middlewares/upload');

const router = Router();



router.post('/newdriver',
    upload.fields([
      { name: 'fotoFrente', maxCount: 1 },
      { name: 'fotoDorso', maxCount: 1 }
    ]),
    [
      check('email', 'El correo es obligatorio').isEmail(),
      check('password', 'La contraseña es obligatoria').not().isEmpty(),
      check('nombre', 'El nombre es obligatorio').not().isEmpty(),
      check('apellido', 'El apelido es obligatorio').not().isEmpty(),
      check('nacimiento', 'La fecha Nacimiento es obligatoria').not().isEmpty(),
      check('domicilio', 'El domicilio es obligatorio').not().isEmpty(),
      check('vehiculo', 'El vehiculo es obligatorio').not().isEmpty(),
      check('modelo', 'El modelo es obligatorio').not().isEmpty(),
      check('patente', 'La patente es obligatoria').not().isEmpty(),
      check('licencia', 'La licencia es obligatoria').not().isEmpty(),
      validarCampos
    ],
    crearDriver
  );



router.post('/', [
    check('password', 'La contraseña es obligatoria').not().isEmpty(),
    check('email', 'El correo es obligatorio').isEmail(),
], loginDriver);

router.get('/renewdriver', validarJWT, renewTokenDriver);

module.exports = router;