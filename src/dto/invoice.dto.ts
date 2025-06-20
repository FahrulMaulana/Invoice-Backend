import { Expose, Type } from 'class-transformer'
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'
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

export class invoiceFilterDto {
  @Expose()
  @IsOptional()
  @IsEnum(EStatus)
  status?: EStatus

  @Expose()
  @IsOptional()
  @IsString()
  month?: string

  @Expose()
  @IsOptional()
  @IsString()
  paymentMethodId?: string

  @Expose()
  @IsOptional()
  @IsString()
  companyId?: string

  @Expose()
  @IsOptional()
  @IsString()
  clientId?: string

  @Expose()
  @IsOptional()
  @IsString()
  productId?: string
}

export class invoiceActionDto {
  @Expose()
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  invoiceIds: string[]
}

export class invoiceEmailDto {
  @Expose()
  @IsNotEmpty()
  @IsString()
  invoiceId: string

  @Expose()
  @IsOptional()
  @IsString()
  message?: string
}

class product {
  @Expose()
  @IsString()
  id: string

  @Expose()
  @IsString()
  productId: string

  @Expose()
  @IsNumber()
  quantity: number

  @Expose()
  @IsNumber()
  customerPrice: number
}
export class invoicePutDto {
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
  @IsOptional()
  @IsEnum(EStatus)
  status?: EStatus

  @Expose()
  @IsString()
  date: string

  @Expose()
  @IsString()
  dueDate: string

  @Expose()
  @IsArray()
  @Type(() => product)
  products: product[]
}
