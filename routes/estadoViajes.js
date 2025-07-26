/*
    path: api/status

*/
const { Router } = require('express');
const { validarJWTDRIVER } = require('../middlewares/validar-jwt-driver');
const { statusUpdate, cancelTravel, removeAddress } = require('../controllers/estadoViajes');



const router = Router();

//update the driver's order field
router.put('/update',validarJWTDRIVER, statusUpdate );
//update to cancel travel
router.put('/cancel-travel',validarJWTDRIVER,  cancelTravel);
//update to finish travel and save in history travel
router.put('/remove/address', validarJWTDRIVER, removeAddress);

module.exports = router;
