const { response } = require('express');
const PDFDocument = require('pdfkit-table');
const Base = require('../models/base');
const Invoice = require('../models/invoices');
const {LocalStorage} = require('node-localstorage');
const db = new LocalStorage('./dolar');
const axios    = require('axios').default;
const ObjectId = require('mongodb').ObjectId;
const path = require('path');
const fs = require("fs");
const admin = require('../models/admin');

const dolarBlueAxios = axios.create({
  baseURL: "https://dolarapi.com/v1/dolares/blue",
  timeout: 5000
})  

const createInvoicePdf = async (req, res = response) => {  
   
  //  
  
  //precio soporte
  const precioSoporte = await getPriceSoporte();
  const soporte = Math.round(precioSoporte); 
  
  //precio dolar blue
   const dolar = await getPriceDolarBlue();
  
  //comprobar si existen bases a facturar
  const bases = await searchBases();
     
  


  if(!bases){
    
     return res.status(200).json({msg: "No existen bases activas"});

  } else {  


  for (let i = 0; i < bases.length; i++) {


    const element = bases[i];
    const id = element._id;
    
    // cantidad de viajes de una base
    const allViajes = element.viajes;//30

     // precio del viaje
    const precioPorViaje = dolar * 0.05;
    

    //precio de todos los viajes de una base
    const d = allViajes * precioPorViaje; 
    const precioAllViajes = Math.round(d);
  

    //descuento

    const a = precioAllViajes * 0.10;
    const desc = Math.round(a);

    // Asegurar que la carpeta invoices/ existe
    const invoicePath = path.join(__dirname, '../invoices');

    if (!fs.existsSync(invoicePath)) {
    fs.mkdirSync(invoicePath, { recursive: true });
    }

   
    // crear factura pdf
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    
    doc.pipe(fs.createWriteStream(`./invoices/${id}.pdf`));
  
    
    const table =  {
      headers: [
        { label:"", property: '', width: 150, renderer: null },
        { label:"INRI COMPANY", property: 'Inri', width: 220, renderer: null },
        { label:"", property: '', width: 125, renderer: null },
        
      ],     
      
    };
  
    doc.table(table, {
      prepareHeader: () => doc.font("Helvetica-Bold").fontSize(18),
      prepareRow: (row, indexColumn, indexRow, rectRow) => doc.font("Helvetica").fontSize(15),
     
      
    });
  
    doc.moveDown();
    
    const tableArray =  {
      headers: [
        { label:"Items", property: 'Items', width: 200, renderer: null },
        { label:"Precio", property: 'Precio', width: 200, renderer: null },
        { label:"Cantidad", property: 'Cantidad', width: 100, renderer: null },
        
      ],     
      rows: [
        ["Viajes",    `${precioAllViajes}`, `${allViajes}`],
        ["Descuento", `${desc}`, "1"],
        ["Soporte",   `${soporte}` , "1"],
        
      ],
    };
  
    doc.table(tableArray, {
      prepareHeader: () => doc.font("Helvetica-Bold").fontSize(18),
      prepareRow: (row, indexColumn, indexRow, rectRow) => {doc.font("Helvetica").fontSize(15),
      indexColumn === 0 && doc.addBackground(rectRow, (indexRow % 2 ? 'blue' : 'green'), 0.15);
    }
    });
  
    
    doc.moveDown();
    
    const tableGoodBye =  {
      headers: [
        { label:"", property: '', width: 250, renderer: null },
        { label:"Gracias por utilizar nuestro servicio, Saludos cordinales.", property: 'Inri', width: 250, renderer: null },     
        
      ],     
      
    };
  
    doc.table(tableGoodBye, {
      prepareHeader: () => doc.font("Helvetica").fontSize(14),   
     
      
    });
  
    
    doc.pipe(res);
    doc.end();
  
   }  
          
}

}

const getPriceDolarBlue = async () => {

  const  dolarBlue = await dolarBlueAxios.get();        
  const  data      = dolarBlue.data;        
  const dolar    =  data.venta;
 
return dolar;
}

const getPriceSoporte= async() =>{
  

const  dolarBlue = await dolarBlueAxios.get();        
const  data      = dolarBlue.data;        
const soporte    =  data.venta * 12;

return soporte;
}
 

const searchBases = async () => {

  const bases = await Base.aggregate([
    {
      $project:
       {
          base: 1,
          zonaName: 1,
          viajes: 1,
        }
    }
 ]) 

  return bases;


}




const createInvoice = async (req, res = response) => {
   
  
    
     try {       
       
      const admins = await Base.find();     
      

      if(admins.length === 0) {
       
        return res.json({ok:false,msg: "No existen bases creadas aun"});

      } 
     
      
     
      // obtener el precio del dolar blue 
      const dolar = await getPriceDolarBlue();

      //precio soporte

      const precioSoporte = await  getPriceSoporte();
      const soporteAprox = Math.round(precioSoporte); 
      
      
       // precio del viaje
       const precioPorViaje = dolar * 0.05;      
      

       const factura = [];      
       factura.length = 0;

      for (let i = 0; i < admins.length; i++) {

          const element   = admins[i];
          const adminId   = element.adminId; 

          //viajes hechos
          const viajes    = element.viajes;

          //precio de los viajes hechos
          const precio = viajes * precioPorViaje;         
          const precioAllViajes = Math.round(precio);

          //precio soporte tecnico
          const soporte   = soporteAprox;      
          
          //descuento

          const a = precioAllViajes * 0.10;
          const descuento = Math.round(a);

          const inv = {

             adminId: adminId,
             viajes:  {cantidad: viajes, precio: precioAllViajes},
             soporte: Number(soporte),
             descuento: Number(descuento)

          }
          
          const data = new Invoice(inv);
          await data.save();
          factura.push(inv);
                        
                          
      }           
      
      return res.status(200).json({factura});
        

    } catch (error) {
       
        return res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador'
        })
    }    

}

const getInvoice = async (req, res = response) =>{

     const idObject  = req.params._id.trim();     
     const id = new ObjectId(idObject);

     try {

      const invoice = await Invoice.aggregate([

        
        {
          $match : {$and: [{adminId: id}, { "viajes.cantidad": {$gt: 0}}] }},
      
      {
          $project:
           {  
              _id: 0,
              viajes: 1,
              descuento: 1,
              soporte: 1,
              createdAt: 1
            }
        } 
     ])
  
       if(invoice.length === 0) {
        return res.status(200).json({
          ok: false,
          msg: "No existen facturas a pagar"
         })
       
        }
        
       

        return res.status(200).json({
          ok: true,
          invoice: invoice
        })




     } catch (error) {      

      return res.status(500).json({
        ok: false,
        msg: "Hable con el administrador"
      })
      
     }
  
  
}

const getInvoicePdf = async (req, res = response) => {

  const id = req.params._id;  

  const extension = 'pdf';  
  const item = id + '.' + extension;
 

 try {  
  

  const pathImagen = path.join(__dirname, '../invoices', item);
    


   if ( fs.existsSync( pathImagen ) ) {
       return res.sendFile( pathImagen )
    }

    const imageNoFound = path.join( __dirname, '../assets/no-image.jpg');
    res.sendFile( imageNoFound );
  
  
 } catch (error) {  
 

  return res.status(500).json({
    ok: false,
    msg: "Hable con el administrador"
  })
 }


}


module.exports ={
    
    createInvoice,
    getInvoice,
    createInvoicePdf,
    getInvoicePdf
    
}