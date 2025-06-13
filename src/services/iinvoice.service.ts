import { BadRequestException, Injectable } from '@nestjs/common'
import { InvoiceStatus } from '@prisma/client'
import { invoicePostDto, invoiceUpdateDto } from 'src/dto/invoice.dto'
import { v4 as uuidv4 } from 'uuid'
import { PrismaService } from './prisma.service'

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  async listinvoice() {
    return await this.prisma.invoice.findMany({
      orderBy: {
        status: 'asc',
      },
    })
  }

  async getinvoice(body: invoicePostDto) {
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
        userId: body.userId,
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
}
