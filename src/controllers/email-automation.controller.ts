import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { plainToInstance } from 'class-transformer'
import { ApiBearerAuth } from 'src/common/decorator/ApiBearerAuth'
import { ERole } from 'src/common/enums/ERole'
import { EmailAutomationType, EmailTestDto, GetEmailAutomationDto, UpdateEmailAutomationDto } from 'src/dto/email-automation.dto'
import { responseDto } from 'src/dto/respon.dto'
import { EmailAutomationService } from 'src/services/email-automation.service'

@ApiTags('Email Automation')
@Controller('api/email-automation')
export class EmailAutomationController {
  constructor(private emailAutomation: EmailAutomationService) {}

  @ApiBearerAuth([ERole.SU])
  @Get()
  async getAllConfigs() {
    const configs = await this.emailAutomation.getAllEmailAutomationConfigs()
    return plainToInstance(GetEmailAutomationDto, configs)
  }

  @ApiBearerAuth([ERole.SU])
  @Get(':type')
  async getConfig(@Param('type') type: EmailAutomationType) {
    const config = await this.emailAutomation.getEmailAutomationConfig(type)
    return plainToInstance(GetEmailAutomationDto, config)
  }

  @ApiBearerAuth([ERole.SU])
  @Post()
  async updateConfig(@Body() updateDto: UpdateEmailAutomationDto) {
    await this.emailAutomation.updateEmailAutomationConfig(updateDto)
    const response = new responseDto()
    response.message = 'Email automation configuration updated successfully'
    return response
  }

  @ApiBearerAuth([ERole.SU])
  @Post('/test')
  async testEmail(@Body() testDto: EmailTestDto) {
    const result = await this.emailAutomation.testAutomatedEmail(testDto.invoiceId, testDto.type)
    const response = new responseDto()
    response.message = `Test email sent to ${result.to}`
    return response
  }

  @ApiBearerAuth([ERole.SU])
  @Post('/process')
  async processEmails() {
    const result = await this.emailAutomation.processInvoiceEmails()
    const response = new responseDto()
    response.message = result.message
    return response
  }

  @ApiBearerAuth([ERole.SU])
  @Get('/logs')
  async getEmailLogs(@Query('invoiceId') invoiceId?: string) {
    const logs = await this.emailAutomation.getEmailLogs(invoiceId)
    return logs
  }
}
