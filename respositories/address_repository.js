const Address = require('../models/ubicacion');

class AddressRepository {

  
  //Busca una Address y agrega un conductor: UPDATE METHOD
  async findByIdAddDriver(id, idDriver, baseLocation) {
    
    const result = await Address.findOneAndUpdate({miId: id },
    {
    $set: { 
      idDriver: idDriver,
      estado: false },
    $push: {
      mensaje: {
        type: 'Point',
        coordinates: baseLocation
        },
    }  
    },
      { new: true });
           
    return result; 
  }

  async findAll() {
    return Address.find();
  }

  async create(userData) {
    const address = new Address(userData);
    return address.save();
  }

  async update(id, userData) {
    return Address.findByIdAndUpdate(id, userData, { new: true });
  }

  async delete(id) {
    return Address.findByIdAndDelete(id);
  }

  
}

module.exports = new AddressRepository();
