import { Expose, Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator'

export enum EmailAutomationType {
  BEFORE_DUE = 'BEFORE_DUE',
  ON_DUE = 'ON_DUE',
  AFTER_DUE = 'AFTER_DUE',
}

export class EmailTemplateDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  subject: string

  @Expose()
  @IsString()
  @IsNotEmpty()
  body: string
}

export class EmailAutomationConfigDto {
  @Expose()
  @IsBoolean()
  @IsNotEmpty()
  enabled: boolean

  @Expose()
  @IsNumber()
  @Min(1)
  @IsOptional()
  daysBefore?: number

  @Expose()
  @IsNumber()
  @Min(1)
  @IsOptional()
  daysAfter?: number

  @Expose()
  @ValidateNested()
  @Type(() => EmailTemplateDto)
  template: EmailTemplateDto
}

export class UpdateEmailAutomationDto {
  @Expose()
  @IsEnum(EmailAutomationType)
  @IsNotEmpty()
  type: EmailAutomationType

  @Expose()
  @ValidateNested()
  @Type(() => EmailAutomationConfigDto)
  config: EmailAutomationConfigDto
}

export class GetEmailAutomationDto {
  @Expose()
  @IsString()
  id: string

  @Expose()
  @IsEnum(EmailAutomationType)
  type: EmailAutomationType

  @Expose()
  @IsBoolean()
  enabled: boolean

  @Expose()
  @IsNumber()
  @IsOptional()
  daysBefore?: number

  @Expose()
  @IsNumber()
  @IsOptional()
  daysAfter?: number

  @Expose()
  @IsString()
  subject: string

  @Expose()
  @IsString()
  body: string
}

export class EmailTestDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  invoiceId: string

  @Expose()
  @IsEnum(EmailAutomationType)
  @IsNotEmpty()
  type: EmailAutomationType
}
