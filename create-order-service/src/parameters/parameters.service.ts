import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { CreateParameterDto } from './dto/create-parameter.dto';
import { UpdateParameterDto } from './dto/update-parameter.dto';
import { Parameters, ParametersDocument } from './schema/parameters.schema';
import { Sequence, SequenceDocument } from './schema/sequence.schema';

@Injectable()
export class ParametersService {

  constructor(@InjectModel(Parameters.name,'activationParameters') private activationParameterModule : Model <ParametersDocument> ,@InjectModel(Sequence.name,'activationParameters') private SequenceModule : Model <SequenceDocument>  ){
  
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
    //console.log('soy FindOne');
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

  async getID(){
    const _id =  new mongoose.Types.ObjectId('63ea95762487fdd28e2e4be5');
    const getActivationSequence = await this.SequenceModule.findOneAndUpdate({_id:_id},{ $inc: { "seq": 1 }},{ new: true }).lean()
    //console.log(getActivationSequence)
    return getActivationSequence;
  }

}
