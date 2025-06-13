import { BadRequestException, Injectable } from '@nestjs/common'
import { companyPostDto } from 'src/dto/company.dto'
import { v4 as uuidv4 } from 'uuid'
import { PrismaService } from './prisma.service'

@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  async listcompany() {
    return await this.prisma.company.findMany({
      orderBy: {
        name: 'asc',
      },
    })
  }

  async getcompany(body: companyPostDto) {
    const data = await this.prisma.company.findFirst({
      where: {
        email: body.email,
      },
    })

    if (data) {
      throw new BadRequestException('Company Already Registered')
    }

    return await this.prisma.company.create({
      data: {
        id: uuidv4(),
        name: body.name,
        email: body.email,
        address: body.address,
      },
    })
  }

  async getDetail(id: string) {
    const data = await this.prisma.company.findFirst({
      where: {
        id,
      },
      include: {
        invoices: {
          include: {
            user: true,
            paymentMethod: true,
            toClient: true,
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
      throw new BadRequestException('Detail Not Found')
    }

    return data
  }

  async updatecompany(id: string, body: companyPostDto) {
    const data = await this.prisma.company.findFirst({
      where: {
        email: body.email,
        NOT: {
          id,
        },
      },
    })

    if (data) {
      throw new BadRequestException('Company Already Exists')
    }

    const cek_id = await this.prisma.company.findFirst({
      where: {
        id,
      },
    })

    if (!cek_id) {
      throw new BadRequestException('Company Not Found')
    }

    return await this.prisma.company.update({
      where: {
        id,
      },
      data: {
        name: body.name,
        email: body.email,
        address: body.address,
        updatedAt: new Date(),
      },
    })
  }

  async deletecompany(id: string) {
    const data = await this.prisma.company.findFirst({
      where: {
        id,
      },
    })

    if (!data) {
      throw new BadRequestException('Company Not Found')
    }

    return await this.prisma.company.delete({
      where: {
        id,
      },
    })
  }
}
