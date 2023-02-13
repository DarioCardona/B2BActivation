import { Body, ConsoleLogger, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { CreateActivationDto } from './dto/create-activation.dto';
import { UpdateActivationDto } from './dto/update-activation.dto';
import { Activation, ActivationDocument } from './schema/activation.schema';
import {ParametersService} from '../parameters/parameters.service';
import Ajv from "ajv";
import { debugPort } from 'process';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, map, Observable } from 'rxjs';
import { Console, timeLog } from 'console';
import axios from 'axios'


@Injectable()

export class ActivationService {

  constructor(@InjectModel(Activation.name,'activation') private activationModule : Model <ActivationDocument>, private parametersService : ParametersService ,private readonly httpService: HttpService){
  
  }

  
  async create(createActivationDto: CreateActivationDto) {
    const error = {
      code : 101,
      description: "La estructura ingresada no cumple con los requerimientos minimos"
    }

    /*let exonarated = {
      exonerated : "" ,
      exonaratedCard:"",
      exonaratedDueDate:"",
      diplomaticExonarated:""

    }*/

    /*let lines = [{
      gestionType:"",
      line:"",
      Plan:"",
      lineType: "",
      status: "",
      debt: 0,
      DPG: "",
      DPGValue: 0,
      device: "",
      warehouse: "",
      brand: "",
      model: "",
      extrafinancing: "",
      total:0,
      activationStatus: ""
    }]  */
    let B2BActivationObject : Record<string, any> = {};
    console.log(createActivationDto)
    const pass = this.validSchema("createActivationSchema",createActivationDto);
    console.log(pass);
    if(pass){
      B2BActivationObject = createActivationDto;
      //B2BActivationObject.exonarted = exonarated;
      //B2BActivationObject.lines = lines;
      const ID = await this.parametersService.getID();
      B2BActivationObject.requestID = ID.seq;
     

    
      const activationCreated = await this.activationModule.create(B2BActivationObject)
      return activationCreated;
    } else {
      return error;
    }
    
    
  }

  async approvalProcess(body : any){
    const error = {
      code : 101,
      description: "La estructura ingresada no cumple con los requerimientos minimos"
    }

    const pass = this.validSchema("approvalProcess",body);
    console.log(pass);

    if(pass){
      let orderRequest = await this.findOne(body.id); //obtener el registro por ID 
      
      if('code' in orderRequest){ //Si el id que enviaron no existe 
        error.code = 102;
        error.description = `El id ${body.id} no existe a nivel de base de datos`;
        
      } else { // el ID existe en la DB
        
        if ('answered' in body){ //Actualizar la respuesta si aplica
          let position = orderRequest.approverHistory.length -1; //obtiene la ultima posición del arreglo del historial
          let temporalApproval: any = orderRequest.approverHistory[position];
          let approval = { // Objeto donde se contruye el registro de aprobación
            approver :  body.answered.approver,
            function :  temporalApproval.function, 
            comment : body.answered.comment,
            status : body.answered.approverStatus,
            assignedDate : temporalApproval.assignedDate,
            responseDate : new Date 
          }
          
          orderRequest.approverHistory.pop(); // Eliminar el ultimo registro
          orderRequest.approverHistory.push(approval); // Insertar 
        }

        let validationResponse; // variable donde se guardan las respuestas de los metodos
      
        switch(body.orderStatus){
          case "Creada":
            validationResponse = await this.approvalProcessCreated(orderRequest);
            break;
          case "Aprobación Cliente":
            validationResponse = await this.approvalProcessClientAcceptance(orderRequest,body.answered.approverStatus);
            break;
          case "Excepción":
            validationResponse = await this.approvalProcessException(orderRequest,body.answered.approverStatus);
            break;
        }
        console.log(JSON.stringify(validationResponse));
        //actualizar el objeto JSON

        const updateActivation = await this.update(body.id,  validationResponse.newOrderRequest )
        return updateActivation;
      }
      
    } 

    return error;
    
  }

  async approvalProcessCreated (orderRequest: any){
    
    let newOrder = { // objeto donde se almacena el JSON de respuesta
      orderstatus : "" ,
      newOrderRequest : orderRequest
    };
    let user;
    let userTemp ={
      name:""
    };
    let pass = false; // variable que indica si existen lineas a activar o no
    for(let i = 0; i< orderRequest.lines.length; i++){ // recorre las linesa y verifica que esten disponibles para aplicar
      if(orderRequest.lines[i].status === 'Disponible' ){
        pass = true; // indica que si existen lineas a activar
      }
    }

    if (!pass){ // validación si existen lineas a aplicar
      newOrder.orderstatus='Rechazado';
      newOrder.newOrderRequest.requestStatus='Rechazado'

      //Envio de correo.
      const mail = this.sendEmail( orderRequest.sellerUser+'@tigo.com.hn','Rechazado','','1234567');

    } else {
      console.log(orderRequest.client);
      if( JSON.stringify(orderRequest.client) !== JSON.stringify({})){ // Valida si el cliente es nuevo o no
        newOrder.orderstatus='Excepción';
        newOrder.newOrderRequest.requestStatus='Excepción'

        let approverParameter : Record<string, any> = {}; //variable para guardar la respuesta
        approverParameter = await this.parametersService.findByName("Approvers"); // se obtienen los aprobadores de los parametros
        let approverParameterTemp = approverParameter[0];
        user = await this.getExceptionApproverByTicket(approverParameterTemp); //Obtener el usuario por tickets

  
      } else { // significa que esta listo para aprobación del cliente 
        newOrder.orderstatus ='Aprobación Cliente';
        newOrder.newOrderRequest.requestStatus ='Aprobación Cliente';
        userTemp.name = orderRequest.sellerUser;
        user = userTemp;
        
      }

      //obtener aprobador
      const approverArray = await this.getApprovers(user.name,newOrder.orderstatus,orderRequest.sellerUser,"orderRequest._id"); //Obtener la jearquia de aprobación
      //console.log(JSON.stringify(approverArray));
      for(let i = 0; i< approverArray.length; i++){
        newOrder.newOrderRequest.approverHistory.push(approverArray[i]);
      }

      

    }   
    
    return newOrder; 
    
  }

  async approvalProcessClientAcceptance(orderRequest: any, orderStatus : string ){
    
    let newOrder = { // objeto donde se almacena el JSON de respuesta
      orderstatus : "" ,
      newOrderRequest : orderRequest
    };
        

    let pass = false; // variable que indica si existen lineas con DPG
    let exception = false; // variable que indica si existe en la solicitud un responsable de excepción 
    let user; // variable para almacenar el usuario responsable
    let approverFullName = "";

    if(orderStatus === "Rechazado"){ // significa que debe ir a excepción
     
      let approverParameter : Record<string, any> = {}; //variable para guardar la respuesta
      approverParameter = await this.parametersService.findByName("Approvers"); // se obtienen los aprobadores de los parametros
        
      let approverParameterTemp = approverParameter[0];

      if('approverHistory' in orderRequest){ // significa que ya fue asignado anteriormente el aprobador
        for(let i = 0; i< orderRequest.approverHistory.length; i++){ // recorre el historial para identificar quien atendio la gestion
          if(orderRequest.approverHistory[i].function === 'Excepción' ){
            exception = true; 
            approverFullName = orderRequest.approverHistory[i].approver;
            //console.log(approverFullName);
            break;
          }
        }
        if(approverFullName === ""){
          user = await this.getExceptionApproverByTicket(approverParameterTemp); //Obtener el usuario por tickets
        }else{
          user = await this.getExceptionApproverByName(approverParameterTemp,approverFullName);//Obtener el usuario por nombre
        }
        

      } else { // se debe obtener un nuevo aprobador para la excepción
        
        user = await this.getExceptionApproverByTicket(approverParameterTemp); //Obtener el usuario por tickets
         console.log(user);
        //crear el JSON 
      }
      
      console.log(JSON.stringify(user));
      const approverArray = await this.getApprovers(user.name,"Excepción",orderRequest.sellerUser,"orderRequest._id"); //Obtener la jearquia de aprobación
      //console.log(JSON.stringify(approverArray));
      for(let i = 0; i< approverArray.length; i++){
        newOrder.newOrderRequest.approverHistory.push(approverArray[i]);
      }
      
      
      newOrder.orderstatus='Excepción'; // actualización de la respuesta
      newOrder.newOrderRequest.requestStatus='Excepción';


    } else{ // significa que debe avanzar a la activación
      
      for(let i = 0; i< orderRequest.lines.length; i++){ // recorre las linesa y verifica que apliquen a DPG
        if(orderRequest.lines[i].DPG === 'Si' ){
          pass = true; 
        }
      }

      if (pass){ // significa que encontro lineas a activar con DPG
        newOrder.orderstatus='DPG';
        newOrder.newOrderRequest.requestStatus='DPG'
      }else { // significa que la orden esta lista para enviar las activaciones
        newOrder.orderstatus='Procesar';
        newOrder.newOrderRequest.requestStatus='Procesar'
      }
      //Envio de correo (Notificar al solicitante que ya avanzo la gestion y a que debe ir)

      const mail = this.sendEmail( orderRequest.sellerUser+'@tigo.com.hn','newOrder.orderstatus','',orderRequest._id);
    }

    return newOrder;

  }

  async approvalProcessException(orderRequest: any, orderStatus : string ){
    let newOrder = { // objeto donde se almacena el JSON de respuesta
      orderstatus : "" ,
      newOrderRequest : orderRequest
    };
    let user;
    let userTemp ={
      name:""
    };
    if(orderStatus === "Rechazado"){ //si se rechaza termina
      
      newOrder.orderstatus='Rechazado';
      newOrder.newOrderRequest.requestStatus='Rechazado';

      //envio de correo
      const mail = this.sendEmail( orderRequest.sellerUser+'@tigo.com.hn','Rechazado','',orderRequest._id);

    } else { // si se aprueba significa que debe avanzar a Aprobación cliente
      
      newOrder.orderstatus ='Aprobación Cliente';
      newOrder.newOrderRequest.requestStatus ='Aprobación Cliente';
      userTemp.name = orderRequest.sellerUser;
      user = userTemp;
      
      const approverArray = await this.getApprovers(user.name,newOrder.orderstatus,orderRequest.sellerUser,"orderRequest._id"); //Obtener la jearquia de aprobación
      for(let i = 0; i< approverArray.length; i++){
        newOrder.newOrderRequest.approverHistory.push(approverArray[i]);
      }
    }

    return newOrder;
  }

  async findAll(findAllActivation) {
    let searchElement : Record<string, any> = {}; //variable para construir el JSON
    let error : Record<string, any> = {}; // Variable para la construccion del error
    let pass = false; // Bandera para realizar la consulta o no
    let getActivationBy ; // variable donde se guarda la respuesta del a consulta
    if(findAllActivation.roll === 'Solicitante'){ // desiciones para saber que query ejecutar (Puede pasarse a un parametro para mas potencia)
      searchElement.seller = findAllActivation.user;
      pass = true;
    } else if (findAllActivation.roll === 'Aprobador'){
      searchElement.approver = findAllActivation.user;
      pass = true;
    } else if(findAllActivation.roll === 'Administrador'){
      pass = true;
    }else{
      error.code = 101;
      error.description = "El roll indicado no existe";
      getActivationBy = error;
    }
    if(pass){ // Desicion si debe realizar la consulta a DB
      getActivationBy = await this.activationModule.find(searchElement)
      if(JSON.stringify(getActivationBy) === JSON.stringify([])){ // Vaidación que no este vacia la respuesta
        error.code = 102;
        error.description = "El usuario indicado no existe";
        getActivationBy = error;
      }
    }

    return getActivationBy;
  }

  async findOne(id: string) {
    const error = {
      code : 101,
      description: "El id indicado no existe en la base de datos"
    }
    try{
      const getActivation = await this.activationModule.findById(id).lean()
      return getActivation;
    } catch (e){
      return error;
    }
    
  }

  async update(id: string, updateActivationDto: UpdateActivationDto) {
    const error = {
      code : 101,
      description: "El id indicado no existe en la base de datos"
    }
    try{
      const _id =  new mongoose.Types.ObjectId(id);
      const updateActivation = await this.activationModule.findOneAndUpdate({_id:_id},  {$set:updateActivationDto}, {new:true} ).lean();
      return updateActivation;
    } catch (e){
      return error;
    }
  }


  validSchema(step : string , resquestSchema : object){

    const ajv = new Ajv() // options can be passed, e.g. {allErrors: true}

    const schema = this.getSchema(step);

    //console.log("soy el schema"+JSON.stringify(schema));
    
    const validate = ajv.compile(schema)
    const valid = validate(resquestSchema)

    return valid;

  }


  getSchema(schema :string){

    const seller = {
      type:"object",
        properties:{
          sellerCode: {type: "number"},
          sellerName: {type: "string" },
          channel: {type: "string" },
          territory: {type: "string"},
          clientSegment: {type: "string"}
        },
      required: ["sellerCode","channel","territory","clientSegment","sellerName"],
      additionalProperties: false,
    }

    const createActivationSchema = {
      type: "object",
      properties: {
        sellerUser: {type: "string"},
        seller: seller,
      },
      required: ["sellerUser","seller"],
      additionalProperties: false,
    }

    const mailAnswered = {
      type:"object",
        properties:{
          approver: {type: "string"},
          comment: {type: "string" },
          approverStatus: {type: "string"},
        },
      required: ["approver","comment","approverStatus"],
      additionalProperties: false,
    }

    const approvalProcess = {
      type:"object",
        properties:{
          id: {type: "string"},
          orderStatus: {type: "string" },
          answered: mailAnswered
        },
      required: ["id","orderStatus"],
      additionalProperties: false,
    }

    

    const exonerated = {
      type:"object",
      properties: {
        exonerated: {type: "string"},
        exoneratedCard: {type: "string"},
        exonaratedDueDate: {type: "string"},
        diplomaticExonarated: {type: "string"},
      },
      required: ["exonerated"],
      additionalProperties: false,
    } 
    
    const company = {
      type:"object",
      properties: {
        companyName: {type: "string"},
        contactNames: {type: "string"},
        contactSurnames: {type: "string"},
        contactDocumentType: {type: "string"},
        clientType: {type: "string"},
        clientAccount: {type: "string"},
      }
    }

    const client = {
      type:"object",
      properties: {
        legalRepresentative: {type: "string"},
        clientName: {type: "string"},
        representativeMail: {type: "string"},
        representativePhone: {type: "string"},
        representativeDNI: {type: "string"},
        cityMunicipaly: {type: "string"},
        neighbourhood: {type: "string"},
        address: {type: "string"},
        principalPhone: {type: "string"},
      }
    }

    const line = {
      type: "object",
      properties: {
        gestionType: {type: "string"},
        line: {type: "string"},
        plan: {type: "string"},
        lineType: {type: "string"},
        status: {type: "string"},
        debt: {type: "string"},
        DPG: {type: "string"},
        DPGValue: {type: "string"},
        device: {type: "string"},
        warehouse: {type: "string"},
        brand: {type: "string"},
        model: {type: "string"},
        extrafinancing: {type: "string"},
        total: {type: "string"},
        activationStatus: {type: "string"},
      }
    }

    const approverHistory = {
      type: "object",
      properties: {
        approver: {type: "string"},
        function: {type: "string"},
        assignedDate: {type: "string"},
        responseDate: {type: "string"},
        comment: {type: "string"},
        status: {type: "string"},
      }
    }
  let temp ; 
   switch (schema){
    case "createActivationSchema":
      temp = createActivationSchema;
      break;
    case "approvalProcess":
      temp = approvalProcess;
      break;
   }

    return temp;
  }

  async getUser(user: string){
    //console.log(this.httpService.get('http://192.168.107.101:8018/?user=dario.cardona'));
    return this.httpService.get('http://192.168.107.101:8011/?user='+user).pipe(map((res) => res.data));
  }

  async getApprovers (user: string, userFunction: string, requester:string, requestID: string){
    
    
    const myObservable = await this.getUser(user); // Invocación del WS de consulta RRHH
    const activeUser = await lastValueFrom(myObservable);
    
    
    let newApproverArray = []; // arreglo para almacenar los aprobadores
    
    let sendEmailUser= "";

    for(let i = 0; i< activeUser.data.length; i++){
          
      let temp = <any> { // objeto temporal aprobador
        approver :"",
        function : userFunction,
        comment:"",
        status:"",
        assignedDate: new Date()
      }
      
      if(activeUser.data[i].reassign === "true"){ // cuenta con una delegación 
        
        temp.approver = activeUser.data[i].FullName;
        temp.status = "Delegado";
        temp.comment = activeUser.data[i].comment;
        temp.responseDate = new Date();
        newApproverArray.push(temp);

      }else {// esta disponible para asignación

        temp.approver = activeUser.data[i].FullName;
        temp.status = "Pendiente";
        sendEmailUser = activeUser.data[i].UserLogin;
        newApproverArray.push(temp);
        
      }
     }

     //envio de correo
     const mail = this.sendEmail( sendEmailUser+'@tigo.com.hn',userFunction, requester+'@tigo.com.hn','1234567');
     
     return newApproverArray;

  }

  async getExceptionApproverByTicket (approverParameterTemp: any){
    let minAssignedTickets = 10000000;
    let user;
    let lastElement = 0; 
      
    for(let i = 0 ; i< approverParameterTemp.parameter.length;i++){ // se recorren los aprobadores para identificar el que tenga menos tickets
  
      if(approverParameterTemp.parameter[i].assignedTickets < minAssignedTickets){// actualiza a quien tiene menos
        
        user = approverParameterTemp.parameter[i]; // obtener el objeto aprobador del parametro
        minAssignedTickets = approverParameterTemp.parameter[i].assignedTickets;
        lastElement = i;
      }
    }
    approverParameterTemp.parameter[lastElement].assignedTickets = minAssignedTickets + 1;
    // el patch para sumarle 1 al usuario
    const updateApproversParameter = this.parametersService.update(approverParameterTemp._id,approverParameterTemp);
    return user;
  }

  async getExceptionApproverByName (approverParameterTemp: any, approverFullName: string){
    console.log(approverFullName);
    console.log(JSON.stringify(approverParameterTemp));
    let user;   
    for (let i = 0; i< approverParameterTemp.parameter.length; i++){ // recorre los participantes para obtener el nombre de usuario
      if(approverParameterTemp.parameter[i].fullname.toUpperCase() === approverFullName.toUpperCase() ){// actualiza a quien tiene el mismo nombre
        
        user = approverParameterTemp.parameter[i]; // obtener el objeto aprobador del parametro
        break;
      }
    }
    
    return user;
  }

  async sendEmail(to: string, task: string, cc :string , id : string){
    const URL = 'http://192.168.161.61:7006/EmailService/EmailService';

    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ema="http://tigo.hn/resources/emailService">
       <soap:Header />
       <soap:Body>
          <ema:sendMessage>
             <from>activacionesotroscanalesb2b@tigo.com.hn</from>
             <SendTo>
                <!--1 or more repetitions:-->
                <send>
                   <to>${to}</to>
                </send>
             </SendTo>
             <!--Optional:-->
             <CC>${cc}</CC>
             <subject>Activaciones B2B Canles Externos id: ${id}</subject>
             <body>Buen dia estimado, 
             Gusto de saludarle, le comentamos que tiene una asignación para la tarea de ${task} , 
             
             de antemano muchas garcias, 
             Saludos, 
             </body>
          </ema:sendMessage>
       </soap:Body>
    </soap:Envelope>`;
  
  
  let result;
  let Answered;
  try{
      result = await axios.post(URL,xmlBody,{
          headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8'
          }});
          //console.log(result.data);
     // console.log(Answered)
  }catch(err){
      Answered = err;
  }
  
    console.log(Answered);
    return true;
  }

}
