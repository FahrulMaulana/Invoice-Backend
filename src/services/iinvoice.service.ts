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
      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
          
          :root {
            --primary-color: #3498db;
            --secondary-color: #2980b9;
            --accent-color: #f1c40f;
            --text-color: #34495e;
            --light-gray: #ecf0f1;
            --dark-gray: #7f8c8d;
            --success-color: #27ae60;
            --danger-color: #e74c3c;
            --warning-color: #f39c12;
            --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            --border-radius: 8px;
          }
          
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: 'Poppins', Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: var(--text-color);
            background-color: white;
            position: relative;
          }
          
          .invoice-wrapper {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            position: relative;
            min-height: 100vh;
          }
          
          .invoice-content {
            padding-bottom: 150px; /* Space for thank you and footer */
          }
          
          .invoice-top {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            align-items: center;
          }
          
          .company-logo-container {
            max-width: 200px;
            display: flex;
            align-items: center;
          }
          
          .company-logo-image {
            max-width: 100%;
            max-height: 80px;
            object-fit: contain;
          }
          
          .company-logo-text {
            font-size: 32px;
            font-weight: 700;
            color: var(--primary-color);
            display: inline-block;
          }
          
          .invoice-info {
            text-align: right;
          }
          
          .invoice-title {
            font-size: 36px;
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: 10px;
            letter-spacing: 1px;
          }
          
          .invoice-number {
            font-size: 16px;
            color: var(--dark-gray);
            margin-bottom: 5px;
          }
          
          .invoice-date {
            font-size: 14px;
            color: var(--dark-gray);
          }
          
          .invoice-parties {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            padding: 30px;
            background-color: var(--light-gray);
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
          }
          
          .party {
            width: 45%;
          }
          
          .party-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--primary-color);
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 2px solid var(--primary-color);
            padding-bottom: 5px;
            display: inline-block;
          }
          
          .party-name {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 10px;
          }
          
          .party-details {
            font-size: 14px;
            line-height: 1.6;
            color: var(--text-color);
          }
          
          .invoice-meta {
            background-color: var(--primary-color);
            color: white;
            border-radius: var(--border-radius);
            padding: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            box-shadow: var(--shadow);
          }
          
          .meta-item {
            text-align: center;
            flex: 1;
          }
          
          .meta-title {
            text-transform: uppercase;
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 5px;
            opacity: 0.8;
          }
          
          .meta-value {
            font-size: 16px;
            font-weight: 600;
          }
          
          .invoice-table-container {
            margin-bottom: 30px;
            border-radius: var(--border-radius);
            overflow: hidden;
            box-shadow: var(--shadow);
          }
          
          .invoice-table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .invoice-table th {
            background-color: var(--primary-color);
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
          }
          
          .invoice-table th:last-child,
          .invoice-table td:last-child {
            text-align: right;
          }
          
          .invoice-table td {
            padding: 15px;
            border-bottom: 1px solid var(--light-gray);
            font-size: 14px;
          }
          
          .invoice-table tr:nth-child(even) {
            background-color: rgba(236, 240, 241, 0.5);
          }
          
          .invoice-table tr:hover {
            background-color: rgba(236, 240, 241, 0.8);
          }
          
          .text-center { text-align: center !important; }
          .text-right { text-align: right !important; }
          
          .totals-container {
            margin-left: auto;
            width: 350px;
            margin-bottom: 40px;
          }
          
          .totals-table {
            width: 100%;
            font-size: 14px;
          }
          
          .totals-table td {
            padding: 8px 15px;
          }
          
          .totals-table tr.total-row td {
            background-color: var(--primary-color);
            color: white;
            font-weight: 600;
            font-size: 16px;
            padding: 12px 15px;
            border-radius: var(--border-radius);
          }
          
          .thank-you {
            font-size: 24px;
            font-weight: 600;
            color: var(--primary-color);
            text-align: center;
            margin-bottom: 10px;
            position: absolute;
            bottom: 80px;
            left: 0;
            right: 0;
          }
          
          .footer {
            position: absolute;
            bottom: 20px;
            left: 0;
            right: 0;
            margin-top: 15px;
            border-top: 1px solid var(--light-gray);
            padding-top: 20px;
            font-size: 14px;
            color: var(--dark-gray);
            text-align: center;
          }
          
          .payment-info {
            margin-top: 30px;
            background-color: var(--light-gray);
            border-radius: var(--border-radius);
            padding: 20px;
            font-size: 14px;
            line-height: 1.6;
            box-shadow: var(--shadow);
          }
          
          .payment-title {
            font-weight: 600;
            margin-bottom: 10px;
            color: var(--primary-color);
          }
          
          .status-badge {
            display: inline-block;
            padding: 8px 15px;
            border-radius: 50px;
            font-weight: 600;
            font-size: 14px;
            color: white;
            background-color: ${getStatusColor(invoice.status)};
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
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
            color: var(--success-color);
            border: 10px solid var(--success-color);
            opacity: ${invoice.status === 'PAID' ? 0.3 : 0};
          }
          
          .unpaid-stamp {
            color: var(--danger-color);
            border: 10px solid var(--danger-color);
            opacity: ${invoice.status === 'UNPAID' ? 0.3 : 0};
          }
          
          .bad-debt-stamp {
            color: var(--warning-color);
            border: 10px solid var(--warning-color);
            opacity: ${invoice.status === 'BAD_DEBT' ? 0.3 : 0};
          }
          
          .barcode {
            text-align: center;
            margin-top: 30px;
            font-family: 'Libre Barcode 39', cursive;
            font-size: 60px;
            line-height: 1;
            color: var(--text-color);
          }
        </style>
      </head>
      <body>
        <div class="invoice-wrapper">
          <div class="paid-stamp">PAID</div>
          <div class="unpaid-stamp">UNPAID</div>
          <div class="bad-debt-stamp">BAD DEBT</div>
          
          <div class="invoice-content">
            <div class="invoice-top">
              <div class="company-logo-container">
                ${
                  invoice.fromCompany.file
                    ? `<img src="${process.env.BASE_URL || 'http://localhost:3001'}/${invoice.fromCompany.file}" alt="${
                        invoice.fromCompany.name
                      } Logo" class="company-logo-image">`
                    : `<div class="company-logo-text">${invoice.fromCompany.name}</div>`
                }
              </div>
              
              <div class="invoice-info">
                <div class="invoice-title">INVOICE</div>
                <div class="invoice-number"># ${invoice.invoiceNumber}</div>
                <div class="invoice-date">Issued: ${formatDate(invoice.date)}</div>
                <div class="invoice-date">Due: ${formatDate(invoice.dueDate)}</div>
              </div>
            </div>
            
            <div class="invoice-parties">
              <div class="party">
                <div class="party-title">From</div>
                <div class="party-name">${invoice.fromCompany.name}</div>
                <div class="party-details">
                  ${invoice.fromCompany.email ? `<div>${invoice.fromCompany.email}</div>` : ''}
                  ${invoice.fromCompany.address ? `<div>${invoice.fromCompany.address}</div>` : ''}
                </div>
              </div>
              
              <div class="party">
                <div class="party-title">Bill To</div>
                <div class="party-name">${invoice.toClient.legalName}</div>
                <div class="party-details">
                  ${invoice.toClient.email ? `<div>${invoice.toClient.email}</div>` : ''}
                  ${invoice.toClient.address ? `<div>${invoice.toClient.address}</div>` : ''}
                </div>
              </div>
            </div>
            
            <div class="invoice-table-container">
              <table class="invoice-table">
                <thead>
                  <tr>
                    <th style="width: 45%;">Item Description</th>
                    <th class="text-center" style="width: 15%;">Quantity</th>
                    <th class="text-right" style="width: 20%;">Price</th>
                    <th class="text-right" style="width: 20%;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoice.items
                    .map(
                      (item) => `
                    <tr>
                      <td>
                        <div style="font-weight: 500;">${item.product.name}</div>
                        <div style="font-size: 12px; color: var(--dark-gray);">${item.product.description || ''}</div>
                      </td>
                      <td class="text-center">${item.quantity}</td>
                      <td class="text-right">${formatCurrency(item.customPrice || 0)}</td>
                      <td class="text-right">${formatCurrency(item.total || 0)}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
            
            <div class="totals-container">
              <table class="totals-table">
                <tr>
                  <td>Subtotal:</td>
                  <td class="text-right">${formatCurrency(subtotal)}</td>
                </tr>
                <tr class="total-row">
                  <td>Total:</td>
                  <td class="text-right">${formatCurrency(subtotal)}</td>
                </tr>
              </table>
            </div>
          </div>
          
          <div class="thank-you">Thank You for Your Business!</div>
          
          <div class="footer">
            <p>If you have any questions concerning this invoice, please contact us at ${invoice.fromCompany.email || '[Company Email]'}</p>
            <p>© ${new Date().getFullYear()} ${invoice.fromCompany.name} - All rights reserved.</p>
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
