import { BadRequestException, Injectable } from '@nestjs/common'
import { ClientPostDto } from 'src/dto/client.dto'
import { v4 as uuidv4 } from 'uuid'
import { PrismaService } from './prisma.service'

@Injectable()
export class ClientService {
  constructor(private prisma: PrismaService) {}

  async listClient() {
    return await this.prisma.client.findMany({
      orderBy: {
        legalName: 'asc',
      },
    })
  }

  async getClient(body: ClientPostDto) {
    const data = await this.prisma.client.findFirst({
      where: {
        email: body.email,
      },
    })

    if (data) {
      throw new BadRequestException('Client is already registered')
    }

    return await this.prisma.client.create({
      data: {
        id: uuidv4(),
        legalName: body.legalName,
        email: body.email,
        address: body.address,
        netTerms: body.netTerms,
      },
    })
  }

  async getDetail(id: string) {
    const data = await this.prisma.client.findFirst({
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
      throw new BadRequestException('Detail not found')
    }

    return data
  }

  async updateClient(id: string, body: ClientPostDto) {
    const data = await this.prisma.client.findFirst({
      where: {
        email: body.email,
        NOT: {
          id,
        },
      },
    })

    if (data) {
      throw new BadRequestException('Email is already in use')
    }

    const cek_id = await this.prisma.client.findFirst({
      where: {
        id,
      },
    })

    if (!cek_id) {
      throw new BadRequestException('Client not found')
    }

    return await this.prisma.client.update({
      where: {
        id,
      },
      data: {
        legalName: body.legalName,
        email: body.email,
        address: body.address,
        netTerms: body.netTerms,
        updatedAt: new Date(),
      },
    })
  }

  async deleteClient(id: string) {
    const data = await this.prisma.client.findFirst({
      where: {
        id,
      },
    })

    if (!data) {
      throw new BadRequestException('Client not found')
    }

    return await this.prisma.client.delete({
      where: {
        id,
      },
    })
  }
}
