/*
    path: api/drivers

*/
const { Router } = require('express');
const { validarJWT } = require('../middlewares/validar-jwt');

const { selectDriver } = require('../controllers/drivers');
const { obtenerViajeDriver } = require('../controllers/viajeDriver');
const { statusDriverArrived, statusDriverDisconnect, updateHoraEsperaFin} = require('../controllers/estadoViajes');
const router = Router();

//ALL DRIVERS AVAILABLE
router.get('/', selectDriver, );

//DRIVER RECEIVES AN INCOMING ORDER
router.get('/:_id', validarJWT, obtenerViajeDriver );
router.put('/arrived', validarJWT, statusDriverArrived );
router.put('/disconnect', validarJWT, statusDriverDisconnect);

//DRIVER UPDATE ADDRESS.horaEsperaFin
router.put('/hora-espera-fin/:_id', validarJWT, updateHoraEsperaFin );

module.exports = router;
