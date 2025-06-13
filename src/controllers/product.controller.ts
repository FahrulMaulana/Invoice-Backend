import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { plainToInstance } from 'class-transformer'
import { ApiBearerAuth } from 'src/common/decorator/ApiBearerAuth'
import { ERole } from 'src/common/enums/ERole'
import { productGetDto, productPostDto } from 'src/dto/product.dto'
import { responseDto } from 'src/dto/respon.dto'
import { ProductService } from 'src/services/product.service'

@ApiTags('Product')
@Controller('api')
export class ProductController {
  constructor(private product: ProductService) {}

  @ApiBearerAuth([ERole.SU])
  @Get('/product')
  async list() {
    const data = await this.product.listproduct()
    return plainToInstance(productGetDto, data)
  }

  @ApiBearerAuth([ERole.SU])
  @Post('/product')
  async create(@Body() body: productPostDto) {
    const data = await this.product.getproduct(body)
    const response = new responseDto()
    response.message = 'product Successfully Cretaed'
    return response
  }

  @ApiBearerAuth([ERole.SU])
  @Get('/product/:id')
  async detail(@Param('id') id: string) {
    const data = await this.product.getDetail(id)
    return data
  }

  @ApiBearerAuth([ERole.SU])
  @Put('/product/:id')
  async update(@Param('id') id: string, @Body() body: productPostDto) {
    const data = await this.product.updateproduct(id, body)
    const response = new responseDto()
    response.message = 'product Successfully Updated'
    return response
  }

  @ApiBearerAuth([ERole.SU])
  @Delete('/product/:id')
  async delete(@Param('id') id: string) {
    const data = await this.product.deleteproduct(id)
    const response = new responseDto()
    response.message = 'product Successfully Deleted'
    return response
  }
}
