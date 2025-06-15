import { BadRequestException, Injectable } from '@nestjs/common'
import { InvoiceStatus } from '@prisma/client'
import { EmailAutomationConfigDto, EmailAutomationType, UpdateEmailAutomationDto } from 'src/dto/email-automation.dto'
import { v4 as uuidv4 } from 'uuid'
import { PrismaService } from './prisma.service'

@Injectable()
export class EmailAutomationService {
  constructor(private prisma: PrismaService) {}

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

    // In a real implementation, you would:
    // 1. Send the actual email through an email service
    // 2. Log the email send in the database

    console.log(`Automated email would be sent:`)
    console.log(`To: ${invoice.toClient.email}`)
    console.log(`Subject: ${subject}`)
    console.log(`Body: ${body}`)

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
      },
    })

    return {
      sent: true,
      to: invoice.toClient.email,
      subject,
    }
  }

  private replaceTemplateVars(template: string, invoice: any, daysOverdue = 0) {
    return template
      .replace(/{invoiceNumber}/g, invoice.invoiceNumber)
      .replace(/{amount}/g, `$${invoice.subtotal.toFixed(2)}`)
      .replace(/{clientName}/g, invoice.toClient.name)
      .replace(/{companyName}/g, invoice.fromCompany.name)
      .replace(/{dueDate}/g, new Date(invoice.dueDate).toLocaleDateString())
      .replace(/{daysOverdue}/g, daysOverdue.toString())
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
