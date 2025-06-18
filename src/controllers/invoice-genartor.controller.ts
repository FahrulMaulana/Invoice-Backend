import { Body, Controller, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger'
import { ApiBearerAuth } from 'src/common/decorator/ApiBearerAuth'
import { User } from 'src/common/decorator/User'
import { ERole } from 'src/common/enums/ERole'
import { UserPayload } from 'src/common/interfaces/UserPayload'
import { invoiceGeneratorPostDto, invoiceGenerUploadDto } from 'src/dto/invoice-generator.dto'
import { InvoiceGeneratorService } from 'src/services/invoice-generator.service'

@ApiTags('Invoice Generator')
@Controller('api')
export class InvoiceGeneratorController {
  constructor(private invoiceGenerator: InvoiceGeneratorService) {}

  @ApiBearerAuth([ERole.SU])
  @Post('/invoiceGenerator')
  async createInvoice(@Body() body: invoiceGeneratorPostDto, @Res() res) {
    const data = await this.invoiceGenerator.getTemplate(body)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename=biodata.xlsx')
    res.send(data)
  }

  @ApiBearerAuth([ERole.SU])
  @Post('/uploadExcel')
  @ApiBody({ type: invoiceGenerUploadDto })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async createExcell(@UploadedFile() file: Express.Multer.File, @User() user: UserPayload) {
    const { id } = user
    const data = await this.invoiceGenerator.uploadTemplate(file, id)
    return data
  }
}
