import { BadRequestException, Injectable } from '@nestjs/common'
import { productPostDto } from 'src/dto/product.dto'
import { v4 as uuidv4 } from 'uuid'
import { PrismaService } from './prisma.service'

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async listproduct() {
    return await this.prisma.product.findMany({
      orderBy: {
        name: 'asc',
      },
    })
  }

  async getproduct(body: productPostDto) {
    const data = await this.prisma.product.findFirst({
      where: {
        name: body.name,
      },
    })

    if (data) {
      throw new BadRequestException('product Already Registered')
    }

    return await this.prisma.product.create({
      data: {
        id: uuidv4(),
        name: body.name,
        description: body.description,
      },
    })
  }

  async getDetail(id: string) {
    const data = await this.prisma.product.findFirst({
      where: {
        id,
      },
      include: {
        invoiceItems: {
          include: {
            invoice: {
              include: {
                user: true,
                paymentMethod: true,
                toClient: true,
                fromCompany: true,
              },
            },
          },
        },
      },
    })

    if (!data) {
      throw new BadRequestException('Detail Not Found')
    }

    return data
  }

  async updateproduct(id: string, body: productPostDto) {
    const data = await this.prisma.product.findFirst({
      where: {
        name: body.name,
        NOT: {
          id,
        },
      },
    })

    if (data) {
      throw new BadRequestException('product Already Exists')
    }

    const cek_id = await this.prisma.product.findFirst({
      where: {
        id,
      },
    })

    if (!cek_id) {
      throw new BadRequestException('product Not Found')
    }

    return await this.prisma.product.update({
      where: {
        id,
      },
      data: {
        name: body.name,
        description: body.description,
        updatedAt: new Date(),
      },
    })
  }

  async deleteproduct(id: string) {
    const data = await this.prisma.product.findFirst({
      where: {
        id,
      },
    })

    if (!data) {
      throw new BadRequestException('product Not Found')
    }

    return await this.prisma.product.delete({
      where: {
        id,
      },
    })
  }
}
