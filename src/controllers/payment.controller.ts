import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { plainToInstance } from 'class-transformer'
import { ApiBearerAuth } from 'src/common/decorator/ApiBearerAuth'
import { ERole } from 'src/common/enums/ERole'
import { paymentMethodGetDto, paymentMethodPostDto } from 'src/dto/payment.dto'
import { responseDto } from 'src/dto/respon.dto'
import { PaymentService } from 'src/services/payment.service'

@ApiTags('Payment Method')
@Controller('api')
export class PaymentController {
  constructor(private paymentMethod: PaymentService) {}

  @ApiBearerAuth([ERole.SU])
  @Get('/paymentMethod')
  async list() {
    const data = await this.paymentMethod.listpaymentMethod()
    return plainToInstance(paymentMethodGetDto, data)
  }

  @ApiBearerAuth([ERole.SU])
  @Post('/paymentMethod')
  async create(@Body() body: paymentMethodPostDto) {
    const data = await this.paymentMethod.getpaymentMethod(body)
    const response = new responseDto()
    response.message = 'paymentMethod Successfully Cretaed'
    return response
  }

  @ApiBearerAuth([ERole.SU])
  @Get('/paymentMethod/:id')
  async detail(@Param('id') id: string) {
    const data = await this.paymentMethod.getDetail(id)
    return data
  }

  @ApiBearerAuth([ERole.SU])
  @Put('/paymentMethod/:id')
  async update(@Param('id') id: string, @Body() body: paymentMethodPostDto) {
    const data = await this.paymentMethod.updatepaymentMethod(id, body)
    const response = new responseDto()
    response.message = 'paymentMethod Successfully Updated'
    return response
  }

  @ApiBearerAuth([ERole.SU])
  @Delete('/paymentMethod/:id')
  async delete(@Param('id') id: string) {
    const data = await this.paymentMethod.deletepaymentMethod(id)
    const response = new responseDto()
    response.message = 'product Successfully Deleted'
    return response
  }
}
