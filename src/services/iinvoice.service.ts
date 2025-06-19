import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { InvoiceStatus } from '@prisma/client'
import * as nodemailer from 'nodemailer'
import puppeteer from 'puppeteer'
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
    const { status, month, paymentMethodId, companyId, clientId, productId } = filters || {}

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

    if (productId) {
      where.items = {
        some: {
          productId,
        },
      }
    }

    return await this.prisma.invoice.findMany({
      where,
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
        invoiceNumber: `INV${Math.random().toString(36).substring(2, 8)}`,
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
                <p style="margin: 0;">${invoice.fromCompany.email}</p>
              </div>
              <div>
                <h4 style="color: #2a3f54; margin-top: 0;">To:</h4>
                <p style="margin: 0;">${invoice.toClient.legalName}</p>
                <p style="margin: 0;">${invoice.toClient.email}</p>
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

  async generatePDF(invoiceId: string): Promise<Buffer> {
    this.logger.log(`Generating PDF for invoice: ${invoiceId}`)

    // Fetch invoice with all related data
    console.log(`Fetching invoice details for ID: ${invoiceId}`)

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
      },
      include: {
        toClient: true,
        fromCompany: true,
        paymentMethod: true,
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

    try {
      // Launch a headless browser
      const isProduction = process.env.APP_ENV !== 'local'

      const browser = await puppeteer.launch({
        headless: true,
        executablePath: isProduction ? '/snap/bin/chromium' : undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
      // Create a new page
      const page = await browser.newPage()

      // Format currency properly
      const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
        }).format(amount || 0)
      }

      // Calculate totalsx
      const subtotal = invoice.subtotal || 0
      const tax = subtotal * 0.1 // Assuming 10% tax
      const total = subtotal + tax

      // Format dates nicely
      const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      }

      // Get status color
      const getStatusColor = (status) => {
        switch (status) {
          case 'PAID':
            return '#27ae60'
          case 'UNPAID':
            return '#e74c3c'
          case 'BAD_DEBT':
            return '#f39c12'
          default:
            return '#3498db'
        }
      }

      // Generate HTML content for the invoice with improved design
      // Generate HTML content for the invoice with Tailwind-style design using pure CSS
      const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          /* Reset */
          *, ::before, ::after {
            box-sizing: border-box;
            border-width: 0;
            border-style: solid;
            border-color: #e5e7eb;
          }
          
          body {
            margin: 0;
            line-height: 1.5;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
          }
          
          p {
            margin: 0;
          }

          table {
            text-indent: 0;
            border-color: inherit;
            border-collapse: collapse;
          }
          
          /* Layout */
          .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
          .py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
          .py-10 { padding-top: 2.5rem; padding-bottom: 2.5rem; }
          .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
          .px-14 { padding-left: 3.5rem; padding-right: 3.5rem; }
          .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
          .p-3 { padding: 0.75rem; }
          .pb-3 { padding-bottom: 0.75rem; }
          .pl-2 { padding-left: 0.5rem; }
          .pl-3 { padding-left: 0.75rem; }
          .pl-4 { padding-left: 1rem; }
          .pr-3 { padding-right: 0.75rem; }
          .pr-4 { padding-right: 1rem; }
          
          /* Table */
          .w-full { width: 100%; }
          .w-1\/2 { width: 50%; }
          .h-12 { height: 3rem; }
          .border-collapse { border-collapse: collapse; }
          .border-spacing-0 { border-spacing: 0px; }
          .whitespace-nowrap { white-space: nowrap; }
          .border-b { border-bottom-width: 1px; }
          .border-b-2 { border-bottom-width: 2px; }
          .border-r { border-right-width: 1px; }
          .align-top { vertical-align: top; }
          
          /* Text */
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
          .text-xs { font-size: 0.75rem; line-height: 1rem; }
          .font-bold { font-weight: 700; }
          .italic { font-style: italic; }
          
          /* Colors */
          .bg-main { background-color: #5c6ac4; }
          .bg-slate-100 { background-color: #f1f5f9; }
          .text-main { color: #5c6ac4; }
          .text-neutral-600 { color: #525252; }
          .text-neutral-700 { color: #404040; }
          .text-slate-300 { color: #cbd5e1; }
          .text-slate-400 { color: #94a3b8; }
          .text-white { color: #fff; }
          .border-main { border-color: #5c6ac4; }
          
          /* Positioning */
          .fixed { position: fixed; }
          .bottom-0 { bottom: 0px; }
          .left-0 { left: 0px; }
          
          /* Status Stamps */
          .paid-stamp, .unpaid-stamp, .bad-debt-stamp {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 80px;
            font-weight: bold;
            padding: 10px 20px;
            border-radius: 10px;
            z-index: 1;
            opacity: 0.3;
            text-transform: uppercase;
            letter-spacing: 5px;
            pointer-events: none;
          }
          
          .paid-stamp {
            color: #27ae60;
            border: 10px solid #27ae60;
            opacity: ${invoice.status === 'PAID' ? 0.3 : 0};
          }
          
          .unpaid-stamp {
            color: #e74c3c;
            border: 10px solid #e74c3c;
            opacity: ${invoice.status === 'UNPAID' ? 0.3 : 0};
          }
          
          .bad-debt-stamp {
            color: #f39c12;
            border: 10px solid #f39c12;
            opacity: ${invoice.status === 'BAD_DEBT' ? 0.3 : 0};
          }
          
          /* Print settings */
          @page { margin: 0; }
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>

      <body>
        <div>        
          <div class="py-4">
            <div class="px-14 py-6">
              <table class="w-full border-collapse border-spacing-0">
                <tbody>
                  <tr>
                    <td class="w-full align-top">
                      <div>
                        ${
                          invoice.fromCompany.file
                            ? `<img src="${process.env.BASE_URL || 'http://localhost:3001'}/${invoice.fromCompany.file}" alt="${
                                invoice.fromCompany.name
                              } Logo" class="h-12">`
                            : `<div class="text-main font-bold">${invoice.fromCompany.name}</div>`
                        }
                      </div>
                    </td>

                    <td class="align-top">
                      <div class="text-sm">
                        <table class="border-collapse border-spacing-0">
                          <tbody>
                            <tr>
                              <td class="border-r pr-4">
                                <div>
                                  <p class="whitespace-nowrap text-slate-400 text-right">Date</p>
                                  <p class="whitespace-nowrap font-bold text-main text-right">${formatDate(invoice.date)}</p>
                                </div>
                              </td>
                              <td class="pl-4">
                                <div>
                                  <p class="whitespace-nowrap text-slate-400 text-right">Invoice #</p>
                                  <p class="whitespace-nowrap font-bold text-main text-right">${invoice.invoiceNumber}</p>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="bg-slate-100 px-14 py-6 text-sm">
              <table class="w-full border-collapse border-spacing-0">
                <tbody>
                  <tr>
                    <td class="w-1/2 align-top">
                      <div class="text-sm text-neutral-600">
                        <p class="font-bold">${invoice.fromCompany.name}</p>
                        ${invoice.fromCompany.email ? `<p>${invoice.fromCompany.email}</p>` : ''}
                        ${invoice.fromCompany.address ? `<p>${invoice.fromCompany.address}</p>` : ''}
                      </div>
                    </td>
                    <td class="w-1/2 align-top text-right">
                      <div class="text-sm text-neutral-600">
                        <p class="font-bold">${invoice.toClient.legalName}</p>
                        ${invoice.toClient.email ? `<p>${invoice.toClient.email}</p>` : ''}
                        ${invoice.toClient.address ? `<p>${invoice.toClient.address}</p>` : ''}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="px-14 py-10 text-sm text-neutral-700">
              <table class="w-full border-collapse border-spacing-0">
                <thead>
                  <tr>
                    <td class="border-b-2 border-main pb-3 pl-3 font-bold text-main">#</td>
                    <td class="border-b-2 border-main pb-3 pl-2 font-bold text-main">Product details</td>
                    <td class="border-b-2 border-main pb-3 pl-2 text-right font-bold text-main">Price</td>
                    <td class="border-b-2 border-main pb-3 pl-2 text-center font-bold text-main">Qty.</td>
                    <td class="border-b-2 border-main pb-3 pl-2 text-right font-bold text-main">Subtotal</td>
                  </tr>
                </thead>
                <tbody>
                  ${invoice.items
                    .map(
                      (item, index) => `
                    <tr>
                      <td class="border-b py-3 pl-3">${index + 1}.</td>
                      <td class="border-b py-3 pl-2">
                        <div style="font-weight: 500;">${item.product.name}</div>
                        <div style="font-size: 12px; color: #7f8c8d;">${item.product.description || ''}</div>
                      </td>
                      <td class="border-b py-3 pl-2 text-right">${formatCurrency(item.customPrice || 0)}</td>
                      <td class="border-b py-3 pl-2 text-center">${item.quantity}</td>
                      <td class="border-b py-3 pl-2 pr-3 text-right">${formatCurrency(item.total || 0)}</td>
                    </tr>
                  `
                    )
                    .join('')}
                  <tr>
                    <td colspan="5">
                      <table class="w-full border-collapse border-spacing-0">
                        <tbody>
                          <tr>
                            <td class="w-full"></td>
                            <td>
                              <table class="w-full border-collapse border-spacing-0">
                                <tbody>
                                  <tr>
                                    <td class="border-b p-3">
                                      <div class="whitespace-nowrap text-slate-400">Subtotal:</div>
                                    </td>
                                    <td class="border-b p-3 text-right">
                                      <div class="whitespace-nowrap font-bold text-main">${formatCurrency(subtotal)}</div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td class="bg-main p-3">
                                      <div class="whitespace-nowrap font-bold text-white">Total:</div>
                                    </td>
                                    <td class="bg-main p-3 text-right">
                                      <div class="whitespace-nowrap font-bold text-white">${formatCurrency(subtotal)}</div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="px-14 text-sm text-neutral-700">
              <p>Status: <span style="color: ${getStatusColor(invoice.status)};">${invoice.status}</span></p>
              <p>Due Date: ${formatDate(invoice.dueDate)}</p>
              <p class="text-main font-bold">PAYMENT DETAILS</p>
              ${
                invoice.paymentMethod?.info
                  ? `<div style="white-space: pre-line; margin-top: -5px; line-height: 1.3;">
                      ${invoice.paymentMethod.info.replace(/\\n/g, '<br>')}
                    </div>`
                  : '<p style="margin-top: -5px;">Not specified</p>'
              }
            </div>
            <div class="px-14 py-10 text-sm text-neutral-700">
              <p class="text-main font-bold">Notes</p>
              <p class="italic">We appreciate your business.
              For any queries or clarifications, don’t hesitate to contact us.
              Kindly ensure the invoice is settled before the due date.
              Please be aware that overdue payments may result in a temporary pause in services.</p>
            </div>

            <footer class="fixed bottom-0 left-0 bg-slate-100 w-full text-neutral-600 text-center text-xs py-3">
              ${invoice.fromCompany.name}
              <span class="text-slate-300 px-2">|</span>
              ${invoice.fromCompany.email || ''}
              <span class="text-slate-300 px-2">|</span>
              © ${new Date().getFullYear()} All rights reserved.
            </footer>
          </div>
        </div>
      </body>
      </html>
      `

      // Set content to the page
      await page.setContent(htmlContent)

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
      })

      // Close the browser
      await browser.close()

      this.logger.log(`PDF generated successfully for invoice: ${invoiceId}`)

      return Buffer.from(pdfBuffer)
    } catch (error) {
      this.logger.error(`Error generating PDF: ${error.message}`)
      throw new BadRequestException(`Failed to generate PDF: ${error.message}`)
    }
  }
}
