const axios    = require('axios').default;
const {LocalStorage} = require('node-localstorage');


 const dolarBlueAxios = axios.create({
    baseURL: "https://dolarapi.com/v1/dolares/blue",
    timeout: 5000
})  


const getPrice = async () => {
        
     try {


        const  dolarBlue = await dolarBlueAxios.get();        
        const  data      = dolarBlue.data;        
        const costo   =  data.venta * 20 / 100; 
       
        const isCero     = await isCeroValue(costo);
        const db         = new LocalStorage('./dolar');
      

      

          if(isCero == false){          
              
           const  newPrice  = await convertPrice(costo);

           //Transform Data
           const joinPrice = newPrice.join('');
           const r = joinPrice.toString();
           const price = parseInt(r);            
           
                            
           // Guardar en Directorio
          
           const dolar = {
               venta: price
           };
           
           //save in local storage
           const name = 'costo_vaucher';
           db.setItem(name, JSON.stringify(dolar));            
          

           return dolar;
   
         }else {
            
            
           
           //Guardar en Directorio           
            const  newPrice  = costo;         
           
            // Transform Data           
           const r = newPrice.toString();
           const valueInt = parseInt(r);            
           

            const dolar = {
            venta: valueInt
           };
           
           //save in local storage
           const name = 'costo_vaucher';
           db.setItem(name, JSON.stringify(dolar));            
           
           return dolar;
         } 
       
        
     } catch (error) {       
        console.error('Error al obtener precio del dólar:', error.message);
        return null;
     }
}


const isCeroValue = async (costo) => {
    
    
    const a = costo;
    const array = [...`${a}`].map(c => parseInt(c));     

    const res = array.slice(-1);
    

    if(res == 0){
        return true;
    }else{
        return false;
    }
    
}


const convertPrice = async (costo) => {

    const a = costo;   
    
    if( typeof a !== 'number'  || !Number.isInteger(a)) {

     throw TypeError('El argumento recibido no es un numero');  
    
    } else{
     
        const array = [...`${a}`].map(c => parseInt(c)); 

        array.pop();    
        array.push(0);               
        array.join('') ; 
    
        return array;

    }   

    }
   

   module.exports = { getPrice  }





