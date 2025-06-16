import { BadRequestException, HttpException, Injectable } from '@nestjs/common'
import { promises } from 'fs'
import { join } from 'path'
import { companyPostDto } from 'src/dto/company.dto'
import { v4 as uuidv4 } from 'uuid'
import { PrismaService } from './prisma.service'

@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  async validateFile(file: Express.Multer.File): Promise<void> {
    try {
      if (!file) {
        throw new HttpException('Berkas tidak ditemukan', 400)
      }

      const allowedFileTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      const maxFileSizeInBytes = 10 * 1024 * 1024

      // Validasi file untuk foto1 (jika ada)

      this.checkFile(file, allowedFileTypes, maxFileSizeInBytes)
    } catch (error) {
      throw new BadRequestException(`Gagal memvalidasi berkas: ${error.message}`)
    }
  }

  // Fungsi helper untuk memeriksa tipe dan ukuran berkas
  private checkFile(file: Express.Multer.File, allowedFileTypes: string[], maxFileSizeInBytes: number): void {
    // Periksa tipe berkas
    const fileMime = file.mimetype // Ambil mimetype dari file
    if (!allowedFileTypes.includes(fileMime)) {
      throw new BadRequestException(`Tipe berkas tidak valid. Hanya diperbolehkan: ${allowedFileTypes.join(', ')}`)
    }

    // Periksa ukuran berkas
    if (file.size > maxFileSizeInBytes) {
      throw new BadRequestException(`Ukuran berkas melebihi batas maksimum (10MB)`)
    }
  }

  async listcompany() {
    return await this.prisma.company.findMany({
      orderBy: {
        name: 'asc',
      },
    })
  }

  async getcompany(file: Express.Multer.File, body: companyPostDto) {
    let savedFileNameSK = ''
    this.validateFile(file)

    if (file) {
      const nama = file.originalname
      const fileExtension = nama.split('.').pop()?.toLowerCase()
      savedFileNameSK = `${uuidv4()}.${fileExtension}`
      const filePathSK = join(__dirname, '..', '../public', savedFileNameSK)
      await promises.writeFile(filePathSK, file.buffer, 'binary')
    }

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
        file: savedFileNameSK,
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

  async updatecompany(file: Express.Multer.File, id: string, body: companyPostDto) {
    let savedFileNameSK = ''
    console.log(1)

    if (file) {
      console.log(2)

      this.validateFile(file)
      const nama = file.originalname
      const fileExtension = nama.split('.').pop()?.toLowerCase()
      savedFileNameSK = `${uuidv4()}.${fileExtension}`
      const filePathSK = join(__dirname, '..', '../public', savedFileNameSK)
      await promises.writeFile(filePathSK, file.buffer, 'binary')
      console.log(3)
    }
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

    console.log(4)
    console.log(savedFileNameSK)

    return await this.prisma.company.update({
      where: {
        id,
      },
      data: {
        name: body.name || cek_id.name,
        email: body.email || cek_id.email,
        address: body.address || cek_id.address,
        file: savedFileNameSK || cek_id.file,
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
