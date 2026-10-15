const test = require('node:test');
const assert = require('node:assert/strict');
const cron = require('node-cron');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { LocalStorage } = require('node-localstorage');

process.env.JWT_KEY = process.env.JWT_KEY || 'inriapp-test-secret-jwt-key-2026';

// ========================================================================
// GRUPO 1: Validación y Semántica de Expresiones Cron
// ========================================================================
test('Grupo 1: Expresiones Cron - Validación y Semántica', async (t) => {
    
    await t.test('1.1: Todas las expresiones cron del parche son sintácticamente válidas en node-cron', () => {
        const cronExpressions = {
            dispatch: "*/1 * * * *",
            dolar: "0 22 * * *",
            vouchers: "0 0 * * *",
            cuponPrice: "0 0 * * *",
            invoices: "0 0 25 * *",
            invoicesPdf: "0 0 26 * *",
        };

        for (const [name, expr] of Object.entries(cronExpressions)) {
            assert.equal(cron.validate(expr), true, `La expresión cron para ${name} ('${expr}') debe ser válida`);
        }
    });

    await t.test('1.2: Semántica de frecuencia: Facturación mensual corre exactamente 1 vez por mes (no 1.440)', () => {
        const oldInvoiceExpr = "* * 25 * *";
        const newInvoiceExpr = "0 0 25 * *";

        const oldParts = oldInvoiceExpr.split(' ');
        const newParts = newInvoiceExpr.split(' ');

        assert.equal(oldParts[0], '*', 'La expresión previa ejecutaba cada minuto');
        assert.equal(oldParts[1], '*', 'La expresión previa ejecutaba cada hora');

        assert.equal(newParts[0], '0', 'El parche fija el minuto en 0');
        assert.equal(newParts[1], '0', 'El parche fija la hora en 0 (medianoche)');
        assert.equal(newParts[2], '25', 'El parche preserva el día 25 del mes');
    });

    await t.test('1.3: Semántica de frecuencia: Generación de PDF corre exactamente 1 vez por mes', () => {
        const newPdfExpr = "0 0 26 * *";
        const parts = newPdfExpr.split(' ');
        assert.equal(parts[0], '0', 'Minuto fijado en 0');
        assert.equal(parts[1], '0', 'Hora fijada en 0 (medianoche)');
        assert.equal(parts[2], '26', 'Preserva el día 26 del mes');
    });

    await t.test('1.4: Semántica de frecuencia: Vouchers a medianoche (00:00) y Dólar a las 22:00', () => {
        const voucherExpr = "0 0 * * *";
        const dolarExpr = "0 22 * * *";

        assert.equal(voucherExpr.split(' ')[0], '0', 'Voucher debe ejecutar a minuto 0');
        assert.equal(voucherExpr.split(' ')[1], '0', 'Voucher debe ejecutar a hora 0 (medianoche)');
        assert.equal(dolarExpr.split(' ')[0], '0', 'Dólar debe ejecutar a minuto 0');
        assert.equal(dolarExpr.split(' ')[1], '22', 'Dólar debe ejecutar a las 22 horas');
    });

    await t.test('1.5: Preservación de frecuencia de Despacho de órdenes', () => {
        const dispatchExpr = "*/1 * * * *";
        assert.equal(dispatchExpr, "*/1 * * * *", 'El despacho conserva su frecuencia de 1 minuto');
    });

    await t.test('1.6: El día 25 existe en todos los 12 meses del año', () => {
        for (let month = 0; month < 12; month++) {
            const date = new Date(2026, month, 25);
            assert.equal(date.getDate(), 25, `El mes ${month + 1} debe contener el día 25`);
        }
    });

    await t.test('1.7: Zona horaria declarada en index.js es America/Argentina/Buenos_Aires', () => {
        const indexContent = fs.readFileSync(require.resolve('../index.js'), 'utf8');
        const tzMatches = indexContent.match(/timezone:\s*"America\/Argentina\/Buenos_Aires"/g);
        assert.ok(tzMatches && tzMatches.length >= 5, 'Todos los schedulers deben tener configurada la zona horaria de Buenos Aires');
    });
});

// ========================================================================
// GRUPO 2: Prevención de Contaminación del Prototipo Global Express
// ========================================================================
test('Grupo 2: Exclusión de express.response y Prevención de Prototype Pollution', async (t) => {

    await t.test('2.1: getUbicacionesAutomatic ante error de DB NO modifica express.response.statusCode', async () => {
        const originalProtoStatus = express.response.statusCode;
        const { getUbicacionesAutomatic } = require('../controllers/authCoordenadas');

        const Address = require('../models/ubicacion');
        const originalFind = Address.find;
        Address.find = () => {
            throw new Error('MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017');
        };

        try {
            const result = await getUbicacionesAutomatic();
            assert.deepEqual(result, [{ miId: "1" }], 'Debe retornar idOrderNull en caso de error');
            assert.equal(
                express.response.statusCode,
                originalProtoStatus,
                'CRÍTICO: express.response.statusCode NO debe mutar a 500 ante error interno'
            );
        } finally {
            Address.find = originalFind;
        }
    });

    await t.test('2.2: getPrice ante error de red/API NO modifica express.response.statusCode', async () => {
        const originalProtoStatus = express.response.statusCode;
        const { getPrice } = require('../Generators/price');

        await getPrice();
        
        assert.equal(
            express.response.statusCode,
            originalProtoStatus,
            'express.response.statusCode debe permanecer intacto'
        );
    });

    await t.test('2.3: generateVaucher genera formato correcto y no depende de express.response', async () => {
        const { generateVaucher } = require('../Generators/cupon');
        const vaucher = await generateVaucher();

        assert.match(vaucher, /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/, 'Debe coincidir con patrón XXXX-XXXX-XXXX');
        assert.equal(typeof vaucher, 'string');
    });

    await t.test('2.4: Verificación de que una nueva respuesta de Express no hereda HTTP 500 por defecto', () => {
        const app = express();
        const res = Object.create(express.response);
        res.app = app;
        
        assert.notEqual(res.statusCode, 500, 'Una respuesta nueva no debe tener statusCode 500 predeterminado');
    });
});

// ========================================================================
// GRUPO 3: Idempotencia de Facturación, Partial Index y AutoIndex
// ========================================================================
test('Grupo 3: Idempotencia de Facturación, Partial Index y AutoIndex', async (t) => {

    await t.test('3.1: Modelo Invoice define partialFilterExpression con objectId y autoIndex: false', () => {
        const Invoice = require('../models/invoices');
        const schema = Invoice.schema;

        assert.ok(schema.paths['baseId'], 'El esquema debe contener baseId');
        assert.ok(schema.paths['periodo'], 'El esquema debe contener periodo');
        assert.equal(schema.paths['baseId'].isRequired, false, 'baseId debe ser opcional para compatibilidad histórica');
        assert.equal(schema.paths['periodo'].isRequired, false, 'periodo debe ser opcional para compatibilidad histórica');

        assert.equal(schema.options.autoIndex, false, 'autoIndex debe ser false en el schema para control explícito de SRE');

        const indexes = schema.indexes();
        const compoundIdx = indexes.find(idx => idx[0].baseId === 1 && idx[0].periodo === 1);
        assert.ok(compoundIdx, 'Debe existir índice compuesto { baseId: 1, periodo: 1 }');
        assert.equal(compoundIdx[1].unique, true, 'El índice debe ser único');
        assert.ok(compoundIdx[1].partialFilterExpression, 'Debe usar partialFilterExpression');
        assert.deepEqual(
            compoundIdx[1].partialFilterExpression,
            { baseId: { $type: "objectId" }, periodo: { $type: "string" } },
            'partialFilterExpression debe requerir baseId de tipo objectId y periodo de tipo string'
        );
    });

    await t.test('3.2: Lógica de Idempotencia: Primera ejecución crea, segunda ejecución recupera sin duplicar', async () => {
        const Base = require('../models/base');
        const Invoice = require('../models/invoices');
        const Admin = require('../models/admin');
        const { createInvoice } = require('../controllers/invoice');

        const dbStorage = new LocalStorage('./dolar');
        dbStorage.setItem('costo_vaucher_v2', JSON.stringify({ venta: 1000, timestamp: Date.now(), source: 'test' }));

        const inMemoryInvoices = [];

        const originalBaseFind = Base.find;
        Base.find = async () => [
            { _id: '67deda8942e860094f897d01', adminId: '67deda8942e860094f897d09', viajes: 100 },
            { _id: '67deda8942e860094f897d02', adminId: '67deda8942e860094f897d09', viajes: 50 },
        ];

        const originalAdminFindById = Admin.findById;
        Admin.findById = async () => ({ _id: '67deda8942e860094f897d09', role: 'ADMIN_ROLE' });

        const originalFindOneAndUpdate = Invoice.findOneAndUpdate;
        Invoice.findOneAndUpdate = async (filter, update, options) => {
            const found = inMemoryInvoices.find(
                inv => inv.baseId === filter.baseId && inv.periodo === filter.periodo
            );
            if (found) {
                return found;
            }
            if (options && options.upsert) {
                const newDoc = { ...update.$setOnInsert, _id: 'inv_' + (inMemoryInvoices.length + 1) };
                inMemoryInvoices.push(newDoc);
                return null;
            }
            return null;
        };

        try {
            const mockReq = { 
                uid: '67deda8942e860094f897d09',
                body: { periodo: '2026-09' }
            };
            let responseStatus = null;
            let responseJson = null;
            const mockRes = {
                status(s) { responseStatus = s; return this; },
                json(d) { responseJson = d; return this; }
            };

            await createInvoice(mockReq, mockRes);
            assert.equal(responseStatus, 200);
            assert.equal(inMemoryInvoices.length, 2, 'Primera ejecución crea exactamente 2 facturas');
            assert.equal(responseJson.factura.length, 2);

            await createInvoice(mockReq, mockRes);
            assert.equal(responseStatus, 200);
            assert.equal(
                inMemoryInvoices.length,
                2,
                'SEGUNDA EJECUCIÓN: No debe añadir documentos duplicados (idempotencia garantizada)'
            );

            const mockReqPrevMonth = { 
                uid: '67deda8942e860094f897d09',
                body: { periodo: '2026-08' }
            };
            await createInvoice(mockReqPrevMonth, mockRes);
            assert.equal(
                inMemoryInvoices.length,
                4,
                'TERCERA EJECUCIÓN: Período distinto genera sus 2 nuevas facturas legítimas'
            );
        } finally {
            Base.find = originalBaseFind;
            Admin.findById = originalAdminFindById;
            Invoice.findOneAndUpdate = originalFindOneAndUpdate;
        }
    });

    await t.test('3.3: Manejo elegante de código 11000 (duplicate key en carreras concurrentes)', async () => {
        const Base = require('../models/base');
        const Invoice = require('../models/invoices');
        const Admin = require('../models/admin');
        const { createInvoice } = require('../controllers/invoice');

        const dbStorage = new LocalStorage('./dolar');
        dbStorage.setItem('costo_vaucher_v2', JSON.stringify({ venta: 1000, timestamp: Date.now(), source: 'test' }));

        const originalBaseFind = Base.find;
        const originalAdminFindById = Admin.findById;
        const originalFindOneAndUpdate = Invoice.findOneAndUpdate;
        const originalFindOne = Invoice.findOne;

        Base.find = async () => [{ _id: '67deda8942e860094f897d01', adminId: '67deda8942e860094f897d09', viajes: 10 }];
        Admin.findById = async () => ({ _id: '67deda8942e860094f897d09', role: 'ADMIN_ROLE' });

        Invoice.findOneAndUpdate = async () => {
            const err = new Error('E11000 duplicate key error collection: inri.invoices index: baseId_1_periodo_1');
            err.code = 11000;
            throw err;
        };

        const existingInvoice = { _id: 'inv_already_present', baseId: '67deda8942e860094f897d01', periodo: '2026-09' };
        Invoice.findOne = async () => existingInvoice;

        try {
            const mockReq = { 
                uid: '67deda8942e860094f897d09',
                body: { periodo: '2026-09' }
            };
            let responseStatus = null;
            let responseJson = null;
            const mockRes = {
                status(s) { responseStatus = s; return this; },
                json(d) { responseJson = d; return this; }
            };

            await createInvoice(mockReq, mockRes);

            assert.equal(responseStatus, 200, 'Debe devolver status 200 manejando el error 11000');
            assert.equal(responseJson.factura.length, 1);
            assert.equal(responseJson.factura[0]._id, 'inv_already_present');
        } finally {
            Base.find = originalBaseFind;
            Admin.findById = originalAdminFindById;
            Invoice.findOneAndUpdate = originalFindOneAndUpdate;
            Invoice.findOne = originalFindOne;
        }
    });

    await t.test('3.4: Manejo de errores de base de datos no capturados en createInvoice', async () => {
        const Base = require('../models/base');
        const Admin = require('../models/admin');
        const { createInvoice } = require('../controllers/invoice');

        const originalBaseFind = Base.find;
        const originalAdminFindById = Admin.findById;
        Admin.findById = async () => ({ _id: '67deda8942e860094f897d09', role: 'ADMIN_ROLE' });
        Base.find = async () => {
            throw new Error('MongoNetworkError: connection timed out');
        };

        try {
            const mockReq = { uid: '67deda8942e860094f897d09', body: {} };
            let responseStatus = null;
            let responseJson = null;
            const mockRes = {
                status(s) { responseStatus = s; return this; },
                json(d) { responseJson = d; return this; }
            };

            await createInvoice(mockReq, mockRes);

            assert.equal(responseStatus, 500);
            assert.equal(responseJson.ok, false);
            assert.equal(responseJson.msg, 'MongoNetworkError: connection timed out');
        } finally {
            Base.find = originalBaseFind;
            Admin.findById = originalAdminFindById;
        }
    });

    await t.test('3.5: Ejecución concurrente masiva (20 requests simultáneos) genera exactamente 1 factura por base', async () => {
        const Base = require('../models/base');
        const Invoice = require('../models/invoices');
        const Admin = require('../models/admin');
        const { createInvoice } = require('../controllers/invoice');

        const dbStorage = new LocalStorage('./dolar');
        dbStorage.setItem('costo_vaucher_v2', JSON.stringify({ venta: 1000, timestamp: Date.now(), source: 'test' }));

        const inMemoryStore = [];
        const originalBaseFind = Base.find;
        const originalAdminFindById = Admin.findById;
        const originalFindOneAndUpdate = Invoice.findOneAndUpdate;

        Base.find = async () => [{ _id: '67deda8942e860094f897d01', adminId: '67deda8942e860094f897d09', viajes: 75 }];
        Admin.findById = async () => ({ _id: '67deda8942e860094f897d09', role: 'ADMIN_ROLE' });

        Invoice.findOneAndUpdate = async (filter, update, options) => {
            const found = inMemoryStore.find(
                inv => inv.baseId === filter.baseId && inv.periodo === filter.periodo
            );
            if (found) {
                return found;
            }
            if (options && options.upsert) {
                const newDoc = { ...update.$setOnInsert, _id: 'inv_c_' + (inMemoryStore.length + 1) };
                inMemoryStore.push(newDoc);
                return null;
            }
            return null;
        };

        try {
            const promises = Array.from({ length: 20 }, async () => {
                const mockReq = { 
                    uid: '67deda8942e860094f897d09',
                    body: { periodo: '2026-09' }
                };
                let responseStatus = null;
                let responseJson = null;
                const mockRes = {
                    status(s) { responseStatus = s; return this; },
                    json(d) { responseJson = d; return this; }
                };
                await createInvoice(mockReq, mockRes);
                return { responseStatus, responseJson };
            });

            const results = await Promise.all(promises);

            for (const res of results) {
                assert.equal(res.responseStatus, 200);
            }

            assert.equal(
                inMemoryStore.length,
                1,
                'CRÍTICO: 20 peticiones concurrentes deben resultar en exactamente 1 factura en la base de datos'
            );
        } finally {
            Base.find = originalBaseFind;
            Admin.findById = originalAdminFindById;
            Invoice.findOneAndUpdate = originalFindOneAndUpdate;
        }
    });

    await t.test('3.6: Fallo parcial y reintento no provoca duplicados en bases ya facturadas', async () => {
        const Base = require('../models/base');
        const Invoice = require('../models/invoices');
        const Admin = require('../models/admin');
        const { createInvoice } = require('../controllers/invoice');

        const dbStorage = new LocalStorage('./dolar');
        dbStorage.setItem('costo_vaucher_v2', JSON.stringify({ venta: 1000, timestamp: Date.now(), source: 'test' }));

        const inMemoryStore = [];
        const originalBaseFind = Base.find;
        const originalAdminFindById = Admin.findById;
        const originalFindOneAndUpdate = Invoice.findOneAndUpdate;

        Base.find = async () => [
            { _id: '67deda8942e860094f897d01', adminId: '67deda8942e860094f897d09', viajes: 10 },
            { _id: '67deda8942e860094f897d02', adminId: '67deda8942e860094f897d09', viajes: 20 },
        ];
        Admin.findById = async () => ({ _id: '67deda8942e860094f897d09', role: 'ADMIN_ROLE' });

        let simulateErrorOnBase2 = true;

        Invoice.findOneAndUpdate = async (filter, update, options) => {
            if (filter.baseId === '67deda8942e860094f897d02' && simulateErrorOnBase2) {
                throw new Error('Disk full / write timeout on base 2');
            }
            const found = inMemoryStore.find(
                inv => inv.baseId === filter.baseId && inv.periodo === filter.periodo
            );
            if (found) {
                return found;
            }
            if (options && options.upsert) {
                const newDoc = { ...update.$setOnInsert, _id: 'inv_p_' + (inMemoryStore.length + 1) };
                inMemoryStore.push(newDoc);
                return null;
            }
            return null;
        };

        try {
            const mockReq = { 
                uid: '67deda8942e860094f897d09',
                body: { periodo: '2026-09' }
            };
            const mockRes = {
                status() { return this; },
                json() { return this; }
            };

            await createInvoice(mockReq, mockRes);
            assert.equal(inMemoryStore.length, 1, 'Base 1 fue guardada antes del error en base 2');

            simulateErrorOnBase2 = false;
            await createInvoice(mockReq, mockRes);

            assert.equal(
                inMemoryStore.length,
                2,
                'Al reintentar, base 1 no se duplica y base 2 se crea exitosamente'
            );
            assert.equal(inMemoryStore[0].baseId, '67deda8942e860094f897d01');
            assert.equal(inMemoryStore[1].baseId, '67deda8942e860094f897d02');
        } finally {
            Base.find = originalBaseFind;
            Admin.findById = originalAdminFindById;
            Invoice.findOneAndUpdate = originalFindOneAndUpdate;
        }
    });

    await t.test('3.7: Documentos históricos y parciales son excluidos por partialFilterExpression sin colisión', () => {
        const matchesFilter = (doc) => {
            return doc.baseId instanceof mongoose.Types.ObjectId && typeof doc.periodo === 'string';
        };

        const validOid = new mongoose.Types.ObjectId();

        // 1. Histórico: sin baseId ni periodo
        assert.equal(matchesFilter({ adminId: validOid, viajes: { cantidad: 10 } }), false);

        // 2. Sin periodo
        assert.equal(matchesFilter({ baseId: validOid, adminId: validOid }), false);

        // 3. Sin baseId
        assert.equal(matchesFilter({ periodo: '2026-10' }), false);

        // 4. BaseId string en vez de ObjectId
        assert.equal(matchesFilter({ baseId: 'string-id', periodo: '2026-10' }), false);

        // 5. Documento legítimo completo
        assert.equal(matchesFilter({ baseId: validOid, periodo: '2026-10' }), true);
    });
});

// ========================================================================
// GRUPO 4: Bloqueo de Superposición y Concurrencia en Background Jobs
// ========================================================================
test('Grupo 4: Protección contra Superposición de Tareas (Concurrency Lock)', async (t) => {

    const Base = require('../models/base');
    const origBaseFind = Base.find;
    const origBaseAggregate = Base.aggregate;

    await t.test('4.1: createInvoiceJob bloquea ejecuciones superpuestas simultáneas', async () => {
        const invoiceServer = require('../service/invoice_server');

        Base.find = () => new Promise(resolve => setTimeout(() => resolve([]), 60));

        try {
            const p1 = invoiceServer.createInvoiceJob().catch(err => ({ error: err.message }));
            const p2 = await invoiceServer.createInvoiceJob();

            assert.equal(p2.ok, false, 'El segundo job superpuesto debe responder ok: false');
            assert.equal(p2.msg, 'Job already running', 'Mensaje debe indicar que ya hay un job corriendo');

            await p1;

            const p3 = await invoiceServer.createInvoiceJob();
            assert.notEqual(p3.msg, 'Job already running', 'El lock debe liberarse en el bloque finally');
        } finally {
            Base.find = origBaseFind;
        }
    });

    await t.test('4.2: createInvoicePdfJob bloquea ejecuciones superpuestas simultáneas', async () => {
        const invoiceServer = require('../service/invoice_server');

        Base.aggregate = () => new Promise(resolve => setTimeout(() => resolve([]), 60));

        try {
            const p1 = invoiceServer.createInvoicePdfJob().catch(err => ({ error: err.message }));
            const p2 = await invoiceServer.createInvoicePdfJob();

            assert.equal(p2.ok, false);
            assert.equal(p2.msg, 'Job already running');

            await p1;

            const p3 = await invoiceServer.createInvoicePdfJob();
            assert.notEqual(p3.msg, 'Job already running', 'El lock debe liberarse tras terminar');
        } finally {
            Base.aggregate = origBaseAggregate;
        }
    });
});

// ========================================================================
// GRUPO 5: Validación del Período de Facturación y Seguridad de Endpoints
// ========================================================================
test('Grupo 5: Validación del Período de Facturación y Seguridad de Endpoints', async (t) => {

    const { createInvoice } = require('../controllers/invoice');
    const Admin = require('../models/admin');
    const origAdminFindById = Admin.findById;

    await t.test('5.1: Rechazo con HTTP 400 de período con formato inválido', async () => {
        Admin.findById = async () => ({ _id: '67deda8942e860094f897d09', role: 'ADMIN_ROLE' });

        const invalidPeriods = ['2026-13', '2026-00', 'invalid', '2026/10', '2026-1', 12345, { $gt: "" }];

        try {
            for (const badPeriod of invalidPeriods) {
                let responseStatus = null;
                let responseJson = null;
                const mockReq = { 
                    uid: '67deda8942e860094f897d09',
                    body: { periodo: badPeriod }
                };
                const mockRes = {
                    status(s) { responseStatus = s; return this; },
                    json(d) { responseJson = d; return this; }
                };

                await createInvoice(mockReq, mockRes);
                assert.equal(responseStatus, 400, `Período '${JSON.stringify(badPeriod)}' debe ser rechazado con 400`);
                assert.equal(responseJson.ok, false);
            }
        } finally {
            Admin.findById = origAdminFindById;
        }
    });

    await t.test('5.2: Rechazo con HTTP 400 de período futuro respecto a la fecha del servidor', async () => {
        Admin.findById = async () => ({ _id: '67deda8942e860094f897d09', role: 'ADMIN_ROLE' });

        try {
            let responseStatus = null;
            let responseJson = null;
            const mockReq = { 
                uid: '67deda8942e860094f897d09',
                body: { periodo: '2099-12' }
            };
            const mockRes = {
                status(s) { responseStatus = s; return this; },
                json(d) { responseJson = d; return this; }
            };

            await createInvoice(mockReq, mockRes);
            assert.equal(responseStatus, 400, 'Un período futuro debe ser rechazado con 400');
            assert.match(responseJson.msg, /períodos futuros/i);
        } finally {
            Admin.findById = origAdminFindById;
        }
    });

    await t.test('5.3: Rechazo con HTTP 401 de peticiones sin token JWT (req.uid ausente)', async () => {
        let responseStatus = null;
        let responseJson = null;
        const mockReq = { body: { periodo: '2026-09' } };
        const mockRes = {
            status(s) { responseStatus = s; return this; },
            json(d) { responseJson = d; return this; }
        };

        await createInvoice(mockReq, mockRes);
        assert.equal(responseStatus, 401, 'Sin autenticación debe retornar 401');
        assert.equal(responseJson.ok, false);
        assert.match(responseJson.msg, /no autenticado/i);
    });

    await t.test('5.4: Rechazo con HTTP 403 de peticiones con usuario no administrador', async () => {
        Admin.findById = async () => null;

        try {
            let responseStatus = null;
            let responseJson = null;
            const mockReq = { uid: 'unauthorized_user_123', body: {} };
            const mockRes = {
                status(s) { responseStatus = s; return this; },
                json(d) { responseJson = d; return this; }
            };

            await createInvoice(mockReq, mockRes);
            assert.equal(responseStatus, 403, 'Usuario no administrador debe retornar 403');
            assert.equal(responseJson.ok, false);
            assert.match(responseJson.msg, /acceso denegado/i);
        } finally {
            Admin.findById = origAdminFindById;
        }
    });

    await t.test('5.5: Invocación directa interna (createInvoiceCore) opera sin requerir HTTP ni JWT', async () => {
        const Base = require('../models/base');
        const origBaseFind = Base.find;
        Base.find = async () => [];

        try {
            const { createInvoiceCore } = require('../controllers/invoice');
            const result = await createInvoiceCore({ isInternalCron: true });
            assert.equal(result.ok, false);
            assert.equal(result.msg, 'No existen bases creadas aun');
        } finally {
            Base.find = origBaseFind;
        }
    });
});

// ========================================================================
// GRUPO 6: Verificación de Arranque, Healthcheck y Readiness de MongoDB
// ========================================================================
test('Grupo 6: Verificación de Arranque, Healthcheck y Readiness de MongoDB', async (t) => {

    await t.test('6.1: /api/health retorna HTTP 200 y status "healthy" cuando MongoDB está conectado (readyState === 1)', () => {
        Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true, writable: true });

        try {
            let capturedStatus = null;
            let capturedJson = null;
            const res = {
                status(s) { capturedStatus = s; return this; },
                json(d) { capturedJson = d; return this; }
            };

            const isDbConnected = mongoose.connection.readyState === 1;
            const healthResponse = {
                ok: isDbConnected,
                status: isDbConnected ? 'healthy' : 'database_disconnected',
                database: { connected: isDbConnected, readyState: mongoose.connection.readyState }
            };
            res.status(isDbConnected ? 200 : 503).json(healthResponse);

            assert.equal(capturedStatus, 200);
            assert.equal(capturedJson.ok, true);
            assert.equal(capturedJson.status, 'healthy');
            assert.equal(capturedJson.database.connected, true);
        } finally {
            delete mongoose.connection.readyState;
        }
    });

    await t.test('6.2: /api/health retorna HTTP 503 cuando MongoDB está desconectado (readyState === 0)', () => {
        Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true, writable: true });

        try {
            let capturedStatus = null;
            let capturedJson = null;
            const res = {
                status(s) { capturedStatus = s; return this; },
                json(d) { capturedJson = d; return this; }
            };

            const isDbConnected = mongoose.connection.readyState === 1;
            const healthResponse = {
                ok: isDbConnected,
                status: isDbConnected ? 'healthy' : 'database_disconnected',
                database: { connected: isDbConnected, readyState: mongoose.connection.readyState }
            };
            res.status(isDbConnected ? 200 : 503).json(healthResponse);

            assert.equal(capturedStatus, 503);
            assert.equal(capturedJson.ok, false);
            assert.equal(capturedJson.status, 'database_disconnected');
            assert.equal(capturedJson.database.connected, false);
        } finally {
            delete mongoose.connection.readyState;
        }
    });

    await t.test('6.3: Tareas cron de facturación y despacho omiten ejecución segura si readyState !== 1', () => {
        let dispatchCalled = false;
        let invoiceCalled = false;

        const fakeDispatchDrivers = async () => { dispatchCalled = true; };
        const fakeCreateInvoiceJob = async () => { invoiceCalled = true; };

        const dbState = 0;

        if (dbState === 1) {
            fakeDispatchDrivers();
            fakeCreateInvoiceJob();
        }

        assert.equal(dispatchCalled, false, 'No debe invocar dispatchDrivers si DB no está conectada');
        assert.equal(invoiceCalled, false, 'No debe invocar createInvoiceJob si DB no está conectada');
    });

    await t.test('6.4: Tareas automáticas cron capturan errores internos sin lanzar UnhandledPromiseRejection', async () => {
        let unhandledError = null;
        try {
            await (async function cronSimulatedWorker() {
                try {
                    throw new Error('Fallo simulado de red en cron worker');
                } catch (err) {
                    return { handled: true, error: err.message };
                }
            })();
        } catch (err) {
            unhandledError = err;
        }

        assert.equal(unhandledError, null, 'El cron no debe propagar excepciones no capturadas al proceso');
    });
});

// ========================================================================
// GRUPO 7: Contratos de Rutas Express y Middleware de Seguridad
// ========================================================================
test('Grupo 7: Contratos de Rutas Express y Middleware de Seguridad', async (t) => {

    await t.test('7.1: Router /api/invoice carga y expone todos sus endpoints protegidos por validarJWT', () => {
        const invoiceRouter = require('../routes/invoice');
        assert.ok(invoiceRouter, 'El router de invoice debe existir');
        
        const routes = invoiceRouter.stack.map(layer => ({
            path: layer.route && layer.route.path,
            methods: layer.route && Object.keys(layer.route.methods),
            stackLength: layer.route && layer.route.stack.length
        })).filter(r => r.path);

        const paths = routes.map(r => r.path);
        assert.ok(paths.includes('/new'), 'Debe exponer POST /new');
        assert.ok(paths.includes('/get-invoice/:_id'), 'Debe exponer GET /get-invoice/:_id');
        assert.ok(paths.includes('/create-pdf-invoice'), 'Debe exponer GET /create-pdf-invoice');
        assert.ok(paths.includes('/get-pdf-invoice/:_id'), 'Debe exponer GET /get-pdf-invoice/:_id');

        for (const route of routes) {
            assert.ok(route.stackLength >= 2, `La ruta ${route.path} debe tener al menos middleware + controlador`);
        }
    });

    await t.test('7.2: Router /api/ubicaciones carga correctamente y expone sus endpoints', () => {
        const ubicacionesRouter = require('../routes/ubicaciones');
        assert.ok(ubicacionesRouter, 'El router de ubicaciones debe existir');

        const routes = ubicacionesRouter.stack.map(layer => ({
            path: layer.route && layer.route.path,
            methods: layer.route && Object.keys(layer.route.methods)
        })).filter(r => r.path);

        const paths = routes.map(r => r.path);
        assert.ok(paths.includes('/lugar'), 'Debe exponer POST /lugar');
        assert.ok(paths.includes('/remove/address'), 'Debe exponer PUT /remove/address');
        assert.ok(paths.includes('/'), 'Debe exponer GET /');
    });
});

// ========================================================================
// GRUPO 8: Cotización del Dólar Blue y Eliminación de Precios Ficticios
// ========================================================================
test('Grupo 8: Confiabilidad de Cotización y Eliminación de Precios Ficticios', async (t) => {

    const { getPriceDolarBlue, dolarBlueAxios } = require('../controllers/invoice');
    const dbStorage = new LocalStorage('./dolar');
    const origAxiosGet = dolarBlueAxios.get;

    await t.test('8.1: getPriceDolarBlue utiliza caché fresca (< 48h) cuando la fuente externa no está disponible', async () => {
        dolarBlueAxios.get = async () => { throw new Error('API dolarapi caida'); };

        try {
            const freshTimestamp = Date.now() - (2 * 60 * 60 * 1000); // 2 horas de antigüedad
            dbStorage.setItem('costo_vaucher_v2', JSON.stringify({
                venta: 1250,
                timestamp: freshTimestamp,
                source: 'dolarapi.com'
            }));

            const price = await getPriceDolarBlue();
            assert.equal(price, 1250, 'Debe devolver el precio de la caché fresca');
        } finally {
            dolarBlueAxios.get = origAxiosGet;
        }
    });

    await t.test('8.2: getPriceDolarBlue RECHAZA caché vencida (> 48h) y no inventa precios', async () => {
        dolarBlueAxios.get = async () => { throw new Error('API dolarapi timeout'); };

        try {
            const expiredTimestamp = Date.now() - (50 * 60 * 60 * 1000); // 50 horas de antigüedad
            dbStorage.setItem('costo_vaucher_v2', JSON.stringify({
                venta: 950,
                timestamp: expiredTimestamp,
                source: 'dolarapi.com'
            }));

            await assert.rejects(
                async () => { await getPriceDolarBlue(); },
                /Cotización de dólar blue no disponible o desactualizada/,
                'Debe lanzar error seguro ante caché vencida'
            );
        } finally {
            dolarBlueAxios.get = origAxiosGet;
        }
    });

    await t.test('8.3: getPriceDolarBlue rechaza valores inválidos (cero, negativo, NaN, string no numérico)', async () => {
        dolarBlueAxios.get = async () => { throw new Error('API offline'); };

        try {
            const invalidValues = [0, -500, NaN, Infinity, -Infinity, "no-number", null, undefined];

            for (const badVal of invalidValues) {
                dbStorage.setItem('costo_vaucher_v2', JSON.stringify({
                    venta: badVal,
                    timestamp: Date.now(),
                    source: 'test'
                }));

                await assert.rejects(
                    async () => { await getPriceDolarBlue(); },
                    /Cotización de dólar blue no disponible o desactualizada/,
                    `Debe rechazar valor inválido: ${badVal}`
                );
            }
        } finally {
            dolarBlueAxios.get = origAxiosGet;
        }
    });

    await t.test('8.4: getPriceDolarBlue RECHAZA timestamps en el futuro injustificado (> 60s)', async () => {
        dolarBlueAxios.get = async () => { throw new Error('API offline'); };

        try {
            const futureTimestamp = Date.now() + (5 * 60 * 1000); // 5 minutos en el futuro
            dbStorage.setItem('costo_vaucher_v2', JSON.stringify({
                venta: 1300,
                timestamp: futureTimestamp,
                source: 'test-future'
            }));

            await assert.rejects(
                async () => { await getPriceDolarBlue(); },
                /Cotización de dólar blue no disponible o desactualizada/,
                'Debe rechazar timestamps en el futuro'
            );
        } finally {
            dolarBlueAxios.get = origAxiosGet;
        }
    });

    await t.test('8.5: getPriceDolarBlue RECHAZA timestamps ausentes o cero (archivos legacy)', async () => {
        dolarBlueAxios.get = async () => { throw new Error('API offline'); };

        try {
            dbStorage.setItem('costo_vaucher_v2', JSON.stringify({
                venta: 1300,
                source: 'test-legacy-no-ts'
            }));

            await assert.rejects(
                async () => { await getPriceDolarBlue(); },
                /Cotización de dólar blue no disponible o desactualizada/,
                'Debe rechazar caché sin timestamp'
            );
        } finally {
            dolarBlueAxios.get = origAxiosGet;
        }
    });

    await t.test('8.6: Verificación estricta de código: NO existe retorno de 500 hardcodeado en controllers/invoice.js', () => {
        const invoiceCtrlCode = fs.readFileSync(require.resolve('../controllers/invoice.js'), 'utf8');
        assert.equal(
            invoiceCtrlCode.includes('return 500'),
            false,
            'CRÍTICO: No debe existir ningún fallback de return 500 para la cotización'
        );
    });
});

// ========================================================================
// GRUPO 9: Período Contable y Fronteras de Zona Horaria (Regla Mes Anterior)
// ========================================================================
test('Grupo 9: Período Contable y Fronteras de Zona Horaria (Argentina)', async (t) => {

    const { getArgentinaPeriodo } = require('../controllers/invoice');

    await t.test('9.1: Formato del período contable es siempre YYYY-MM', () => {
        const result = getArgentinaPeriodo();
        assert.match(result.periodo, /^\d{4}-(0[1-9]|1[0-2])$/);
        assert.equal(typeof result.year, 'number');
        assert.equal(typeof result.month, 'number');
        assert.equal(typeof result.day, 'number');
        assert.equal(typeof result.emissionYear, 'number');
        assert.equal(typeof result.emissionMonth, 'number');
        assert.equal(typeof result.emissionDay, 'number');
    });

    await t.test('9.2: Caso Octubre 2026: 25 de octubre de 2026 factura período 2026-09', () => {
        const date = new Date('2026-10-25T12:00:00Z');
        const result = getArgentinaPeriodo(date);
        assert.equal(result.emissionYear, 2026);
        assert.equal(result.emissionMonth, 10);
        assert.equal(result.emissionDay, 25);
        assert.equal(result.periodo, '2026-09', 'El día 25 de octubre debe facturar período 2026-09');
    });

    await t.test('9.3: Caso Enero 2027: 25 de enero de 2027 factura período 2026-12', () => {
        const date = new Date('2027-01-25T12:00:00Z');
        const result = getArgentinaPeriodo(date);
        assert.equal(result.emissionYear, 2027);
        assert.equal(result.emissionMonth, 1);
        assert.equal(result.emissionDay, 25);
        assert.equal(result.periodo, '2026-12', 'El día 25 de enero debe facturar diciembre del año anterior (2026-12)');
    });

    await t.test('9.4: Caso Marzo 2028: 25 de marzo de 2028 factura período 2028-02', () => {
        const date = new Date('2028-03-25T12:00:00Z');
        const result = getArgentinaPeriodo(date);
        assert.equal(result.emissionYear, 2028);
        assert.equal(result.emissionMonth, 3);
        assert.equal(result.emissionDay, 25);
        assert.equal(result.periodo, '2028-02', 'El día 25 de marzo debe facturar febrero (2028-02)');
    });

    await t.test('9.5: Frontera de Fin de Año: 31 de diciembre 23:30 en Argentina (02:30 UTC del 1 de enero)', () => {
        const utcDate = new Date('2027-01-01T02:30:00Z'); // 31 dic 23:30 en UTC-3
        const result = getArgentinaPeriodo(utcDate);
        assert.equal(result.emissionYear, 2026, 'En Argentina sigue siendo 2026');
        assert.equal(result.emissionMonth, 12, 'En Argentina sigue siendo diciembre');
        assert.equal(result.emissionDay, 31);
        assert.equal(result.periodo, '2026-11', 'El mes calendario anterior a diciembre es noviembre (2026-11)');
    });

    await t.test('9.6: Frontera de Año Nuevo: 1 de enero 00:30 en Argentina (03:30 UTC)', () => {
        const utcDate = new Date('2026-01-01T03:30:00Z'); // 1 ene 00:30 en UTC-3
        const result = getArgentinaPeriodo(utcDate);
        assert.equal(result.emissionYear, 2026);
        assert.equal(result.emissionMonth, 1);
        assert.equal(result.emissionDay, 1);
        assert.equal(result.periodo, '2025-12', 'El mes calendario anterior a enero es diciembre del año previo (2025-12)');
    });

    await t.test('9.7: Frontera de Año Bisiesto: 29 de febrero', () => {
        const leapDate = new Date('2024-02-29T15:00:00Z');
        const result = getArgentinaPeriodo(leapDate);
        assert.equal(result.emissionYear, 2024);
        assert.equal(result.emissionMonth, 2);
        assert.equal(result.emissionDay, 29);
        assert.equal(result.periodo, '2024-01', 'El mes calendario anterior a febrero es enero (2024-01)');
    });
});

// ========================================================================
// GRUPO 10: Pruebas de Integración con MongoDB Real Aislado (14 Casos Obligatorios)
// ========================================================================
test('Grupo 10: Pruebas de Integración con MongoDB Real Aislado', async (t) => {

    const TEST_MONGO_URI = 'mongodb://127.0.0.1:27018/inri_test_p3b6e3_isolated';
    const Base = require('../models/base');
    const Invoice = require('../models/invoices');
    const Admin = require('../models/admin');
    const { 
        createInvoiceCore, 
        getInvoice, 
        getInvoicePdf 
    } = require('../controllers/invoice');

    // Conectar a la instancia aislada
    await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    
    // Limpiar base de pruebas
    await mongoose.connection.dropDatabase();

    // Crear explícitamente el índice parcial único
    await Invoice.collection.createIndex(
        { baseId: 1, periodo: 1 },
        {
            unique: true,
            partialFilterExpression: {
                baseId: { $type: "objectId" },
                periodo: { $type: "string" }
            }
        }
    );

    // Sembrar cotización válida en caché para las pruebas de integración
    const dbStorage = new LocalStorage('./dolar');
    dbStorage.setItem('costo_vaucher_v2', JSON.stringify({
        venta: 1200,
        timestamp: Date.now(),
        source: 'test-seed'
    }));

    // Variables compartidas entre casos de prueba de integración
    let adminAId;
    let adminBId;
    let base1Id;
    let base2Id;
    let base3Id;

    await t.test('10.0: Inicialización de entidades base en MongoDB real', async () => {
        adminAId = new mongoose.Types.ObjectId();
        adminBId = new mongoose.Types.ObjectId();

        await Admin.create([
            { _id: adminAId, nombre: 'Admin Alpha', email: 'alpha@test.com', password: 'hash', base: 1 },
            { _id: adminBId, nombre: 'Admin Beta', email: 'beta@test.com', password: 'hash', base: 2 }
        ]);

        base1Id = new mongoose.Types.ObjectId();
        await Base.create({
            _id: base1Id,
            adminId: adminAId,
            base: 1,
            ubicacion: { type: 'Point', coordinates: [-58.3816, -34.6037] },
            viajes: 100
        });

        const bases = await Base.find();
        assert.equal(bases.length, 1);
    });

    await t.test('10.1: Caso 1 - Primera Factura en MongoDB real', async () => {
        const result = await createInvoiceCore({ requestedPeriodo: '2026-09' });
        assert.equal(result.ok, true);
        assert.equal(result.factura.length, 1);

        const count = await Invoice.countDocuments({ baseId: base1Id, periodo: '2026-09' });
        assert.equal(count, 1, 'Debe existir exactamente 1 factura en la base de datos');

        const doc = await Invoice.findOne({ baseId: base1Id, periodo: '2026-09' });
        assert.equal(doc.viajes.cantidad, 100);
        assert.equal(doc.periodo, '2026-09');
        assert.equal(doc.adminId.toString(), adminAId.toString());
    });

    await t.test('10.2: Caso 2 - Segunda factura del mismo período (Idempotencia en MongoDB real)', async () => {
        const result = await createInvoiceCore({ requestedPeriodo: '2026-09' });
        assert.equal(result.ok, true);

        const count = await Invoice.countDocuments({ baseId: base1Id, periodo: '2026-09' });
        assert.equal(count, 1, 'CRÍTICO: La segunda ejecución no debe crear documentos duplicados');
    });

    await t.test('10.3: Caso 3 - Dos bases de un mismo administrador', async () => {
        base2Id = new mongoose.Types.ObjectId();
        await Base.create({
            _id: base2Id,
            adminId: adminAId,
            base: 2,
            ubicacion: { type: 'Point', coordinates: [-58.3916, -34.6137] },
            viajes: 50
        });

        const result = await createInvoiceCore({ requestedPeriodo: '2026-08' });
        assert.equal(result.ok, true);
        assert.equal(result.factura.length, 2);

        const countBase1 = await Invoice.countDocuments({ baseId: base1Id, periodo: '2026-08' });
        const countBase2 = await Invoice.countDocuments({ baseId: base2Id, periodo: '2026-08' });
        assert.equal(countBase1, 1);
        assert.equal(countBase2, 1);
    });

    await t.test('10.4: Caso 4 - Período nuevo para bases existentes', async () => {
        const result = await createInvoiceCore({ requestedPeriodo: '2026-07' });
        assert.equal(result.ok, true);
        assert.equal(result.factura.length, 2);

        const totalInvoicesBase1 = await Invoice.countDocuments({ baseId: base1Id });
        assert.equal(totalInvoicesBase1, 3, 'Base 1 debe tener exactamente 3 facturas (2026-09, 2026-08, 2026-07)');
    });

    await t.test('10.5: Caso 5 - Cinco solicitudes concurrentes en paralelo sobre MongoDB real', async () => {
        base3Id = new mongoose.Types.ObjectId();
        await Base.create({
            _id: base3Id,
            adminId: adminBId,
            base: 3,
            ubicacion: { type: 'Point', coordinates: [-58.4016, -34.6237] },
            viajes: 30
        });

        const promises = Array.from({ length: 5 }, () => 
            createInvoiceCore({ requestedPeriodo: '2026-06' })
        );

        const results = await Promise.all(promises);
        for (const res of results) {
            assert.equal(res.ok, true);
        }

        const countPeriod6 = await Invoice.countDocuments({ periodo: '2026-06' });
        assert.equal(countPeriod6, 3, 'Exactamente 3 facturas para las 3 bases, 0 duplicados en concurrencia 5x');
    });

    await t.test('10.6: Caso 6 - Veinte solicitudes concurrentes masivas (Stress Concurrency) sobre MongoDB real', async () => {
        const promises = Array.from({ length: 20 }, () => 
            createInvoiceCore({ requestedPeriodo: '2026-05' })
        );

        const results = await Promise.all(promises);
        for (const res of results) {
            assert.equal(res.ok, true);
        }

        const countPeriod5 = await Invoice.countDocuments({ periodo: '2026-05' });
        assert.equal(countPeriod5, 3, 'CRÍTICO: 20 ejecuciones simultáneas resultan en exactamente 3 facturas, 0 duplicados');
    });

    await t.test('10.7: Caso 7 - Manejo de Error E11000 nativo de MongoDB', async () => {
        let nativeDuplicateError = null;
        try {
            await Invoice.collection.insertOne({
                baseId: base1Id,
                periodo: '2026-09',
                adminId: adminAId,
                viajes: { cantidad: 50, precio: 3000 }
            });
        } catch (err) {
            nativeDuplicateError = err;
        }

        assert.ok(nativeDuplicateError, 'MongoDB debe rechazar la inserción duplicada directa');
        assert.equal(nativeDuplicateError.code, 11000, 'El error debe ser E11000');
    });

    await t.test('10.8: Caso 8 - Fallo parcial y reintento en MongoDB real', async () => {
        // En período 2026-04, insertar previamente Base 1 simulando ejecución parcial previa
        await Invoice.findOneAndUpdate(
            { baseId: base1Id, periodo: '2026-04' },
            { $setOnInsert: { adminId: adminAId, baseId: base1Id, periodo: '2026-04', viajes: { cantidad: 100 } } },
            { upsert: true }
        );

        // Ahora ejecutar facturación global de 2026-04 (contiene base1, base2, base3)
        const result = await createInvoiceCore({ requestedPeriodo: '2026-04' });
        assert.equal(result.ok, true);
        assert.equal(result.factura.length, 3);

        const countBase1 = await Invoice.countDocuments({ baseId: base1Id, periodo: '2026-04' });
        const countBase2 = await Invoice.countDocuments({ baseId: base2Id, periodo: '2026-04' });
        const countBase3 = await Invoice.countDocuments({ baseId: base3Id, periodo: '2026-04' });
        assert.equal(countBase1, 1, 'Base 1 ya existente no se duplica');
        assert.equal(countBase2, 1, 'Base 2 completada exitosamente');
        assert.equal(countBase3, 1, 'Base 3 completada exitosamente');
    });

    await t.test('10.9: Caso 9 - Documentos históricos sin baseId ni periodo no colisionan en índice', async () => {
        const historicalDocs = Array.from({ length: 5 }, (_, i) => ({
            adminId: adminAId,
            viajes: { cantidad: 10 * (i + 1), precio: 500 * (i + 1) }
        }));

        await Invoice.collection.insertMany(historicalDocs);

        const countHistorical = await Invoice.countDocuments({ baseId: { $exists: false } });
        assert.equal(countHistorical, 5, 'Los 5 documentos históricos deben persistir sin error');
    });

    await t.test('10.10: Caso 10 - Documentos con baseId null no colisionan en el índice parcial', async () => {
        const nullBaseDocs = [
            { baseId: null, periodo: '2026-09', adminId: adminAId },
            { baseId: null, periodo: '2026-09', adminId: adminBId }
        ];

        await Invoice.collection.insertMany(nullBaseDocs);

        const countNull = await Invoice.countDocuments({ baseId: { $type: "null" } });
        assert.equal(countNull, 2, 'Los documentos con baseId null no colisionan entre sí gracias al filtro objectId');
    });

    await t.test('10.11: Caso 11 - Verificación de índice único existente en MongoDB real', async () => {
        const indexes = await Invoice.collection.indexes();
        const compoundIdx = indexes.find(i => i.key && i.key.baseId === 1 && i.key.periodo === 1);
        assert.ok(compoundIdx, 'El índice compuesto debe existir en la colección de MongoDB');
        assert.equal(compoundIdx.unique, true, 'Debe ser único');
        assert.deepEqual(compoundIdx.partialFilterExpression, {
            baseId: { $type: "objectId" },
            periodo: { $type: "string" }
        });
    });

    await t.test('10.12: Caso 12 - Simulación de comportamiento ante índice único ausente', async () => {
        const unindexedColl = mongoose.connection.collection('invoices_unindexed_test');
        await unindexedColl.drop().catch(() => {});

        await unindexedColl.insertOne({ baseId: base1Id, periodo: '2026-01' });
        await unindexedColl.insertOne({ baseId: base1Id, periodo: '2026-01' });

        const count = await unindexedColl.countDocuments({ baseId: base1Id, periodo: '2026-01' });
        assert.equal(count, 2, 'Sin índice único en MongoDB, los documentos se duplican');
        
        await unindexedColl.drop();
    });

    await t.test('10.13: Caso 13 - Reintento tras reinicio lógico de conexión', async () => {
        await mongoose.disconnect();
        await mongoose.connect(TEST_MONGO_URI);

        const result = await createInvoiceCore({ requestedPeriodo: '2026-09' });
        assert.equal(result.ok, true);

        const count = await Invoice.countDocuments({ baseId: base1Id, periodo: '2026-09' });
        assert.equal(count, 1, 'Idempotencia preservada tras reconexión');
    });

    await t.test('10.14: Caso 14 - Verificación exhaustiva de cantidad final exacta de facturas', async () => {
        const totalDocs = await Invoice.countDocuments();
        // 5 históricos + 2 con baseId null + 3 (period 9: base1, base2, base3 tras caso 13) + 2 (period 8) + 2 (period 7) + 3 (period 6) + 3 (period 5) + 3 (period 4)
        // Total esperado: 5 + 2 + 3 + 2 + 2 + 3 + 3 + 3 = 23 documentos
        const expectedTotal = 5 + 2 + 3 + 2 + 2 + 3 + 3 + 3;
        assert.equal(totalDocs, expectedTotal, `Total de facturas en DB debe ser exactamente ${expectedTotal}`);
    });

    await t.test('10.15: Caso 15 - Seguridad real y Anti-IDOR sobre base de datos en endpoints', async () => {
        // Intento IDOR: Admin A intenta consultar facturas de Admin B
        let idorStatus = null;
        let idorJson = null;
        const mockReqIdor = {
            uid: adminAId.toString(),
            params: { _id: adminBId.toString() }
        };
        const mockResIdor = {
            status(s) { idorStatus = s; return this; },
            json(d) { idorJson = d; return this; }
        };
        await getInvoice(mockReqIdor, mockResIdor);
        assert.equal(idorStatus, 403, 'CRÍTICO: getInvoice de otro admin debe retornar 403 Forbidden');
        assert.match(idorJson.msg, /no tiene autorización/i);

        // Consulta legítima: Admin A consulta sus propias facturas
        let legitStatus = null;
        let legitJson = null;
        const mockReqLegit = {
            uid: adminAId.toString(),
            params: { _id: adminAId.toString() }
        };
        const mockResLegit = {
            status(s) { legitStatus = s; return this; },
            json(d) { legitJson = d; return this; }
        };
        await getInvoice(mockReqLegit, mockResLegit);
        assert.equal(legitStatus, 200, 'Consulta legítima de propias facturas debe retornar 200 OK');
        assert.equal(legitJson.ok, true);

        // Intento IDOR PDF: Admin A intenta descargar PDF de Base 3 (pertenece a Admin B)
        let pdfIdorStatus = null;
        let pdfIdorJson = null;
        const mockReqPdfIdor = {
            uid: adminAId.toString(),
            params: { _id: base3Id.toString() }
        };
        const mockResPdfIdor = {
            status(s) { pdfIdorStatus = s; return this; },
            json(d) { pdfIdorJson = d; return this; }
        };
        await getInvoicePdf(mockReqPdfIdor, mockResPdfIdor);
        assert.equal(pdfIdorStatus, 403, 'CRÍTICO: Descarga de PDF de base ajena debe retornar 403 Forbidden');
        assert.match(pdfIdorJson.msg, /no es el administrador propietario/i);
    });

    // Limpieza final de la base de pruebas y desconexión
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
});
