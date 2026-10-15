const express = require('express');
const path = require('path');
require('dotenv').config();
const cors = require('cors');

const {dispatchDrivers}  = require('./service/dispatch_server');

const {getPrice}        = require('./Generators/price');
const { createVauchers}  = require('./service/cupon_server');
const { createPrice}    = require('./service/price_server');
const { createInvoiceJob, createInvoicePdfJob }    = require('./service/invoice_server');

const cron     = require("node-cron");
const mongoose = require('mongoose');


// DB Config
require('./database/config').dbConnection().catch(err => {
    console.error('Error al inicializar la base de datos:', err.message);
});


// App de Express
const app = express();

// Lectura y parseo del Body
app.use(express.json());

//Cors
app.use(cors());


// Node Server
const server = require('http').createServer(app);
module.exports.io = require('socket.io')(server);

require('./sockets/socket.js');


// Path público
const publicPath = path.resolve(__dirname, 'public');
app.use(express.static(publicPath));

// Path de acceso a fotos
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));


// Mis Rutas Usuarios
app.use('/api/login', require('./routes/auth'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/ubicaciones', require('./routes/ubicaciones'));


// Mis Rutas Drivers
app.use('/api/logindriver', require('./routes/authDriver'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/status', require('./routes/estadoViajes'));
app.use('/api/location', require('./routes/locationDriver'));
app.use('/api/travel-history', require('./routes/travelHistory'));


// Mis Rutas Admin
app.use('/api/loginadmin', require('./routes/authAdmin'));
app.use('/api/base', require('./routes/base'));
app.use('/api/booking', require('./routes/booking'));
app.use('/api/travel', require('./routes/bookingDriver'));


// Obtener viajes desde distintos roles
app.use('/api/viajes', require('./routes/viajes'));

// Asignar vaucher
app.use('/api/cupon', require('./routes/cupon'));

//Asignar Factura
app.use('/api/invoice', require('./routes/invoice'));

// Healthcheck y verificación de estado operativo
app.get('/api/health', (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    return res.status(isDbConnected ? 200 : 503).json({
        ok: isDbConnected,
        status: isDbConnected ? 'healthy' : 'database_disconnected',
        database: {
            connected: isDbConnected,
            readyState: mongoose.connection.readyState // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});



server.listen(process.env.PORT, (err) => {

    if (err) throw new Error(err);    
    console.log(`Servidor InriApp escuchando en puerto ${process.env.PORT}`);

});

//servicio de despacho de ordenes

 cron.schedule("*/1 * * * *", async function () {
    if (mongoose.connection.readyState !== 1) {
        console.warn('dispatchDrivers: ciclo omitido porque MongoDB no está conectado (readyState: %d)', mongoose.connection.readyState);
        return;
    }
    try {
        await dispatchDrivers();              
    } catch (err) {
        console.error('Error en cron dispatchDrivers:', err.message);
    }
},{
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
}); 


cron.schedule("0 22 * * *", async function () {  
    try {
        //GUARDA EN STORAGE EL PRECIO DEL DOLAR BLUE (22:00 Argentina)
        await getPrice();
    } catch (err) {
        console.error('Error en cron getPrice:', err.message);
    }
},{
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});


//servicio de despacho de vauchers cada 24 hs horario: 00:00 /"0 0 * * *"

cron.schedule("0 0 * * *", async function ()  { 
    try {
        //CREA UN VAUCHER RANDOM 01FG-25SD-3528-ADF25 (00:00 Argentina)
        await createVauchers();
    } catch (err) {
        console.error('Error en cron createVauchers:', err.message);
    }
},{
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});


cron.schedule("0 0 * * *", async function () {    
    try {
        // GUARDA EN COLLECTION USUARIO EL PRECIO DEL VAUCHER
        await createPrice();
    } catch (err) {
        console.error('Error en cron createPrice:', err.message);
    }
},{
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});

cron.schedule("0 0 25 * *", async function () {    
    if (mongoose.connection.readyState !== 1) {
        console.error('createInvoiceJob: MongoDB no conectado el día 25 de facturación, se omite ejecución');
        return;
    }
    try {
        //GUARDA EN COLLECTION INVOICE LA FACTURA MENSUAL A COBRAR
        await createInvoiceJob();
    } catch (err) {
        console.error('Error en cron createInvoiceJob:', err.message);
    }
},{
   scheduled: true,
   timezone: "America/Argentina/Buenos_Aires"
});


cron.schedule("0 0 26 * *", async function () {    
    if (mongoose.connection.readyState !== 1) {
        console.error('createInvoicePdfJob: MongoDB no conectado el día 26 de PDFs, se omite ejecución');
        return;
    }
    try {
        //GUARDA PDF FACTURA EN DIRECTORIO 
        await createInvoicePdfJob();
    } catch (err) {
        console.error('Error en cron createInvoicePdfJob:', err.message);
    }
},{
  scheduled: true,
  timezone: "America/Argentina/Buenos_Aires"
});
