const Address = require('../models/ubicacion');
const Driver = require( '../models/driver');


const driverConectado = async(uid = '') => {
   console.log('👉 Entrando a driverConectado con UID:', uid); 
    const driver = await Driver.findById(uid);

    if (!driver) {
        console.error('❌ No se encontró al conductor con ID:', uid);
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
    console.log('✅ Estado actualizado del conductor (conectado):', driver);
    return driver;
}


const driverDesconectado = async(uid = '') => {
    try {
        const driver = await Driver.findById(uid);
        if (!driver) {
            console.warn('⚠️ No se encontró al conductor:', uid);
            return;
        }
        driver.online = false;
        driver.status = 'no disponible';
        await driver.save();
        return driver;
    } catch (err) {
        console.error('❌ Error al actualizar el estado del driver:', err);
    }
};


const grabarLocation = async(payload) => {
   

    try {

        const miId = req.uid;

        Address.findOneAndUpdate({idDriver: miId},{$set: { mensaje: payload }} );

        return true;
    } catch (error) {
        return false;
    }

}


module.exports = {
    driverConectado,
    driverDesconectado,
    grabarLocation,

}
