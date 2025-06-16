import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InvoiceStatus } from '@prisma/client'
import * as nodemailer from 'nodemailer'
import { EmailAutomationConfigDto, EmailAutomationType, UpdateEmailAutomationDto } from 'src/dto/email-automation.dto'
import { v4 as uuidv4 } from 'uuid'
import { PrismaService } from './prisma.service'

@Injectable()
export class EmailAutomationService {
  private transporter: any

  constructor(private prisma: PrismaService, private configService: ConfigService) {
    // Initialize email transporter
    this.initializeEmailTransporter()
  }

  private initializeEmailTransporter() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_PORT') === 465, // true for 465, false for other ports
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASSWORD'), // Changed from SMTP_PASS to SMTP_PASSWORD to match .env
      },
    })
  }

  async getEmailAutomationConfig(type: EmailAutomationType) {
    const config = await this.prisma.emailAutomation.findFirst({
      where: {
        type,
      },
    })

    if (!config) {
      // Create default config if it doesn't exist
      return this.createDefaultConfig(type)
    }

    return config
  }

  async getAllEmailAutomationConfigs() {
    const configs = await this.prisma.emailAutomation.findMany()

    // Create default configs if they don't exist
    if (configs.length < 3) {
      const existingTypes = configs.map((config) => config.type)

      for (const type of Object.values(EmailAutomationType)) {
        if (!existingTypes.includes(type)) {
          const newConfig = await this.createDefaultConfig(type)
          configs.push(newConfig)
        }
      }
    }

    return configs
  }

  private async createDefaultConfig(type: EmailAutomationType) {
    let daysBefore: number | null = null
    let daysAfter: number | null = null
    let subject = ''
    let body = ''

    // Get sample invoice data to use as a reference for templates
    const sampleInvoice = await this.getSampleInvoiceForTemplates()

    switch (type) {
      case EmailAutomationType.BEFORE_DUE:
        daysBefore = 2
        subject = 'Reminder: Invoice #{invoiceNumber} Due in 2 Days'
        body =
          'Dear {clientName},\n\nThis is a friendly reminder that invoice #{invoiceNumber} for {amount} is due in 2 days.\n\nThank you for your business.\n\nRegards,\n{companyName}'
        break
      case EmailAutomationType.ON_DUE:
        subject = 'Invoice #{invoiceNumber} Due Today'
        body =
          'Dear {clientName},\n\nThis is a friendly reminder that invoice #{invoiceNumber} for {amount} is due today.\n\nThank you for your business.\n\nRegards,\n{companyName}'
        break
      case EmailAutomationType.AFTER_DUE:
        daysAfter = 1
        subject = 'Overdue Notice: Invoice #{invoiceNumber}'
        body =
          'Dear {clientName},\n\nThis is to inform you that invoice #{invoiceNumber} for {amount} is now overdue by {daysOverdue} days.\n\nPlease arrange for payment as soon as possible.\n\nRegards,\n{companyName}'
        break
    }

    // If we have a sample invoice, use it to populate a preview in the body
    if (sampleInvoice) {
      let daysOverdue = 0
      if (type === EmailAutomationType.AFTER_DUE) {
        const dueDate = new Date(sampleInvoice.dueDate)
        const today = new Date()
        daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      }

      // Add a preview section to the template body
      body += `\n\n---\nPreview with actual invoice data:\n\n${this.replaceTemplateVars(body, sampleInvoice, daysOverdue)}`
    }

    return await this.prisma.emailAutomation.create({
      data: {
        id: uuidv4(),
        type,
        enabled: false,
        daysBefore,
        daysAfter,
        subject,
        body,
      },
    })
  }

  // Helper method to get a sample invoice for template previews
  private async getSampleInvoiceForTemplates() {
    try {
      // Try to find a recent unpaid invoice
      const invoice = await this.prisma.invoice.findFirst({
        where: {
          status: InvoiceStatus.UNPAID,
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
        orderBy: {
          date: 'desc',
        },
      })

      if (invoice) {
        // Calculate the total amount if not already set
        if (!invoice.subtotal && invoice.items && invoice.items.length > 0) {
          // Calculate the subtotal from invoice items since it's not set
          invoice.subtotal = invoice.items.reduce((sum, item) => sum + (item.total || 0), 0)
        }

        // Make sure client name is available
        if (invoice.toClient && invoice.toClient.legalName) {
          invoice.toClient.legalName
        }

        return invoice
      }

      return null
    } catch (error) {
      console.error('Error getting sample invoice for templates:', error)
      return null
    }
  }

  async updateEmailAutomationConfig(updateDto: UpdateEmailAutomationDto) {
    const { type, config } = updateDto

    // Validate configuration based on type
    this.validateConfig(type, config)

    const existingConfig = await this.prisma.emailAutomation.findFirst({
      where: {
        type,
      },
    })

    if (existingConfig) {
      return this.prisma.emailAutomation.update({
        where: {
          id: existingConfig.id,
        },
        data: {
          enabled: config.enabled,
          daysBefore: type === EmailAutomationType.BEFORE_DUE ? config.daysBefore : null,
          daysAfter: type === EmailAutomationType.AFTER_DUE ? config.daysAfter : null,
          subject: config.template.subject,
          body: config.template.body,
        },
      })
    } else {
      return this.prisma.emailAutomation.create({
        data: {
          id: uuidv4(),
          type,
          enabled: config.enabled,
          daysBefore: type === EmailAutomationType.BEFORE_DUE ? config.daysBefore : null,
          daysAfter: type === EmailAutomationType.AFTER_DUE ? config.daysAfter : null,
          subject: config.template.subject,
          body: config.template.body,
        },
      })
    }
  }

  private validateConfig(type: EmailAutomationType, config: EmailAutomationConfigDto) {
    switch (type) {
      case EmailAutomationType.BEFORE_DUE:
        if (!config.daysBefore) {
          throw new BadRequestException('daysBefore is required for BEFORE_DUE type')
        }
        break
      case EmailAutomationType.AFTER_DUE:
        if (!config.daysAfter) {
          throw new BadRequestException('daysAfter is required for AFTER_DUE type')
        }
        break
    }
  }

  async processInvoiceEmails() {
    // Get all active email automation configs
    const configs = await this.prisma.emailAutomation.findMany({
      where: {
        enabled: true,
      },
    })

    // Process each config type
    for (const config of configs) {
      await this.processEmailsByType(config)
    }

    return {
      success: true,
      message: 'Invoice email automation processed successfully',
    }
  }

  private async processEmailsByType(config: any) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    switch (config.type) {
      case EmailAutomationType.BEFORE_DUE:
        await this.processBeforeDueEmails(config, today)
        break
      case EmailAutomationType.ON_DUE:
        await this.processOnDueEmails(today)
        break
      case EmailAutomationType.AFTER_DUE:
        await this.processAfterDueEmails(config, today)
        break
    }
  }

  private async processBeforeDueEmails(config: any, today: Date) {
    // Calculate the target due date (today + daysBefore)
    const targetDate = new Date(today)
    targetDate.setDate(targetDate.getDate() + config.daysBefore)

    // Format dates to match database format
    const targetDateString = targetDate.toISOString().split('T')[0]

    // Find invoices with the target due date and UNPAID status
    const invoices = await this.prisma.invoice.findMany({
      where: {
        dueDate: {
          gte: new Date(`${targetDateString}T00:00:00.000Z`),
          lt: new Date(`${targetDateString}T23:59:59.999Z`),
        },
        status: InvoiceStatus.UNPAID,
      },
      include: {
        toClient: true,
        fromCompany: true,
      },
    })

    // Send emails for each invoice
    for (const invoice of invoices) {
      await this.sendAutomatedEmail(invoice, config)
    }
  }

  private async processOnDueEmails(today: Date) {
    // Format today's date to match database format
    const todayString = today.toISOString().split('T')[0]

    // Find invoices due today with UNPAID status
    const invoices = await this.prisma.invoice.findMany({
      where: {
        dueDate: {
          gte: new Date(`${todayString}T00:00:00.000Z`),
          lt: new Date(`${todayString}T23:59:59.999Z`),
        },
        status: InvoiceStatus.UNPAID,
      },
      include: {
        toClient: true,
        fromCompany: true,
      },
    })

    // Get the ON_DUE config
    const config = await this.prisma.emailAutomation.findFirst({
      where: {
        type: EmailAutomationType.ON_DUE,
      },
    })

    // Send emails for each invoice
    for (const invoice of invoices) {
      await this.sendAutomatedEmail(invoice, config)
    }
  }

  private async processAfterDueEmails(config: any, today: Date) {
    // Calculate the target due date (today - daysAfter)
    const targetDate = new Date(today)
    targetDate.setDate(targetDate.getDate() - config.daysAfter)

    // Format dates to match database format
    const targetDateString = targetDate.toISOString().split('T')[0]

    // Find invoices with the target due date and UNPAID status
    const invoices = await this.prisma.invoice.findMany({
      where: {
        dueDate: {
          gte: new Date(`${targetDateString}T00:00:00.000Z`),
          lt: new Date(`${targetDateString}T23:59:59.999Z`),
        },
        status: InvoiceStatus.UNPAID,
      },
      include: {
        toClient: true,
        fromCompany: true,
      },
    })

    // Send emails for each invoice
    for (const invoice of invoices) {
      await this.sendAutomatedEmail(invoice, config)
    }
  }

  private async sendAutomatedEmail(invoice: any, config: any) {
    // Calculate days overdue for AFTER_DUE emails
    let daysOverdue = 0
    if (config.type === EmailAutomationType.AFTER_DUE) {
      const dueDate = new Date(invoice.dueDate)
      const today = new Date()
      daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Replace template variables
    const subject = this.replaceTemplateVars(config.subject, invoice, daysOverdue)
    const body = this.replaceTemplateVars(config.body, invoice, daysOverdue)

    try {
      // Send the actual email
      if (this.configService.get('EMAIL_SENDING_ENABLED') === 'true') {
        await this.transporter.sendMail({
          from: this.configService.get('SMTP_FROM'),
          to: invoice.toClient.email,
          subject,
          text: body,
          // You can also include HTML version
          // html: this.convertToHtml(body),
        })
      } else {
        // Log only in development mode
        console.log(`[DEV MODE] Automated email would be sent:`)
        console.log(`To: ${invoice.toClient.email}`)
        console.log(`Subject: ${subject}`)
        console.log(`Body: ${body}`)
      }

      // Record this email in the database
      await this.prisma.emailLog.create({
        data: {
          id: uuidv4(),
          invoiceId: invoice.id,
          type: config.type,
          sentAt: new Date(),
          recipient: invoice.toClient.email,
          subject,
          body,
          status: this.configService.get('EMAIL_SENDING_ENABLED') === 'true' ? 'SENT' : 'LOGGED',
        },
      })

      return {
        sent: true,
        to: invoice.toClient.email,
        subject,
      }
    } catch (error) {
      // Log the error
      console.error(`Failed to send email to ${invoice.toClient.email}:`, error)

      // Record the failed attempt
      await this.prisma.emailLog.create({
        data: {
          id: uuidv4(),
          invoiceId: invoice.id,
          type: config.type,
          sentAt: new Date(),
          recipient: invoice.toClient.email,
          subject,
          body,
          status: 'FAILED',
          error: error.message,
        },
      })

      return {
        sent: false,
        error: error.message,
      }
    }
  }

  // Replace template variables with actual values from the invoice
  private replaceTemplateVars(template: string, invoice: any, daysOverdue: number): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoice.currency || 'USD',
    })

    return template
      .replace(/{invoiceNumber}/g, invoice.invoiceNumber || '')
      .replace(/{amount}/g, formatter.format(invoice.subtotal || 0))
      .replace(/{clientName}/g, invoice.toClient?.name || '')
      .replace(/{companyName}/g, invoice.fromCompany?.name || '')
      .replace(/{dueDate}/g, this.formatDate(invoice.dueDate))
      .replace(/{invoiceDate}/g, this.formatDate(invoice.invoiceDate))
      .replace(/{daysOverdue}/g, daysOverdue.toString())
  }

  // Helper method to format dates for email templates
  private formatDate(date: Date | string): string {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Optional: Convert plain text to HTML for better email presentation
  private convertToHtml(text: string): string {
    return text.replace(/\n/g, '<br>').replace(/(^|[^\w])(https?:\/\/[^\s]+)/g, '$1<a href="$2">$2</a>')
  }

  async testAutomatedEmail(invoiceId: string, type: EmailAutomationType) {
    // Find the invoice
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
      },
      include: {
        toClient: true,
        fromCompany: true,
      },
    })

    if (!invoice) {
      throw new BadRequestException('Invoice not found')
    }

    // Get the email config for the specified type
    const config = await this.prisma.emailAutomation.findFirst({
      where: {
        type,
      },
    })

    if (!config) {
      throw new BadRequestException(`Email automation for ${type} not found`)
    }

    // Send a test email
    return this.sendAutomatedEmail(invoice, config)
  }

  async getEmailLogs(invoiceId?: string) {
    // Build where clause
    const where: any = {}
    if (invoiceId) {
      where.invoiceId = invoiceId
    }

    // Get email logs
    return this.prisma.emailLog.findMany({
      where,
      include: {
        invoice: {
          include: {
            toClient: true,
          },
        },
      },
      orderBy: {
        sentAt: 'desc',
      },
    })
  }
}
