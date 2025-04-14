const Driver = require('../models/driver');
const {comprobarNullDriver} = require('../helpers/test_null');

class DriverRepository {
  
  //Buscar Conductores de una Base
  
  async findAll(idBase) {
    const id = idBase;  
    
    const drivers = await Driver.find({ $and: [{ base: id}, {online: true},{order: 'libre'}, {status: 'disponible'}]
    }).sort({online: 'desc', order: -1, viajes: 1}).limit(20).exec()     

   
    const obj =  await comprobarNullDriver(drivers);       
    
    return obj;   
  }  


  //Actualiza el Estatus del Conductor 
  async findByIdUpdateStatus(assignedDriver, noDisponible) {
    const resp = await Driver.findOneAndUpdate({_id: assignedDriver}, {$set: {status: noDisponible}}, { upsert: true });
    return resp;  
  }

  
  


  async create(userData) {
    const driver = new Driver(userData);
    return driver.save();
  }

  async update(id, userData) {
    return Driver.findByIdAndUpdate(id, userData, { new: true });
  }

  async delete(id) {
    return Driver.findByIdAndDelete(id);
  }
}

module.exports = new DriverRepository();
