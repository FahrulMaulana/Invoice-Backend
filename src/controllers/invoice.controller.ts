import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Res } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { plainToInstance } from 'class-transformer'
import { ApiBearerAuth } from 'src/common/decorator/ApiBearerAuth'
import { User } from 'src/common/decorator/User'
import { ERole } from 'src/common/enums/ERole'
import { Userpayload } from 'src/dto/auth.dto'
import { invoiceActionDto, invoiceFilterDto, invoiceGetDto, invoicePostDto, invoicePutDto } from 'src/dto/invoice.dto'
import { responseDto } from 'src/dto/respon.dto'
import { InvoiceService } from 'src/services/iinvoice.service'

@ApiTags('Invoice')
@Controller('api')
export class InvoiceController {
  constructor(private invoice: InvoiceService) {}

  @ApiBearerAuth([ERole.SU])
  @Get('/invoice')
  async list(@Query() filters: invoiceFilterDto) {
    const data = await this.invoice.listinvoice(filters)
    return plainToInstance(invoiceGetDto, data)
  }

  @ApiBearerAuth([ERole.SU])
  @Post('/invoice')
  async create(@Body() body: invoicePostDto, @User() user: Userpayload) {
    const { id } = user
    const data = await this.invoice.getinvoice(body, id)
    const response = new responseDto()
    response.message = 'Invoice Successfully Created'
    return response
  }

  @ApiBearerAuth([ERole.SU])
  @Get('/invoice/:id')
  async detail(@Param('id') id: string) {
    const data = await this.invoice.getDetail(id)
    return data
  }

  @ApiBearerAuth([ERole.SU])
  @Patch('/invoice/:id')
  async update(@Param('id') id: string, @Body() body: invoicePutDto) {
    const data = await this.invoice.updateinvoice(id, body)
    const response = new responseDto()
    response.message = 'Invoice Successfully Updated'
    return response
  }

  @ApiBearerAuth([ERole.SU])
  @Delete('/invoice/:id')
  async delete(@Param('id') id: string) {
    const data = await this.invoice.deleteinvoice(id)
    const response = new responseDto()
    response.message = 'Invoice Successfully Deleted'
    return response
  }

  @ApiBearerAuth([ERole.SU])
  @Patch('/invoice/mark-as-paid/:id')
  async markAsPaid(@Param('id') id: string) {
    await this.invoice.updateInvoicesStatus(id)
    const response = new responseDto()
    response.message = 'Invoices Successfully Marked as Paid'
    return response
  }

  @ApiBearerAuth([ERole.SU])
  @Patch('/invoice/mark-as-debt/:id')
  async markAsBadDebt(@Param('id') id: string) {
    await this.invoice.updateInvoicesStatusDebt(id)
    const response = new responseDto()
    response.message = 'Invoices Successfully Marked as Bad Debt'
    return response
  }

  @ApiBearerAuth([ERole.SU])
  @Patch('/invoice/send-email/:id')
  async sendEmail(@Param('id') id: string) {
    await this.invoice.sendInvoiceEmail(id)
    const response = new responseDto()
    response.message = 'Invoice Email Successfully Sent'
    return response
  }

  @ApiBearerAuth([ERole.SU])
  @Post('/invoice/action/delete-multiple')
  async deleteMultiple(@Body() body: invoiceActionDto) {
    await this.invoice.deleteMultipleInvoices(body.invoiceIds)
    const response = new responseDto()
    response.message = 'Invoices Successfully Deleted'
    return response
  }

  @ApiBearerAuth([ERole.SU])
  @Patch('/invoice/generate-pdf/:id')
  async generatePDF(@Param('id') id: string, @Res() res) {
    try {
      const pdfBuffer = await this.invoice.generatePDF(id)

      // Set response headers for PDF download
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
        'Content-Length': pdfBuffer.length,
      })

      // Send the PDF as the response
      res.send(pdfBuffer)
    } catch (error) {
      throw new BadRequestException(`Failed to generate PDF: ${error.message}`)
    }
  }
}
