import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { EmailAutomationService } from './email-automation.service'

@Injectable()
export class EmailSchedulerService {
  private readonly logger = new Logger(EmailSchedulerService.name)

  constructor(private emailAutomationService: EmailAutomationService) {}

  // Run once daily at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyEmailAutomation() {
    this.logger.log('Running daily email automation check')
    try {
      const result = await this.emailAutomationService.processInvoiceEmails()
      this.logger.log(`Email automation completed: ${result.message}`)
    } catch (error) {
      this.logger.error(`Error processing automated emails: ${error.message}`, error.stack)
    }
  }

  // Also run at application startup to ensure it runs even if server was down at midnight
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
