import { ApiProperty } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator'

class clientIdDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  id: string
}

export class invoiceGeneratorPostDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  companyId: string

  @Expose()
  @IsString()
  @IsNotEmpty()
  productId: string

  @Expose()
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string

  @Expose()
  @IsString()
  @IsNotEmpty()
  date: string

  @Expose()
  @IsString()
  @IsNotEmpty()
  due_date: string

  @Expose()
  @IsArray()
  @Type(() => clientIdDto)
  client: clientIdDto[]
}

export class invoiceGenerUploadDto {
  @Expose()
  @IsNotEmpty()
  @ApiProperty({ type: 'string', format: 'binary', required: false })
  @IsOptional()
  file: string
}
