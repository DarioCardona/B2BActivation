import { PartialType } from '@nestjs/mapped-types';
import { CreateActivationDto } from './create-activation.dto';

export class UpdateActivationDto extends PartialType(CreateActivationDto) {}
