const  mongoose = require('mongoose');


const dbConnection = async() => {

    try {
        mongoose.set('strictQuery', true);
        mongoose.set('autoIndex', false); // Control explícito de índices para producción

        // Eventos de ciclo de vida de la conexión
        mongoose.connection.on('connected', () => {
            console.log('MongoDB: Conexión establecida con éxito');
        });
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB: Error en la conexión:', err.message);
        });
        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB: Conexión perdida. Esperando reconexión automática...');
        });

        await mongoose.connect(process.env.DB_URL, {
            autoIndex: false,
            serverSelectionTimeoutMS: 5000,
        });

    } catch (error) {       
        console.error('Error al conectar con la base de datos MongoDB:', error.message);
        throw new Error('Error en la base de datos - Hable con el admin');
    }

}

module.exports = {
    dbConnection
}