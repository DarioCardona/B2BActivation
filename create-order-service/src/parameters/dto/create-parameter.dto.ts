import { ApiProperty } from "@nestjs/swagger";

export class CreateParameterDto {

    @ApiProperty()
    name: string;

    @ApiProperty({ isArray: true })
    parameter: object
}
