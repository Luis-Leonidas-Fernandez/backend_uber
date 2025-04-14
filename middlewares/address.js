const addressRepository = require('../respositories/address_repository');


const addDriverToAddress = async (id, assigDriver) =>  {     
        
    //Buscar Una Address agrega un Conductor a la misma
    const address = await addressRepository.findByIdAddDriver(id, assigDriver); 
    return address;   
    
}



module.exports = {
    addDriverToAddress
    
}