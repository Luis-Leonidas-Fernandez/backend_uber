/*
    path: api/invoice

*/
const { Router } = require( 'express');
const { createInvoicePdf, createInvoice, getInvoice, getInvoicePdf } = require( '../controllers/invoice');
const { validarJWT } = require('../middlewares/validar-jwt');

const router = Router();

router.post('/new', [validarJWT], createInvoice );
router.get('/get-invoice/:_id', [validarJWT], getInvoice);

router.get('/create-pdf-invoice', [validarJWT], createInvoicePdf);
router.get('/get-pdf-invoice/:_id', [validarJWT], getInvoicePdf);



module.exports = router;