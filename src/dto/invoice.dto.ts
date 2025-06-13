import { Expose, Type } from 'class-transformer'
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator'
import { EStatus } from 'src/common/enums/EStatus'
import { productIdDto } from './product.dto'

export class invoicePostDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  companyId: string

  @Expose()
  @IsString()
  @IsNotEmpty()
  clientId: string

  @Expose()
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string

  @Expose()
  @IsString()
  @IsNotEmpty()
  userId: string

  @Expose()
  @IsArray()
  @Type(() => productIdDto)
  products: productIdDto[]
}

export class invoiceGetDto {
  @Expose()
  @IsString()
  id: string

  @Expose()
  @IsString()
  invoiceNumber: string

  @Expose()
  @IsString()
  date: string

  @Expose()
  @IsString()
  dueDate: string

  @Expose()
  @IsString()
  status: string

  @Expose()
  @IsString()
  companyId: string

  @Expose()
  @IsString()
  clientId: string

  @Expose()
  @IsString()
  paymentMethodId: string

  @Expose()
  @IsString()
  userId: string

  @Expose()
  @IsNumber()
  subtotal: number
}

export class invoiceUpdateDto {
  @Expose()
  @IsEnum(EStatus)
  status: EStatus
}
