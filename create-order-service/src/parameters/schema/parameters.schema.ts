import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ParametersDocument = HydratedDocument<Parameters>;

@Schema()
export class Parameters {
    
    @Prop()
    name:"String";
    
    @Prop({default: Date()})
    creationDate:"Date";

    @Prop()
    modifiedDate:"Date";
    
    @Prop([Object])
    parameter:Object [];
  
      
}

export const ParametersSchema = SchemaFactory.createForClass(Parameters);