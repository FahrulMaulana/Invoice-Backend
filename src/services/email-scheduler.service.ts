import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { EmailAutomationService } from './email-automation.service'

@Injectable()
export class EmailSchedulerService {
  private readonly logger = new Logger(EmailSchedulerService.name)

  constructor(private emailAutomationService: EmailAutomationService) {}

  // Run once daily at midnight to check all invoice emails
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyEmailAutomation() {
    this.logger.log('Running daily invoice email automation check')
    try {
      const result = await this.emailAutomationService.processInvoiceEmails()
      this.logger.log(`Email automation completed: ${result.message}`)
      this.logger.log(`Processed emails for: upcoming due dates, due today, and overdue invoices`)
    } catch (error) {
      this.logger.error(`Error processing automated emails: ${error.message}`, error.stack)
    }
  }

  // Run at 10:00 AM each day to ensure critical notifications are sent during business hours
  @Cron('0 10 * * *')
  async handleBusinessHoursEmailReminders() {
    this.logger.log('Running business hours invoice reminder check')
    try {
      const result = await this.emailAutomationService.processInvoiceEmails()
      this.logger.log(`Business hours email reminders completed: ${result.message}`)
    } catch (error) {
      this.logger.error(`Error processing business hours reminders: ${error.message}`, error.stack)
    }
  }

  // Also run at application startup to ensure it runs even if server was down
  async onApplicationBootstrap() {
    this.logger.log('Running initial email automation check on application startup')
    try {
      const result = await this.emailAutomationService.processInvoiceEmails()
      this.logger.log(`Initial email automation completed: ${result.message}`)
    } catch (error) {
      this.logger.error(`Error processing initial automated emails: ${error.message}`, error.stack)
    }
  }
}
