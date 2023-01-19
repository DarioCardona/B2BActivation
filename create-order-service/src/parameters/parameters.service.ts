import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { CreateParameterDto } from './dto/create-parameter.dto';
import { UpdateParameterDto } from './dto/update-parameter.dto';
import { Parameters, ParametersDocument } from './schema/parameters.schema';

@Injectable()
export class ParametersService {

  constructor(@InjectModel(Parameters.name,'activationParameters') private activationParameterModule : Model <ParametersDocument>,  ){
  
  }
  async create(createParameterDto: CreateParameterDto) {
    const activationCreated = await this.activationParameterModule.create(createParameterDto)
    return activationCreated;
  }

  async  findAll(findElement) {
    let searchElement : Record<string, any> = {}; //variable para construir el JSON
    if(findElement != null){
      searchElement.name = findElement;
    }
    
    const getParameterBy = await this.activationParameterModule.find(searchElement)
    return getParameterBy;
  }

  async findOne(id: string) {
    console.log('soy FindOne');
    const error = {
      code : 101,
      description: "El id indicado no existe en la base de datos"
    }
    try{
      const getParameter = await this.activationParameterModule.findById(id)
      return getParameter;
    } catch (e){
      return error;
    }
  }

  async update(id: string, updateParameterDto: UpdateParameterDto) {
    const error = {
      code : 101,
      description: "El id indicado no existe en la base de datos"
    }
    try{
      const _id =  new mongoose.Types.ObjectId(id);
      let B2BActivationParameterObject : Record<string, any> = {};
      B2BActivationParameterObject = updateParameterDto;
      B2BActivationParameterObject.modifiedDate = new Date();
      console.log(_id);
      const updateParameter = await this.activationParameterModule.updateOne({_id:_id}, { $set:B2BActivationParameterObject })
      return updateParameter;
    } catch (e){
      return error;
    }
  }

  remove(id: number) {
    return `This action removes a #${id} parameter`;
  }

  async findByName(name :string){
    
    let searchElement : Record<string, any> = {}; //variable para construir el JSON
    searchElement.name = name;
    const error = {
      code : 101,
      description: "El nombre indicado no existe en la base de datos"
    }
    try{
      const getParameter = await this.activationParameterModule.find(searchElement)
      return getParameter;
    } catch (e){
      return error;
    }
  }

}
