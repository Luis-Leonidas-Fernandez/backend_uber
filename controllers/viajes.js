const { response } = require( 'express');
const Address = require('../models/ubicacion');
const ObjectId = require('mongodb').ObjectId;


const obtenerViajeUsuario = async (req, res = response) => {
    const _id = req.params._id;
  
    try {
      const respuesta = await Address.aggregate([
        {
          $match: {
            miId: new ObjectId(_id),
          },
        },
        {
          $sort: { createdAt: -1 } // Ordenamos por la orden más reciente
        },
        {
          $limit: 1 // Solo queremos una orden
        },
        {
          $lookup: {
            from: "drivers",
            localField: "idDriver",
            foreignField: "_id",
            as: "driver"
          }
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                { $arrayElemAt: ["$driver", 0] },
                "$$ROOT"
              ]
            }
          }
        },
        {
          $project: {
            _id: 1,
            nombre: 1,
            apellido: 1,
            vehiculo: 1,
            modelo: 1,
            patente: 1,
            order: 1,
            email: 1,
            online: 1,
            estado: 1,
            mensaje: "$mensaje",
            idDriver: 1,
            finalizado: 1,
            createdAt: 1,
            updatedAt: 1,
            distanciaKm: 1,
            horaEsperaInicio: 1,
            horaEsperaFin: 1,
            precio: 1
          }
        }
      ]);
  
      const resultado = Object.assign({}, ...respuesta);   
  
      if (Object.keys(resultado).length === 0) {
        // 🟥 No hay orden → devolvemos null
        return res.status(200).json({ address: null });
      }
  
      // ✅ Parseamos coordenadas del mensaje
      const ultimoMensaje = resultado.mensaje[resultado.mensaje.length - 1];
      const ubicacion = { type: ultimoMensaje.type, coordinates: ultimoMensaje.coordinates };
     
  
      // ✅ Verificamos si tiene conductor asignado
      const hasDriver = resultado.idDriver !== undefined &&
                        resultado.idDriver !== null &&
                        resultado.idDriver !== '';

               
  
      const address = {
        ok: hasDriver, // 👈 Esto lo usa Flutter para saber si ya hay conductor
        _id: resultado._id,
        email: resultado.email,
        nombre: resultado.nombre,
        apellido: resultado.apellido,
        vehiculo: resultado.vehiculo,
        modelo: resultado.modelo,
        patente: resultado.patente,
        online: resultado.online,
        order: resultado.order,
        estado: resultado.estado,
        createdAt: resultado.createdAt,
        updatedAt: resultado.updatedAt,
        mensaje: ubicacion,
        destino: resultado.destino,
        distanciaKm: resultado.distanciaKm, //agregado reciente
        precio: resultado.precio, // agregado reciente
        idDriver: resultado.idDriver,
        horaEsperaInicio: resultado.horaEsperaInicio,
        horaEsperaFin: resultado.horaEsperaFin,
        finalizado: resultado.finalizado
      };
     
      return res.status(200).json({ address });
  
    } catch (error) {
     
      return res.status(500).json({
        ok: false,
        msg: 'Hable con el administrador'
      });
    }
  };
  




module.exports = {
    obtenerViajeUsuario
}