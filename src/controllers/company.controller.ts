import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiConsumes, ApiTags } from '@nestjs/swagger'
import { plainToInstance } from 'class-transformer'
import { ApiBearerAuth } from 'src/common/decorator/ApiBearerAuth'
import { ERole } from 'src/common/enums/ERole'
import { companyGetDto, companyPostDto } from 'src/dto/company.dto'
import { responseDto } from 'src/dto/respon.dto'
import { CompanyService } from 'src/services/company.service'

@ApiTags('Company')
@Controller('api')
export class CompanyController {
  constructor(private company: CompanyService) {}

  @ApiBearerAuth([ERole.SU])
  @Get('/company')
  async list() {
    const data = await this.company.listcompany()
    return plainToInstance(companyGetDto, data)
  }

  @ApiBearerAuth([ERole.SU])
  @Post('/company')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async create(@UploadedFile() file: Express.Multer.File, @Body() body: companyPostDto) {
    const data = await this.company.getcompany(file, body)
    const response = new responseDto()
    response.message = 'company Successfully Cretaed'
    return response
  }

  @ApiBearerAuth([ERole.SU])
  @Get('/company/:id')
  async detail(@Param('id') id: string) {
    const data = await this.company.getDetail(id)
    return data
  }

  @ApiBearerAuth([ERole.SU])
  @Patch('/company/:id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async update(@UploadedFile() file: Express.Multer.File, @Param('id') id: string, @Body() body: companyPostDto) {
    const data = await this.company.updatecompany(file, id, body)
    const response = new responseDto()
    response.message = 'company Successfully Updated'
    return response
  }

  @ApiBearerAuth([ERole.SU])
  @Delete('/company/:id')
  async delete(@Param('id') id: string) {
    const data = await this.company.deletecompany(id)
    const response = new responseDto()
    response.message = 'Client Successfully Deleted'
    return response
  }
}
