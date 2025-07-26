const mongoose = require('mongoose');

const TravelHistorySchema = new mongoose.Schema({

    driverId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true 
    },
    ubicacion: { 
        type: { 
            type: String,
            enum: ['Point'],
            default: 'Point' 
        },
        coordinates: { 
            type: [Number],
            required: true 
        }, // [lng, lat]
    },
    destino: { 
        type: { 
            type: String,
            enum: ['Point'],
            default: 'Point' 
        },
        coordinates: { 
            type: [Number],
            required: true 
        },
    },
    distancia: Number, // en KM
    precio: Number, // en tu moneda
    finalizado: { 
        type: Boolean,
        }
}, { timestamps: true });

module.exports = mongoose.model('TravelHistory', TravelHistorySchema);