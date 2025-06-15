import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { plainToInstance } from 'class-transformer'
import { ApiBearerAuth } from 'src/common/decorator/ApiBearerAuth'
import { ERole } from 'src/common/enums/ERole'
import { ClienGetDto, ClientPostDto } from 'src/dto/client.dto'
import { responseDto } from 'src/dto/respon.dto'
import { ClientService } from 'src/services/clients.service'

@ApiTags('Clients')
@Controller('api')
export class ClientController {
  constructor(private client: ClientService) {}

  @ApiBearerAuth([ERole.SU])
  @Get('/clients')
  async list() {
    const data = await this.client.listClient()
    return plainToInstance(ClienGetDto, data)
  }

  @ApiBearerAuth([ERole.SU])
  @Post('/clients')
  async create(@Body() body: ClientPostDto) {
    const data = await this.client.getClient(body)
    const response = new responseDto()
    response.message = 'Client Successfully Cretaed'
    return response
  }

  @ApiBearerAuth([ERole.SU])
  @Get('/clients/:id')
  async detail(@Param('id') id: string) {
    const data = await this.client.getDetail(id)
    return data
  }

  @ApiBearerAuth([ERole.SU])
  @Patch('/clients/:id')
  async update(@Param('id') id: string, @Body() body: ClientPostDto) {
    const data = await this.client.updateClient(id, body)
    const response = new responseDto()
    response.message = 'Client Successfully Updated'
    return response
  }

  @ApiBearerAuth([ERole.SU])
  @Delete('/clients/:id')
  async delete(@Param('id') id: string) {
    const data = await this.client.deleteClient(id)
    const response = new responseDto()
    response.message = 'Client Successfully Deleted'
    return response
  }
}
