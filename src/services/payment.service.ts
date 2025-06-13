import { BadRequestException, Injectable } from '@nestjs/common'
import { paymentMethodPostDto } from 'src/dto/payment.dto'
import { v4 as uuidv4 } from 'uuid'
import { PrismaService } from './prisma.service'

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async listpaymentMethod() {
    return await this.prisma.paymentMethod.findMany({
      orderBy: {
        methodName: 'asc',
      },
    })
  }

  async getpaymentMethod(body: paymentMethodPostDto) {
    const data = await this.prisma.paymentMethod.findFirst({
      where: {
        methodName: body.methodName,
      },
    })

    if (data) {
      throw new BadRequestException('paymentMethod Already Registered')
    }

    return await this.prisma.paymentMethod.create({
      data: {
        id: uuidv4(),
        methodName: body.methodName,
        info: body.info,
      },
    })
  }

  async getDetail(id: string) {
    const data = await this.prisma.paymentMethod.findFirst({
      where: {
        id,
      },
      include: {
        invoices: {
          include: {
            user: true,
            paymentMethod: true,
            fromCompany: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    })

    if (!data) {
      throw new BadRequestException('paymentMethod Not Found')
    }

    return data
  }

  async updatepaymentMethod(id: string, body: paymentMethodPostDto) {
    const data = await this.prisma.paymentMethod.findFirst({
      where: {
        methodName: body.methodName,
        NOT: {
          id,
        },
      },
    })

    if (data) {
      throw new BadRequestException('paymentMethod Already Exists')
    }

    const cek_id = await this.prisma.paymentMethod.findFirst({
      where: {
        id,
      },
    })

    if (!cek_id) {
      throw new BadRequestException('paymentMethod Not Found')
    }

    return await this.prisma.paymentMethod.update({
      where: {
        id,
      },
      data: {
        methodName: body.methodName,
        info: body.info,
        updatedAt: new Date(),
      },
    })
  }

  async deletepaymentMethod(id: string) {
    const data = await this.prisma.paymentMethod.findFirst({
      where: {
        id,
      },
    })

    if (!data) {
      throw new BadRequestException('paymentMethod Not Found')
    }

    return await this.prisma.paymentMethod.delete({
      where: {
        id,
      },
    })
  }
}
