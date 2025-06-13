import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { plainToInstance } from 'class-transformer'
import { ApiBearerAuth } from 'src/common/decorator/ApiBearerAuth'
import { ERole } from 'src/common/enums/ERole'
import { invoiceGetDto, invoicePostDto, invoiceUpdateDto } from 'src/dto/invoice.dto'
import { responseDto } from 'src/dto/respon.dto'
import { InvoiceService } from 'src/services/iinvoice.service'

@ApiTags('Invoice')
@Controller('api')
export class InvoiceController {
  constructor(private invoice: InvoiceService) {}

  @ApiBearerAuth([ERole.SU])
  @Get('/invoice')
  async list() {
    const data = await this.invoice.listinvoice()
    return plainToInstance(invoiceGetDto, data)
  }

  @ApiBearerAuth([ERole.SU])
  @Post('/invoice')
  async create(@Body() body: invoicePostDto) {
    const data = await this.invoice.getinvoice(body)
    const response = new responseDto()
    response.message = 'invoice Successfully Cretaed'
    return response
  }

  @ApiBearerAuth([ERole.SU])
  @Get('/invoice/:id')
  async detail(@Param('id') id: string) {
    const data = await this.invoice.getDetail(id)
    return data
  }

  @ApiBearerAuth([ERole.SU])
  @Put('/invoice/:id')
  async update(@Param('id') id: string, @Body() body: invoiceUpdateDto) {
    const data = await this.invoice.updateinvoice(id, body)
    const response = new responseDto()
    response.message = 'invoice Successfully Updated'
    return response
  }

  @ApiBearerAuth([ERole.SU])
  @Delete('/invoice/:id')
  async delete(@Param('id') id: string) {
    const data = await this.invoice.deleteinvoice(id)
    const response = new responseDto()
    response.message = 'invoice Successfully Deleted'
    return response
  }
}
