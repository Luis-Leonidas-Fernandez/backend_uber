const { createInvoiceCore, createInvoicePdfCore } = require('../controllers/invoice');

let isInvoiceJobRunning = false;
let isInvoicePdfJobRunning = false;

const createInvoiceJob = async () => {
    if (isInvoiceJobRunning) {
        console.warn('createInvoiceJob: Tarea ya en ejecución, ignorando ejecución superpuesta');
        return { ok: false, msg: 'Job already running' };
    }
    isInvoiceJobRunning = true;
    try {
        const response = await createInvoiceCore({ isInternalCron: true });
        return response;
    } catch (error) {
        console.error('Error en createInvoiceJob:', error.message);
        throw error;
    } finally {
        isInvoiceJobRunning = false;
    }
}

const createInvoicePdfJob = async () => {
    if (isInvoicePdfJobRunning) {
        console.warn('createInvoicePdfJob: Tarea ya en ejecución, ignorando ejecución superpuesta');
        return { ok: false, msg: 'Job already running' };
    }
    isInvoicePdfJobRunning = true;
    try {
        const response = await createInvoicePdfCore({ isInternalCron: true });
        return response;
    } catch (error) {
        console.error('Error en createInvoicePdfJob:', error.message);
        throw error;
    } finally {
        isInvoicePdfJobRunning = false;
    }
}

module.exports = {
    createInvoiceJob,
    createInvoicePdfJob
}