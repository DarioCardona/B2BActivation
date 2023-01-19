import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ParametersService } from './parameters.service';
import { CreateParameterDto } from './dto/create-parameter.dto';
import { UpdateParameterDto } from './dto/update-parameter.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Parameter')
@Controller('parameters')
export class ParametersController {
  constructor(private readonly parametersService: ParametersService) {}

  @Post()
  create(@Body() createParameterDto: CreateParameterDto) {
    return this.parametersService.create(createParameterDto);
  }

  @Get()
  findAll(@Body() findElement) {
    return this.parametersService.findAll(findElement);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.parametersService.findOne(id);
  }

  @Get('name/:name')
  findByName(@Param('name') name: string) {
    return this.parametersService.findByName(name);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateParameterDto: UpdateParameterDto) {
    return this.parametersService.update(id, updateParameterDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.parametersService.remove(+id);
  }
}
