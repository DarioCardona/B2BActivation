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
      console.log(createActivationDto)

    
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
      
      let validationResponse; // variable donde se guardan las respuestas de los metodos
      
      switch(body.orderStatus){
        case "Creada":
          validationResponse = await this.approvalProcessCreated(orderRequest);
          //console.log(JSON.stringify(validationResponse) + "soy la respuesta");
          break;
        case "Aprobación Cliente":
          //console.log(orderRequest);
          validationResponse = await this.approvalProcessClientAcceptance(orderRequest,body.answered.approverStatus);
          break;
        case "Excepción":
          break;
      }

      return "Balalala"
    } else{
      return error;
    }

  }

  async approvalProcessCreated (orderRequest: any){
    
    let newOrder = { // obbjeto donde se almacena el JSON de respuesta
      orderstatus : "" ,
      newOrderRequest : orderRequest
    };

    if( orderRequest.hasOwnProperty('client')){ // Valida si el cliente es nuevo o no
      newOrder.orderstatus='Excepción';
      newOrder.newOrderRequest.requestStatus='Excepción'

    } else { // significa que esta listo para aprobación del cliente 
      newOrder.orderstatus='Aprobación Cliente';
      newOrder.newOrderRequest.requestStatus='Aprobación Cliente'
    }

    let pass = false; // variable que indica si existen lineas a activar o no
    for(let i = 0; i< orderRequest.lines.length; i++){ // recorre las linesa y verifica que esten disponibles para aplicar
      if(orderRequest.lines[i].status === 'Disponible' ){
        pass = true; // indica que si existen lineas a activar
      }
    }

    if (!pass){ // validación si existen lineas a aplicar
      newOrder.orderstatus='Rechazada';
      newOrder.newOrderRequest.requestStatus='Rechazada'
    }    
    
    return newOrder; 
    
  }

  async approvalProcessClientAcceptance(orderRequest: any, orderStatus : string ){
    
    let newOrder = { // objeto donde se almacena el JSON de respuesta
      orderstatus : "" ,
      newOrderRequest : orderRequest
    };
    
    let mail = { // objeto de respuesta para el envio de correo
      to:"",
      mailBody:""
    }
    

    let pass = false; // variable que indica si existen lineas con DPG
    let exception = false; // variable que indica si existe en la solicitud un responsable de excepción 
    let user; // variable para almacenar el usuario responsable

    if(orderStatus === "Rechazado"){ // significa que debe ir a excepción
     
      if(orderRequest.hasOwnProperty('approverHistory')){ // significa que ya fue asignado anteriormente el aprobador
        for(let i = 0; i< orderRequest.approverHistory.length; i++){ // recorre el historial para identificar quien atendio la gestion
          if(orderRequest.lines[i].function === 'Excepción' ){
            exception = true; 
            //user = orderRequest.lines[i].approver;
            //newApprover.approver = orderRequest.lines[i].approver;

            //falta obtener el usuario


          }
        }
      } else { // se debe obtener un nuevo aprobador para la excepción
        let approverParameter : Record<string, any> = {}; //variable para guardar la respuesta
        approverParameter = await this.parametersService.findByName("Approvers"); // se obtienen los aprobadores de los parametros
        
        let approverParameterTemp = approverParameter[0];
        
        let minAssignedTickets = 10000000;
        
        for(let i = 0 ; i< approverParameterTemp.parameter.length;i++){ // se recorren los aprobadores para identificar el que tenga menos tickets
      
          if(approverParameterTemp.parameter[i].assignedTickets < minAssignedTickets){// actualiza a quien tiene menos
            
            user = approverParameterTemp.parameter[i]; // obtener el objeto aprobador del parametro
            minAssignedTickets = approverParameterTemp.parameter[i].assignedTickets;
          }
        }       
        //crear el JSON 
      }
      
      const approverArray = await this.getApprovers(user.name,"Excepción"); //Obtener la jearquia de aprobación
      console.log(JSON.stringify(approverArray));

      // contruir el JSON de mail
      newOrder.orderstatus='Excepción';
      newOrder.newOrderRequest.requestStatus='Excepción'
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
      const getActivation = await this.activationModule.findById(id)
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
      const updateActivation = await this.activationModule.updateOne({_id:_id}, { $set:updateActivationDto })
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
          channel: {type: "string" },
          territory: {type: "string"},
          clientSegment: {type: "string"}
        },
      required: ["sellerCode","channel","territory","clientSegment"],
      additionalProperties: false,
    }

    const createActivationSchema = {
      type: "object",
      properties: {
        sellerName: {type: "string"},
        seller: seller,
      },
      required: ["sellerName","seller"],
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
        asignedDate: {type: "string"},
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
    return this.httpService.get('http://192.168.107.101:8018/?user='+user).pipe(map((res) => res.data));
  }

  async getApprovers (user: string, userFunction: string){
    console.log(user);

    const myObservable = await this.getUser("dario.cardona"); // Invocación del WS de consulta RRHH
    const activeUser = await lastValueFrom(myObservable);
    //console.log(JSON.stringify(activeUser))
    
    let newApproverArray = []; // arreglo para almacenar los aprobadores
    let newApprover = <any> { // objeto aprobador
      approver :"",
      function : "",
      comment:"",
      status:"",
      asignedDate: new Date()
    }
    for(let i = 0; i< activeUser.data.length; i++){
          
      let temp = <any> { // objeto temporal aprobador
        approver :"",
        function : userFunction,
        comment:"",
        status:"",
        asignedDate: new Date()
      }

      if(!activeUser.data[i].reassign){// esta disponible para asignación

        temp.approver = activeUser.data[i].fullname;
        temp.status = "Pendiente";
        newApproverArray.push(temp);

      }else { // cuenta con una delegación
       
        temp.approver = activeUser.data[i].fullname;
        temp.status = "Delegado";
        temp.comment = activeUser.data[i].comment;
        temp.responseDate = new Date();
        newApproverArray.push(temp);

      }
     }

     return newApproverArray;

  }

}
