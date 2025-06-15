import { BadRequestException, Injectable } from '@nestjs/common'
import { InvoiceStatus } from '@prisma/client'
import { invoiceFilterDto, invoicePostDto, invoiceUpdateDto } from 'src/dto/invoice.dto'
import { v4 as uuidv4 } from 'uuid'
import { PrismaService } from './prisma.service'

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  async listinvoice(filters?: invoiceFilterDto) {
    const { status, month, paymentMethodId, companyId, clientId } = filters || {}

    // Build the where clause based on filters
    const where: any = {}

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

    return await this.prisma.invoice.delete({
      where: {
        id,
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
    // First, verify the invoice exists and get all the needed information
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
      throw new BadRequestException('Invoice not found')
    }

    // Here you would typically integrate with an email service
    // For now, we'll just log the information as a placeholder
    console.log(`Email would be sent to: ${invoice.toClient.email}`)
    console.log(`From: ${invoice.fromCompany.email}`)
    console.log(`Subject: Invoice ${invoice.invoiceNumber}`)
    console.log(`Invoice Amount: ${invoice.subtotal}`)
    console.log(`Message: ${message || 'Please find the attached invoice.'}`)

    // In a real implementation, you would:
    // 1. Generate a PDF of the invoice
    // 2. Send an email with the PDF attachment
    // 3. Possibly mark the invoice as sent in the database

    return {
      sent: true,
      to: invoice.toClient.email,
      invoiceNumber: invoice.invoiceNumber,
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
