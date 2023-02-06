import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ActivationDocument = HydratedDocument<Activation>;

@Schema()
export class Activation {
    
        @Prop()
        approver:"String";
        
        @Prop()
        requestID:"Number";
        
        @Prop()
        DPGline:"Number";
        
        @Prop({default:"Creación"})
        requestStatus: "String";

        @Prop({default: Date()})
        insertDate:"Date";
        
        @Prop()
        activationDate:"Date";
        
        @Prop()
        sellerUser: "string"

        @Prop(raw(
            {
                "sellerCode": {
                  "type": "Number"
                },
                "sellerName": {
                  "type": "String"
                },
                "channel": {
                  "type": "String"
                },
                "territory": {
                  "type": "String"
                },
                "clientSegment": {
                  "type": "String"
                }
            }
        ))
        seller: any 

        @Prop(raw(
          {
            "companyName": {
              "type": "String"
            },
            "contactNames": {
              "type": "String"
            },
            "contactSurnames": {
              "type": "String"
            },
            "contactDocumentType": {
              "type": "String"
            },
            "clientType": {
              "type": "String"
            },
            "clientAccount": {
              "type": "String"
            }
          }
      ))
      company: any 
          
      @Prop(raw(
        {
          "exonerated": {
            "type": "String"
          },
          "exonaratedCard": {
            "type": "String"
          },
          "exonaratedDueDate": {
            "type": "Date"
          },
          "diplomaticExonarated": {
            "type": "String"
          }
        }
    ))
    exonarated: any 
    
    @Prop(raw(
      {
        legalRepresentative: {
          type: String
        },
        clientName: {
          type: String
        },
        representativeMail: {
          type: String
        },
        representativePhone: {
          type: Number
        },
        representativeDNI: {
          type: String
        },
        cityMunicipaly: {
          type: String
        },
        neighbourhood: {
          type: String
        },
        address: {
          type: String
        },
        principalPhone: {
          type: Number
        }
      }
  ))
  client: Record<string, any>;
  
  @Prop([Object])
  lines:Object []
  
  @Prop([Object])
  approverHistory:Object []

  @Prop([Object])
  attachments:Object []
      
}

export const ActivationSchema = SchemaFactory.createForClass(Activation);