import { BadRequestException, HttpException, Injectable } from '@nestjs/common'
import * as ExcelJs from 'exceljs'
import { invoiceGeneratorPostDto } from 'src/dto/invoice-generator.dto'
import { v4 as uuidv4 } from 'uuid'
import { PrismaService } from './prisma.service'

@Injectable()
export class InvoiceGeneratorService {
  constructor(private prisma: PrismaService) {}

  async validateFile(file: Express.Multer.File): Promise<void> {
    try {
      if (!file) {
        throw new HttpException('Berkas tidak ditemukan', 400)
      }

      const allowedFileTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
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

  async getTemplate(body: invoiceGeneratorPostDto) {
    const workbook = new ExcelJs.Workbook()
    const worksheet = workbook.addWorksheet('Biodata')

    worksheet.columns = [
      { header: 'Company', key: 'company', width: 30, style: { alignment: { horizontal: 'left' } } },
      { header: 'Product', key: 'product', width: 30, style: { alignment: { horizontal: 'left' } } },
      { header: 'Creation Date', key: 'creationdate', width: 30, style: { alignment: { horizontal: 'left' } } },
      { header: 'Due Date', key: 'duedate', width: 30, style: { alignment: { horizontal: 'left' } } },
      { header: 'Client', key: 'client', width: 30, style: { alignment: { horizontal: 'left' } } },
      { header: 'Payment Method', key: 'paymentmethod', width: 30, style: { alignment: { horizontal: 'left' } } },
      { header: 'Price', key: 'price', width: 30, style: { alignment: { horizontal: 'left' } } },
    ]

    body.client.forEach((client, index) => {
      const clientData = this.prisma.client.findUnique({
        where: { id: client.id },
      })
      worksheet.addRow({
        company: body.companyId,
        product: body.productId,
        creationdate: body.date,
        duedate: body.due_date,
        client: client.id,
        paymentmethod: body.paymentMethodId,
        price: '',
      })
    })

    return workbook.xlsx.writeBuffer()
  }

  async uploadTemplate(file: Express.Multer.File, id: string) {
    await this.validateFile(file)

    try {
      const workbook = new ExcelJs.Workbook()
      await workbook.xlsx.load(file.buffer)
      const worksheet = workbook.getWorksheet(1) // Mengambil worksheet pertama

      const data: {
        company: ExcelJs.CellValue
        product: ExcelJs.CellValue
        creationdate: ExcelJs.CellValue
        duedate: ExcelJs.CellValue
        client: ExcelJs.CellValue
        paymentmethod: ExcelJs.CellValue
        price: ExcelJs.CellValue
      }[] = []

      worksheet?.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return // Lewati header
        const rowData = {
          company: row.getCell('A').value,
          product: row.getCell('B').value,
          creationdate: row.getCell('C').value,
          duedate: row.getCell('D').value,
          client: row.getCell('E').value,
          paymentmethod: row.getCell('F').value,
          price: row.getCell('G').value,
        }
        data.push(rowData)
      })

      // Validasi data
      if (data.length === 0) {
        throw new BadRequestException('No data found in Excel file')
      }

      // Validasi semua field terisi
      for (let i = 0; i < data.length; i++) {
        const item = data[i]
        if (!item.company || !item.product || !item.creationdate || !item.duedate || !item.client || !item.paymentmethod || !item.price) {
          throw new BadRequestException(`Row ${i + 2}: All fields must be filled`)
        }

        // Validasi harga adalah angka valid
        const price = parseFloat(item.price as string)
        if (isNaN(price) || price <= 0) {
          throw new BadRequestException(`Row ${i + 2}: Price must be a valid positive number`)
        }
      }

      const company = await this.prisma.company.findFirst({
        where: { name: data[0]?.company as string },
      })

      if (!company) {
        throw new BadRequestException('Company not found')
      }

      const product = await this.prisma.product.findFirst({
        where: { name: data[0].product as string },
      })

      if (!product) {
        throw new BadRequestException('Product not found')
      }

      const payment = await this.prisma.paymentMethod.findFirst({
        where: { methodName: data[0].paymentmethod as string },
      })

      if (!payment) {
        throw new BadRequestException('Payment method not found')
      }

      // Promise.all untuk menunggu semua invoice selesai dibuat
      const createdInvoices = await Promise.all(
        data.map(async (item) => {
          const client = await this.prisma.client.findFirst({
            where: { legalName: item.client as string },
          })

          if (!client) {
            throw new BadRequestException(`Client not found: ${item.client}`)
          }

          const price = parseFloat(item.price as string)

          const invoices = await this.prisma.invoice.create({
            data: {
              id: uuidv4(),
              invoiceNumber: `INV${Math.random().toString(36).substring(2, 8)}`,
              status: 'UNPAID',
              paymentMethodId: payment.id,
              userId: id,
              companyId: company.id,
              date: new Date(item.creationdate as string),
              dueDate: new Date(item.duedate as string),
              clientId: client.id,
              subtotal: price,
              isdeleted: false,
            },
          })

          await this.prisma.invoiceItem.create({
            data: {
              id: uuidv4(),
              quantity: 1,
              total: price,
              customPrice: price,
              productId: product.id,
              invoiceId: invoices.id,
            },
          })

          return {
            invoiceId: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            client: client.legalName,
            amount: price,
          }
        })
      )

      return {
        success: true,
        message: `${createdInvoices.length} invoices created successfully`,
        invoices: createdInvoices,
      }
    } catch (error) {
      throw new BadRequestException(`Gagal membaca file Excel: ${error.message}`)
    }
  }
}
