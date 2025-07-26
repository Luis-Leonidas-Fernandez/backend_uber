/*
    path: api/travel-history

*/
const { Router } = require('express');
const { validarJWT } = require('../middlewares/validar-jwt');
const { getTravelsDriver } = require('../controllers/travelHistory');
const router = Router();


//get travels from one driver
router.get('/driver/:_id', validarJWT,  getTravelsDriver);

module.exports = router;
