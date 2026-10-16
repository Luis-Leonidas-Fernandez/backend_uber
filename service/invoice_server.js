// P-3B.6-F7: Funciones internas de facturación y generación de PDFs desactivadas formalmente.

const createInvoiceJob = async () => {
    console.warn('createInvoiceJob: La facturación automática está deshabilitada (P-3B.6-F7)');
    return {
        ok: false,
        code: 'INVOICING_DISABLED',
        message: 'La facturación está deshabilitada'
    };
};

const createInvoicePdfJob = async () => {
    console.warn('createInvoicePdfJob: La generación de PDFs está deshabilitada (P-3B.6-F7)');
    return {
        ok: false,
        code: 'INVOICING_DISABLED',
        message: 'La generación de PDFs está deshabilitada'
    };
};

module.exports = {
    createInvoiceJob,
    createInvoicePdfJob
};