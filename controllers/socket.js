const Address = require('../models/ubicacion');
const Driver = require( '../models/driver');


const driverConectado = async(uid = '', io) => {
   
    const driver = await Driver.findById(uid);

    if (!driver) {
        console.log('⛔ Driver no encontrado con UID:', uid);
        return null;
    }

    driver.online = true;
    const hasActiveOrder = await Address.findOne({ idDriver: uid });

    if (hasActiveOrder) {
        driver.status = 'no disponible';
    } else {
        driver.status = 'disponible';
        driver.order = 'libre';
    }

    await driver.save();
    console.log('✅ Driver conectado:', driver.nombre, '| Estado actualizado:', {
        online: driver.online,
        status: driver.status,
        order: driver.order
    });
    return driver;
}


const driverDesconectado = async(uid = '') => {
   
    try {
        const driver = await Driver.findById(uid);
        if (!driver) {    
            console.log('⛔ Driver no encontrado al desconectar. UID:', uid);        
            return;
        }
        driver.online = false;
        driver.status = 'no disponible';
        await driver.save();

        console.log('🔌 Driver desconectado:', driver.nombre, '| Estado actualizado:', {
            online: driver.online,
            status: driver.status
        });
        return driver;
    } catch (err) {
        return err;
    }
};


const grabarLocation = async(payload) => {
   

    try {
        const { idDriver, mensaje } = payload;
        console.log('⛔ Payload :', idDriver, mensaje);

        if (!idDriver || !mensaje) {
            console.log('⛔ Payload incompleto:', payload);
            return false;
        }

        const updated = await Address.findOneAndUpdate(
            { idDriver },
            { $set: { mensaje } },
            { new: true }
        );

        if (!updated) {
            console.log('❗ No se encontró Address para actualizar ubicación');
        }

        return true;
    } catch (error) {
        console.error('⛔ Error al grabar ubicación:', error);
        return false;
    }

}


module.exports = {
    driverConectado,
    driverDesconectado,
    grabarLocation,

}
