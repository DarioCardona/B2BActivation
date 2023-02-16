import { Controller, Get, Post, Body, Patch, Param, Delete, ConsoleLogger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger/dist';
import { ActivationService } from './activation.service';
import { CreateActivationDto } from './dto/create-activation.dto';
import { UpdateActivationDto } from './dto/update-activation.dto';

@ApiTags('B2B')
@Controller('activation')
export class ActivationController {
  constructor(private readonly activationService: ActivationService) {}

  @Post()
  create(@Body() createActivationDto: CreateActivationDto) {
    return this.activationService.create(createActivationDto);
  }

  @Post('approvalProcess')
  approvalProcess(@Body() body:any) {
    return this.activationService.approvalProcess(body);
  }

  @Post('startActivation')
    startActivation(@Body() body:any){
      return this.activationService.startActivation(body);
  }
  
  @Post('updateLine')
    updateLine(@Body() body:any){
      return this.activationService.updateLine(body);
  }
  
  @Get()
  findAll(@Body() findAllActivation) {
    return this.activationService.findAll(findAllActivation);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.activationService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateActivationDto: UpdateActivationDto) {
    return this.activationService.update(id, updateActivationDto);
  }

  
  
}
