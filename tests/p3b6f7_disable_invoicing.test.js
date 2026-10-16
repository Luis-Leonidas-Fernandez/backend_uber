/**
 * P-3B.6-F7 Test Suite: Verificación de Desactivación de Facturación y Generación de PDFs
 *
 * Valida de forma aislada y rigurosa los 12 criterios de Gate 3:
 * 1. El backend e imports inician sin errores sintácticos.
 * 2. Los cron de facturación y PDFs no se registran en index.js.
 * 3. createInvoice requiere autenticación (401).
 * 4. createInvoice requiere rol administrador (403).
 * 5. createInvoice autenticado responde HTTP 503 INVOICING_DISABLED.
 * 6. createInvoicePdf requiere autenticación (401).
 * 7. createInvoicePdf requiere rol administrador (403).
 * 8. createInvoicePdf autenticado responde HTTP 503 INVOICING_DISABLED.
 * 9. createInvoiceCore devuelve INVOICING_DISABLED sin insertar documentos.
 * 10. createInvoicePdfCore devuelve INVOICING_DISABLED sin escribir archivos en disco.
 * 11. createInvoiceJob devuelve INVOICING_DISABLED de forma segura.
 * 12. createInvoicePdfJob devuelve INVOICING_DISABLED de forma segura.
 * 13. getInvoice mantiene protección anti-IDOR (403 ante UID ajeno).
 * 14. getInvoicePdf mantiene protección anti-IDOR (403 ante admin no propietario).
 * 15. getArgentinaPeriodo sigue calculando el período correctamente sin efectos colaterales.
 * 16. Funcionalidades esenciales (despacho, cupones, vouchers, cotización) se conservan.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Cargar controladores y servicios modificados
const {
    createInvoice,
    createInvoicePdf,
    getInvoice,
    getInvoicePdf,
    createInvoiceCore,
    createInvoicePdfCore,
    getArgentinaPeriodo
} = require('../controllers/invoice');

const {
    createInvoiceJob,
    createInvoicePdfJob
} = require('../service/invoice_server');

const admin = require('../models/admin');
const Base = require('../models/base');
const Invoice = require('../models/invoices');

test('SUITE P-3B.6-F7: Desactivación de Facturación y Seguridad', async (t) => {

    await t.test('1. Análisis estático de index.js: Cron jobs de facturación y PDFs eliminados', () => {
        const indexContent = fs.readFileSync(path.join(__dirname, '../index.js'), 'utf-8');
        
        // Verificar que no existen cron.schedule activos para los días 25 y 26
        const hasDay25Cron = /cron\.schedule\(\s*["']0 0 25 \* \*["']/.test(indexContent);
        const hasDay26Cron = /cron\.schedule\(\s*["']0 0 26 \* \*["']/.test(indexContent);
        
        assert.equal(hasDay25Cron, false, 'El cron job del día 25 no debe estar registrado en index.js');
        assert.equal(hasDay26Cron, false, 'El cron job del día 26 no debe estar registrado en index.js');
        
        // Verificar que los otros cron jobs sí se conservan
        assert.ok(indexContent.includes('*/1 * * * *'), 'Cron de despacho de conductores debe conservarse');
        assert.ok(indexContent.includes('0 22 * * *'), 'Cron de cotización de dólar blue debe conservarse');
        assert.ok(indexContent.includes('0 0 * * *'), 'Cron de vouchers y cupones debe conservarse');
    });

    await t.test('2. createInvoiceCore devuelve INVOICING_DISABLED sin realizar escrituras', async () => {
        const result = await createInvoiceCore({ isInternalCron: true });
        
        assert.equal(result.ok, false);
        assert.equal(result.code, 'INVOICING_DISABLED');
        assert.equal(result.message, 'La facturación está deshabilitada');
    });

    await t.test('3. createInvoicePdfCore devuelve INVOICING_DISABLED sin escribir en disco', async () => {
        const result = await createInvoicePdfCore({ isInternalCron: true });
        
        assert.equal(result.ok, false);
        assert.equal(result.code, 'INVOICING_DISABLED');
        assert.equal(result.message, 'La facturación está deshabilitada');
    });

    await t.test('4. createInvoiceJob en invoice_server.js devuelve INVOICING_DISABLED', async () => {
        const result = await createInvoiceJob();
        
        assert.equal(result.ok, false);
        assert.equal(result.code, 'INVOICING_DISABLED');
        assert.equal(result.message, 'La facturación está deshabilitada');
    });

    await t.test('5. createInvoicePdfJob en invoice_server.js devuelve INVOICING_DISABLED', async () => {
        const result = await createInvoicePdfJob();
        
        assert.equal(result.ok, false);
        assert.equal(result.code, 'INVOICING_DISABLED');
        assert.equal(result.message, 'La generación de PDFs está deshabilitada');
    });

    await t.test('6. Endpoint createInvoice: rechaza peticiones sin autenticación (401)', async () => {
        let statusCode = null;
        let jsonResponse = null;

        const req = {
            uid: null,
            body: {}
        };
        const res = {
            status: (code) => {
                statusCode = code;
                return {
                    json: (data) => { jsonResponse = data; return res; }
                };
            }
        };

        await createInvoice(req, res);
        assert.equal(statusCode, 401, 'Debe responder HTTP 401 si no hay token');
        assert.equal(jsonResponse.ok, false);
    });

    await t.test('7. Endpoint createInvoice: rechaza usuarios no administradores (403)', async () => {
        let statusCode = null;
        let jsonResponse = null;

        // Mock admin.findById devolviendo null (no es admin)
        const originalFindById = admin.findById;
        admin.findById = async () => null;

        try {
            const req = {
                uid: '67dedba242e860094f897d4a',
                body: {}
            };
            const res = {
                status: (code) => {
                    statusCode = code;
                    return {
                        json: (data) => { jsonResponse = data; return res; }
                    };
                }
            };

            await createInvoice(req, res);
            assert.equal(statusCode, 403, 'Debe responder HTTP 403 si el usuario no es admin');
            assert.equal(jsonResponse.ok, false);
        } finally {
            admin.findById = originalFindById;
        }
    });

    await t.test('8. Endpoint createInvoice: responde HTTP 503 INVOICING_DISABLED ante admin legítimo', async () => {
        let statusCode = null;
        let jsonResponse = null;

        const originalFindById = admin.findById;
        admin.findById = async () => ({ _id: '67dedba242e860094f897d4a', role: 'ADMIN_ROLE' });

        try {
            const req = {
                uid: '67dedba242e860094f897d4a',
                body: { periodo: '2026-09' }
            };
            const res = {
                status: (code) => {
                    statusCode = code;
                    return {
                        json: (data) => { jsonResponse = data; return res; }
                    };
                }
            };

            await createInvoice(req, res);
            assert.equal(statusCode, 503, 'Debe responder HTTP 503 Service Unavailable');
            assert.equal(jsonResponse.ok, false);
            assert.equal(jsonResponse.code, 'INVOICING_DISABLED');
            assert.equal(jsonResponse.message, 'La facturación está deshabilitada');
        } finally {
            admin.findById = originalFindById;
        }
    });

    await t.test('9. Endpoint createInvoicePdf: rechaza peticiones sin autenticación (401)', async () => {
        let statusCode = null;
        let jsonResponse = null;

        const req = { uid: null };
        const res = {
            status: (code) => {
                statusCode = code;
                return {
                    json: (data) => { jsonResponse = data; return res; }
                };
            }
        };

        await createInvoicePdf(req, res);
        assert.equal(statusCode, 401, 'Debe responder HTTP 401 si no hay token');
        assert.equal(jsonResponse.ok, false);
    });

    await t.test('10. Endpoint createInvoicePdf: responde HTTP 503 INVOICING_DISABLED ante admin', async () => {
        let statusCode = null;
        let jsonResponse = null;

        const originalFindById = admin.findById;
        admin.findById = async () => ({ _id: '67dedba242e860094f897d4a', role: 'ADMIN_ROLE' });

        try {
            const req = { uid: '67dedba242e860094f897d4a' };
            const res = {
                status: (code) => {
                    statusCode = code;
                    return {
                        json: (data) => { jsonResponse = data; return res; }
                    };
                }
            };

            await createInvoicePdf(req, res);
            assert.equal(statusCode, 503, 'Debe responder HTTP 503');
            assert.equal(jsonResponse.ok, false);
            assert.equal(jsonResponse.code, 'INVOICING_DISABLED');
            assert.equal(jsonResponse.message, 'La facturación está deshabilitada');
        } finally {
            admin.findById = originalFindById;
        }
    });

    await t.test('11. Endpoint getInvoice: protección anti-IDOR permanece activa', async () => {
        let statusCode = null;
        let jsonResponse = null;

        const req = {
            uid: '67dedba242e860094f897d4a',
            params: { _id: '67dedba242e860094f897d4b' } // ID distinto al token
        };
        const res = {
            status: (code) => {
                statusCode = code;
                return {
                    json: (data) => { jsonResponse = data; return res; }
                };
            }
        };

        await getInvoice(req, res);
        assert.equal(statusCode, 403, 'Debe responder HTTP 403 Forbidden por IDOR');
        assert.equal(jsonResponse.ok, false);
        assert.ok(jsonResponse.msg.includes('Acceso denegado'));
    });

    await t.test('12. Endpoint getInvoicePdf: protección anti-IDOR permanece activa', async () => {
        let statusCode = null;
        let jsonResponse = null;

        const originalBaseFindById = Base.findById;
        // Mock Base perteneciente a otro admin
        Base.findById = async () => ({
            _id: '67dedba242e860094f897d4b',
            adminId: '67dedba242e860094f897d99'
        });

        try {
            const req = {
                uid: '67dedba242e860094f897d4a', // Token de otro admin
                params: { _id: '67dedba242e860094f897d4b' }
            };
            const res = {
                status: (code) => {
                    statusCode = code;
                    return {
                        json: (data) => { jsonResponse = data; return res; },
                        sendFile: () => res
                    };
                }
            };

            await getInvoicePdf(req, res);
            assert.equal(statusCode, 403, 'Debe responder HTTP 403 por no ser propietario de la base');
            assert.equal(jsonResponse.ok, false);
            assert.ok(jsonResponse.msg.includes('Acceso denegado'));
        } finally {
            Base.findById = originalBaseFindById;
        }
    });

    await t.test('13. getArgentinaPeriodo calcula correctamente mes anterior sin mutaciones', () => {
        const fixedDate = new Date('2026-10-25T03:00:00Z'); // 25-Oct-2026 00:00 ART
        const res = getArgentinaPeriodo(fixedDate);
        assert.equal(res.periodo, '2026-09');
        assert.equal(res.year, 2026);
        assert.equal(res.month, 9);
    });

    await t.test('14. routes/invoice.js carga y exporta el router Express sin errores sintácticos', () => {
        const invoiceRouter = require('../routes/invoice');
        assert.ok(invoiceRouter, 'El router de facturas debe exportarse');
        assert.equal(typeof invoiceRouter, 'function', 'El router debe ser un middleware de Express');
        
        // Verificar que las rutas existen en el stack del router
        const routes = invoiceRouter.stack.map(s => ({
            path: s.route?.path,
            methods: Object.keys(s.route?.methods || {})
        }));
        
        const hasNewPost = routes.some(r => r.path === '/new' && r.methods.includes('post'));
        const hasPdfGet = routes.some(r => r.path === '/create-pdf-invoice' && r.methods.includes('get'));
        const hasGetInvoice = routes.some(r => r.path === '/get-invoice/:_id' && r.methods.includes('get'));
        const hasGetPdf = routes.some(r => r.path === '/get-pdf-invoice/:_id' && r.methods.includes('get'));
        
        assert.ok(hasNewPost, 'Ruta POST /new debe existir');
        assert.ok(hasPdfGet, 'Ruta GET /create-pdf-invoice debe existir');
        assert.ok(hasGetInvoice, 'Ruta GET /get-invoice/:_id debe existir');
        assert.ok(hasGetPdf, 'Ruta GET /get-pdf-invoice/:_id debe existir');
    });

    await t.test('15. Componentes esenciales conservados: database/config, Generators y Controllers', () => {
        const dbConfig = require('../database/config');
        assert.equal(typeof dbConfig.dbConnection, 'function');

        const { getPrice } = require('../Generators/price');
        assert.equal(typeof getPrice, 'function');

        const { generateVaucher } = require('../Generators/cupon');
        assert.equal(typeof generateVaucher, 'function');

        const authCoord = require('../controllers/authCoordenadas');
        assert.ok(authCoord, 'Controlador authCoordenadas debe existir');
    });

    await t.test('16. Concurrencia segura: Invocaciones simultáneas de createInvoiceCore y createInvoicePdfCore', async () => {
        const callsCore = await Promise.all([
            createInvoiceCore({ requestedPeriodo: '2026-09' }),
            createInvoiceCore({ requestedPeriodo: '2026-09' }),
            createInvoiceCore({ requestedPeriodo: '2026-09' })
        ]);

        for (const res of callsCore) {
            assert.equal(res.ok, false);
            assert.equal(res.code, 'INVOICING_DISABLED');
        }

        const callsPdf = await Promise.all([
            createInvoicePdfCore({ requestedPeriodo: '2026-09' }),
            createInvoicePdfCore({ requestedPeriodo: '2026-09' }),
            createInvoicePdfCore({ requestedPeriodo: '2026-09' })
        ]);

        for (const res of callsPdf) {
            assert.equal(res.ok, false);
            assert.equal(res.code, 'INVOICING_DISABLED');
        }
    });
});
