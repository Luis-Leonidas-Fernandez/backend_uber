const { response } = require('express');
const PDFDocument = require('pdfkit-table');
const Base = require('../models/base');
const Invoice = require('../models/invoices');
const {LocalStorage} = require('node-localstorage');
const db = new LocalStorage('./dolar');
const axios    = require('axios').default;
const ObjectId = require('mongodb').ObjectId;
const path = require('path');
const fs = require("fs");
const admin = require('../models/admin');

const dolarBlueAxios = axios.create({
  baseURL: "https://dolarapi.com/v1/dolares/blue",
  timeout: 5000
});

const MAX_CACHE_AGE_MS = 48 * 60 * 60 * 1000; // 48 horas de validez máxima para caché de contingencia

/**
 * Determina fecha de emisión y período contable en la zona horaria oficial de Argentina.
 * Regla de negocio definitiva del propietario: El día 25 se factura el mes calendario anterior.
 * Ejemplos:
 *  - 25 de octubre de 2026 -> período 2026-09
 *  - 25 de enero de 2027   -> período 2026-12
 *  - 25 de marzo de 2028   -> período 2028-02
 */
function getArgentinaPeriodo(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    const parts = formatter.formatToParts(date);
    const getPart = (type) => parts.find(p => p.type === type)?.value;
    const emissionYear = parseInt(getPart('year'), 10);
    const emissionMonth = parseInt(getPart('month'), 10);
    const emissionDay = parseInt(getPart('day'), 10);

    // Período contable: mes calendario anterior
    let accountingYear = emissionYear;
    let accountingMonth = emissionMonth - 1;
    if (accountingMonth === 0) {
        accountingMonth = 12;
        accountingYear -= 1;
    }

    const paddedMonth = String(accountingMonth).padStart(2, '0');
    return {
        emissionYear,
        emissionMonth,
        emissionDay,
        year: accountingYear,
        month: accountingMonth,
        day: emissionDay,
        periodo: `${accountingYear}-${paddedMonth}`
    };
}

/**
 * Obtiene la cotización del dólar blue desde fuente externa o caché verificada.
 * Si no existe cotización confiable, falla de forma segura sin inventar precios.
 */
const getPriceDolarBlue = async () => {
  // 1. Consultar fuente externa
  try {
    const dolarBlue = await dolarBlueAxios.get();        
    if (dolarBlue && dolarBlue.data) {
        const venta = dolarBlue.data.venta;
        if (typeof venta === 'number' && Number.isFinite(venta) && venta > 0) {
            try {
                db.setItem('costo_vaucher_v2', JSON.stringify({
                    venta,
                    timestamp: Date.now(),
                    source: 'dolarapi.com'
                }));
            } catch (e) {}
            return venta;
        }
    }
  } catch (error) {
    console.warn('Advertencia: fallo de conexión con dolarapi.com:', error.message);
  }

  // 2. Evaluar caché local si la fuente externa no responde
  try {
    const rawCached = db.getItem('costo_vaucher_v2') || db.getItem('costo_vaucher');
    if (rawCached) {
        const parsed = JSON.parse(rawCached);
        const val = parsed.venta;
        const ts = parsed.timestamp;
        
        // Validación estricta de timestamp y cotización
        if (typeof ts === 'number' && Number.isFinite(ts) && ts > 0) {
            const now = Date.now();
            const age = now - ts;
            // Rechazar timestamps en el futuro injustificado (> 60s tolerancia reloj)
            if (ts > now + 60000) {
                console.error('Caché de cotización inválida: timestamp en el futuro');
            } else if (age > MAX_CACHE_AGE_MS) {
                console.error(`Caché de cotización expirada (${Math.round(age / 3600000)}h > 48h)`);
            } else if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
                console.log(`Utilizando cotización en caché (${val})`);
                return val;
            } else {
                console.error('Caché de cotización inválida: valor no numérico, finito o positivo');
            }
        } else {
            console.error('Caché de cotización inválida: timestamp ausente o no numérico');
        }
    }
  } catch (e) {
    console.error('Error al evaluar caché de cotización:', e.message);
  }

  // 3. Política estricta: No inventar precios ficticios
  throw new Error('Cotización de dólar blue no disponible o desactualizada. No se pueden generar facturas con importes no verificados.');
};

const getPriceSoporte = async (dolarPrice) => {
  if (typeof dolarPrice === 'number' && Number.isFinite(dolarPrice) && dolarPrice > 0) {
    return dolarPrice * 12;
  }
  const dolar = await getPriceDolarBlue();
  return dolar * 12;
};

const searchBases = async () => {
  const bases = await Base.aggregate([
    {
      $project: {
          base: 1,
          zonaName: 1,
          viajes: 1,
      }
    }
  ]);
  return bases;
};

/**
 * Lógica central de facturación mensual neutralizada (P-3B.6-F7).
 * Retorna estado controlado INVOICING_DISABLED sin interactuar con MongoDB ni fuentes externas.
 */
const createInvoiceCore = async ({ requestedPeriodo = null, isInternalCron = false } = {}) => {
  return {
    ok: false,
    code: 'INVOICING_DISABLED',
    message: 'La facturación está deshabilitada'
  };
};

/**
 * Controlador HTTP: Bloqueado con HTTP 503 (P-3B.6-F7)
 * Mantiene autenticación y autorización previa antes de responder INVOICING_DISABLED.
 */
const createInvoice = async (req, res = response) => {
    try {
        if (!req.uid) {
            return res.status(401).json({ ok: false, msg: 'No autenticado: token requerido' });
        }
        
        const adminDb = await admin.findById(req.uid);
        if (!adminDb) {
            return res.status(403).json({ ok: false, msg: 'Acceso denegado: solo administradores pueden gestionar facturación' });
        }

        return res.status(503).json({
            ok: false,
            code: 'INVOICING_DISABLED',
            message: 'La facturación está deshabilitada'
        });
    } catch (error) {
        console.error('Error en createInvoice:', error.message);
        return res.status(500).json({
            ok: false,
            msg: error.message || 'Hable con el administrador'
        });
    }
};

/**
 * Generación de PDFs de facturación neutralizada (P-3B.6-F7).
 * Retorna estado controlado INVOICING_DISABLED sin escribir en disco.
 */
const createInvoicePdfCore = async ({ requestedPeriodo = null, isInternalCron = false } = {}) => {
  return {
    ok: false,
    code: 'INVOICING_DISABLED',
    message: 'La facturación está deshabilitada'
  };
};

/**
 * Controlador HTTP para PDFs: Bloqueado con HTTP 503 (P-3B.6-F7)
 * Mantiene autenticación y autorización previa antes de responder INVOICING_DISABLED.
 */
const createInvoicePdf = async (req, res = response) => {  
  try {
    if (!req.uid) {
      return res.status(401).json({ ok: false, msg: 'No autenticado: token requerido' });
    }
    const adminDb = await admin.findById(req.uid);
    if (!adminDb) {
      return res.status(403).json({ ok: false, msg: 'Acceso denegado: solo administradores' });
    }

    return res.status(503).json({
        ok: false,
        code: 'INVOICING_DISABLED',
        message: 'La facturación está deshabilitada'
    });
  } catch (error) {
    console.error('Error en createInvoicePdf:', error.message);
    return res.status(500).json({ ok: false, msg: error.message || "Hable con el administrador" });
  }
};

/**
 * Consulta facturas con protección anti-IDOR
 */
const getInvoice = async (req, res = response) => {
     const idObject = req.params._id ? req.params._id.trim() : '';     
     if (!ObjectId.isValid(idObject)) {
         return res.status(400).json({ ok: false, msg: 'ID de administrador inválido' });
     }

     // Prevención estricta de IDOR: req.uid (del token JWT) debe coincidir con :_id
     if (req.uid !== idObject) {
         return res.status(403).json({
             ok: false,
             msg: 'Acceso denegado: no tiene autorización para consultar facturas de otro administrador'
         });
     }

     try {
       const id = new ObjectId(idObject);
       const invoice = await Invoice.aggregate([
         { $match : {$and: [{adminId: id}, { "viajes.cantidad": {$gt: 0}}] }},
         {
           $project: {  
               _id: 0,
               viajes: 1,
               descuento: 1,
               soporte: 1,
               periodo: 1,
               createdAt: 1
           }
         } 
       ]);
   
       if(invoice.length === 0) {
         return res.status(200).json({
           ok: false,
           msg: "No existen facturas a pagar"
         });
       }

       return res.status(200).json({
         ok: true,
         invoice: invoice
       });
     } catch (error) {      
       return res.status(500).json({
         ok: false,
         msg: "Hable con el administrador"
       });
     }
};

/**
 * Descarga PDF de factura con protección anti-IDOR
 */
const getInvoicePdf = async (req, res = response) => {
  const id = req.params._id ? req.params._id.trim() : '';  
  if (!ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, msg: 'ID de base inválido' });
  }

  try {
    // Control IDOR: Verificar que la base pertenezca al admin autenticado
    const baseDb = await Base.findById(id);
    if (!baseDb) {
        return res.status(404).json({ ok: false, msg: 'Base no encontrada' });
    }

    if (baseDb.adminId && baseDb.adminId.toString() !== req.uid) {
        return res.status(403).json({
            ok: false,
            msg: 'Acceso denegado: no es el administrador propietario de esta base'
        });
    }

    const item = id + '.pdf';
    const pathImagen = path.join(__dirname, '../invoices', item);
    if ( fs.existsSync( pathImagen ) ) {
        return res.sendFile( pathImagen );
    }

    const imageNoFound = path.join( __dirname, '../assets/no-image.jpg');
    return res.sendFile( imageNoFound );
  } catch (error) {  
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador"
    });
  }
};

module.exports = {
    createInvoice,
    getInvoice,
    createInvoicePdf,
    getInvoicePdf,
    createInvoiceCore,
    createInvoicePdfCore,
    getPriceDolarBlue,
    getPriceSoporte,
    getArgentinaPeriodo,
    dolarBlueAxios
};