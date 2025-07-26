const { response } = require('express');
const Travelhistory = require('../models/history'); 
const mongoose = require('mongoose');



const getTravelsDriver = async(req = request, res = response) => {          
  
    const { _id } = req.params;
   

    try {
        if (!mongoose.Types.ObjectId.isValid(_id)) {
          return res.status(400).json({ ok: false, msg: 'ID no válido' });
        }
    
        const viajes = await Travelhistory.aggregate([
            {
              $match: {
                $and: [
                  { driverId: new mongoose.Types.ObjectId(_id) }, // ✅ siempre convertir
                  { finalizado: true }
                ]
              }
            },
            {
              $sort: { createdAt: -1 } // ✅ paso útil si querés orden
            },
            {
              $project: {
                _id: 1,
                driverId: 1,
                ubicacion: 1,
                destino: 1,
                distancia: 1,
                precio: 1,
                finalizado: 1,
                createdAt: 1,
                updatedAt: 1
              }
            }
          ]);
        
        // 👇 calculamos el balance sumando todos los precios
        const balance = viajes.reduce((acc, viaje) => acc + (viaje.precio || 0), 0);  
    
        res.json({
          ok: true,
          total: viajes.length,
          balance,
          viajes,
        });
      } catch (error) {
        
        res.status(500).json({
          ok: false,
          msg: 'Error interno del servidor',
        });
      }

}


module.exports ={
    getTravelsDriver
}