const Address = require('../models/ubicacion');
const Driver = require( '../models/driver');


const driverConectado = async(uid = '', io) => {
   
    const driver = await Driver.findById(uid);

    if (!driver) {
       
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
    return driver;
}


const driverDesconectado = async(uid = '') => {
   
    try {
        const driver = await Driver.findById(uid);
        if (!driver) {            
            return;
        }
        driver.online = false;
        driver.status = 'no disponible';
        await driver.save();
        return driver;
    } catch (err) {
        return err;
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
