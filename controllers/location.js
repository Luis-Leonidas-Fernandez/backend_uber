const Address=  require('../models/ubicacion');

const grabarLocation = async (location) => {

  // 1. Extrae latitud, longitud e ID de la orden desde el objeto recibido
  const lat = location.mensaje.coordinates[0];
  const long = location.mensaje.coordinates[1];
  const idOrder = location.idOrder;

  // 2. Muestra en consola el ID de la orden y las coordenadas recibidas
 

  try {
    // 3. Busca el documento Address en la base de datos por su ID
    const documento = await Address.findById(idOrder);

    // 4. Si no se encuentra el documento, se informa y se retorna false
    if (!documento) {
   
      return false;
    }

    // 5. Prepara la nueva coordenada como string (ej: "-60.44,-26.77") para comparación
    const nuevaCoord = [lat, long].join(',');

    // 6. Convierte todas las coordenadas anteriores (mensaje[]) a strings para comparar
    const coordenadasExistentes = documento.mensaje.map(m => m.coordinates?.join(','));

    // 7. Muestra las coordenadas ya almacenadas en consola
  

    // 8. Si la coordenada ya fue registrada, no la vuelve a guardar y termina
    if (coordenadasExistentes.includes(nuevaCoord)) {
     
      return true;
    }

    // 9. Crea un nuevo objeto GeoJSON con la coordenada recibida
    const nuevaUbicacion = {
      type: 'Point',
      coordinates: [lat, long],
    };

    // 10. Actualiza el documento: agrega la nueva ubicación al array mensaje[]
    await Address.findByIdAndUpdate(
      idOrder,
      { $push: { mensaje: nuevaUbicacion }, 
        $set:  { updatedAt: new Date() }
      },
      { new: true }
    );

    // 11. Informa que la ubicación fue guardada exitosamente
  
    return true;

  } catch (error) {
    // 12. Captura e informa cualquier error ocurrido durante el proceso
  
    return false;
  }
};


      
      

module.exports= {
     grabarLocation
}