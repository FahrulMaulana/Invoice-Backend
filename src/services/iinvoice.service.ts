import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { InvoiceStatus } from '@prisma/client'
import * as nodemailer from 'nodemailer'
import { invoiceFilterDto, invoicePostDto, invoiceUpdateDto } from 'src/dto/invoice.dto'
import { v4 as uuidv4 } from 'uuid'
import { PrismaService } from './prisma.service'

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name)
  private transporter: nodemailer.Transporter

  constructor(private prisma: PrismaService) {
    // We'll initialize the transporter when needed to avoid issues at startup
  }

  async listinvoice(filters?: invoiceFilterDto) {
    const { status, month, paymentMethodId, companyId, clientId } = filters || {}

    // Build the where clause based on filters
    const where: any = {}

    where.isdeleted = false

    if (status) {
      where.status = status
    }

    if (month) {
      const [year, monthNum] = month.split('-')
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0)

      where.date = {
        gte: startDate,
        lte: endDate,
      }
    }

    if (paymentMethodId) {
      where.paymentMethodId = paymentMethodId
    }

    if (companyId) {
      where.companyId = companyId
    }

    if (clientId) {
      where.clientId = clientId
    }

    return await this.prisma.invoice.findMany({
      where,
      include: {
        user: true,
        paymentMethod: true,
        fromCompany: true,
        toClient: true,
      },
      orderBy: {
        status: 'asc',
      },
    })
  }

  async getinvoice(body: invoicePostDto, id: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        id: body.clientId,
      },
    })

    if (!client) {
      throw new BadRequestException('Invoice not found')
    }

    const dateDue = new Date(new Date().getTime() + client?.netTerms * 24 * 60 * 60 * 1000) // Corrected date calculation

    const data = await this.prisma.invoice.create({
      data: {
        id: uuidv4(),
        invoiceNumber: uuidv4(),
        date: new Date(),
        dueDate: dateDue,
        status: InvoiceStatus.UNPAID,
        companyId: body.companyId,
        clientId: body.clientId,
        paymentMethodId: body.paymentMethodId,
        userId: id,
        isdeleted: false,
      },
    })

    if (!data) {
      throw new BadRequestException('Failed to create invoice')
    }

    const items = await Promise.all(
      body.products.map(async (item) => {
        const totalPrice = item.customerPrice * item.quantity
        const product = await this.prisma.invoiceItem.create({
          data: {
            id: uuidv4(),
            invoiceId: data.id,
            productId: item.id,
            quantity: item.quantity,
            customPrice: item.customerPrice,
            total: totalPrice,
          },
        })
        return product
      })
    )

    const subtotal = items.map((item) => item.total).reduce((a, b) => a + b, 0)
    const tax = subtotal * 0.1 // Assuming a 10% tax rate
    const total = subtotal + tax
    const updatedInvoice = await this.prisma.invoice.update({
      where: {
        id: data.id,
      },
      data: {
        subtotal,
      },
    })
    if (!updatedInvoice) {
      throw new BadRequestException('Failed to update invoice with items')
    }

    return data
  }

  async getDetail(id: string) {
    const data = await this.prisma.invoice.findFirst({
      where: {
        id,
      },
      include: {
        user: true,
        paymentMethod: true,
        fromCompany: true,
        toClient: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!data) {
      throw new BadRequestException('Detail not found')
    }

    return data
  }

  async updateinvoice(id: string, body: invoiceUpdateDto) {
    const cek_id = await this.prisma.invoice.findFirst({
      where: {
        id,
      },
    })

    if (!cek_id) {
      throw new BadRequestException('invoice not found')
    }

    return await this.prisma.invoice.update({
      where: {
        id,
      },
      data: {
        status: body.status,
      },
    })
  }

  async deleteinvoice(id: string) {
    const data = await this.prisma.invoice.findFirst({
      where: {
        id,
      },
    })

    if (!data) {
      throw new BadRequestException('invoice not found')
    }

    return await this.prisma.invoice.update({
      where: {
        id,
      },
      data: {
        isdeleted: true, // Soft delete
      },
    })
  }

  async updateInvoicesStatus(id: string) {
    // Verify all invoices exist
    console.log(`Updating invoice status for ID: ${id}`)

    const invoices = await this.prisma.invoice.findFirst({
      where: {
        id,
      },
    })

    if (!invoices) {
      throw new BadRequestException('One or more invoices not found')
    }

    // Update all invoices
    return await this.prisma.invoice.update({
      where: {
        id,
      },
      data: {
        status: InvoiceStatus.PAID, // Assuming you want to mark as paid
      },
    })
  }

  async updateInvoicesStatusDebt(id: string) {
    // Verify all invoices exist
    const invoices = await this.prisma.invoice.findFirst({
      where: {
        id,
      },
    })

    if (!invoices) {
      throw new BadRequestException('One or more invoices not found')
    }

    // Update all invoices
    return await this.prisma.invoice.update({
      where: {
        id,
      },
      data: {
        status: InvoiceStatus.BAD_DEBT, // Assuming you want to mark as paid
      },
    })
  }

  async sendInvoiceEmail(invoiceId: string, message?: string) {
    this.logger.log(`Attempting to send invoice email for invoice: ${invoiceId}`)

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
      },
      include: {
        toClient: true,
        fromCompany: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!invoice) {
      this.logger.error(`Invoice not found: ${invoiceId}`)
      throw new BadRequestException('Invoice not found')
    }

    // Setup transporter (Ethereal Email)
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })

    try {
      const info = await transporter.sendMail({
        from: '"Invoice System" <maddison53@ethereal.email>',
        to: invoice.toClient.email,
        subject: `Invoice #${invoice.invoiceNumber} from ${invoice.fromCompany.name}`,
        text: `Dear ${invoice.toClient.legalName},

        Invoice #${invoice.invoiceNumber}
        Date: ${new Date(invoice.date).toLocaleDateString()}
        Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}

        Total Amount: $${invoice?.subtotal?.toFixed(2)}

        ${message || 'Thank you for your business. Please find your invoice details above.'}

        Regards,
        ${invoice.fromCompany.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #f0f0f0;">
              <h2 style="color: #2a3f54; margin: 0;">Invoice #${invoice.invoiceNumber}</h2>
            </div>
            
            <div style="margin-bottom: 30px;">
              <p>Dear ${invoice.toClient.legalName},</p>
              <p>${message || 'Please find your invoice details below. Thank you for your business.'}</p>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
              <div>
                <h4 style="color: #2a3f54; margin-top: 0;">From:</h4>
                <p style="margin: 0;">${invoice.fromCompany.name}</p>
                <p style="margin: 0;">${invoice.fromCompany.email || ''}</p>
              </div>
              <div>
                <h4 style="color: #2a3f54; margin-top: 0;">To:</h4>
                <p style="margin: 0;">${invoice.toClient.legalName}</p>
                <p style="margin: 0;">${invoice.toClient.email || ''}</p>
              </div>
              <div>
                <h4 style="color: #2a3f54; margin-top: 0;">Details:</h4>
                <p style="margin: 0;"><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString()}</p>
                <p style="margin: 0;"><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
                <p style="margin: 0;"><strong>Status:</strong> <span style="color: ${
                  invoice.status === 'PAID' ? '#27ae60' : invoice.status === 'UNPAID' ? '#e74c3c' : '#f39c12'
                };">${invoice.status}</span></p>
              </div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #eee;">Item</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #eee;">Quantity</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #eee;">Price</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #eee;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items
                  .map(
                    (item) => `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.product.name}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #eee;">${item.quantity}</td>
                    <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">$${(item.customPrice || 0).toFixed(2)}</td>
                    <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">$${(item.total || 0).toFixed(2)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Subtotal:</td>
                  <td style="padding: 10px; text-align: right; font-weight: bold;">$${invoice?.subtotal?.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            
            <div style="margin-top: 30px; background-color: #f8f9fa; padding: 15px; border-radius: 4px;">
              <p style="margin: 0;">Thank you for your business. If you have any questions about this invoice, please contact us.</p>
            </div>
            
            <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #6c757d;">
              <p>This is an automatically generated email. Please do not reply to this message.</p>
            </div>
          </div>
        `,
      })

      this.logger.log(`Message sent: ${info.messageId}`)
    } catch (error) {
      this.logger.error(`Send Error: ${error.message}`)
      throw new BadRequestException('Failed to send invoice email')
    }
  }

  async deleteMultipleInvoices(invoiceIds: string[]) {
    // Verify all invoices exist
    const invoices = await this.prisma.invoice.findMany({
      where: {
        id: {
          in: invoiceIds,
        },
      },
    })

    if (invoices.length !== invoiceIds.length) {
      throw new BadRequestException('One or more invoices not found')
    }

    // First delete related invoice items
    await this.prisma.invoiceItem.deleteMany({
      where: {
        invoiceId: {
          in: invoiceIds,
        },
      },
    })

    // Then delete the invoices
    return await this.prisma.invoice.deleteMany({
      where: {
        id: {
          in: invoiceIds,
        },
      },
    })
  }
}
