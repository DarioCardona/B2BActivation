import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SequenceDocument = HydratedDocument<Sequence>;

@Schema()
export class Sequence {
    
    @Prop()
    seq: Number;
        
}

export const SequenceSchema = SchemaFactory.createForClass(Sequence);