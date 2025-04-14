
const Zona = require('../models/zona');

class ZonaRepository {
  
  //Buscar si existe una Zona
  
  async findAll() {
    return Zona.find();
  }
  
  
  //Buscar la zona mas cercana
  
  async findZonaCercana(ubicacion) {

    const latUser = ubicacion[1];
    const longUser  = ubicacion[0];
  
    try {
     
      const zona = await Zona.aggregate([
      
        {
        $geoNear: {
          near: { type: "Point", coordinates: [longUser,latUser] },
            distanceField: "dist.calculated",
            maxDistance: 3000,                 
            includeLocs: "dist.location",
            spherical: true,
            
          },
          
        },

        {
          $lookup:
          {
              from: "bases",
              localField: "basesId",//zona
              foreignField: "_id",//bases
              as: "bases",
              pipeline: [                  
                  {
                   $sort: {viajes: 1}
                  },
                  { $project: { _id: 1, viajes: 1, base: 1, zonaName: 1} } //filtra el lookup
              ],
          }
      },
      { $project: { _id: 1, dist: 1, viajes: 1, bases: 1} },
      {
        $unwind: "$bases"
      },
       {
        $unwind: "$bases"
      },  
      
          
        
      ])          
      
      
      return zona;
        
    } catch (error) {

    const distancia = 5000;
    return distancia;
        
    }
    
  }


  async findById(id) {
    return Zona.findById(id);
  }

  async create(userData) {
    const zona = new Zona(userData);
    return zona.save();
  }

  async update(id, userData) {
    return Zona.findByIdAndUpdate(id, userData, { new: true });
  }

  async delete(id) {
    return Zona.findByIdAndDelete(id);
  }
}

module.exports = new ZonaRepository();
