import { Expose } from 'class-transformer'
import { IsNotEmpty, IsString, Length } from 'class-validator'

export class paymentMethodPostDto {
  @Expose()
  @IsString()
  @Length(3, 50)
  @IsNotEmpty()
  methodName: string

  @Expose()
  @IsString()
  @IsNotEmpty()
  info: string
}

export class paymentMethodGetDto {
  @Expose()
  @IsString()
  id: string

  @Expose()
  @IsString()
  @Length(3, 50)
  @IsNotEmpty()
  methodName: string

  @Expose()
  @IsString()
  @IsNotEmpty()
  info: string
}
