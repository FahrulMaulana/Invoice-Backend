import { Expose } from 'class-transformer'
import { IsNotEmpty, IsNumber, IsString, Length } from 'class-validator'

export class productPostDto {
  @Expose()
  @IsString()
  @Length(3, 50)
  @IsNotEmpty()
  name: string

  @Expose()
  @IsString()
  @IsNotEmpty()
  description: string
}

export class productGetDto {
  @Expose()
  @IsString()
  id: string

  @Expose()
  @IsString()
  @Length(3, 50)
  @IsNotEmpty()
  name: string

  @Expose()
  @IsString()
  @IsNotEmpty()
  description: string
}

export class productIdDto {
  @Expose()
  @IsString()
  id: string

  @Expose()
  @IsNumber()
  quantity: number

  @Expose()
  @IsNumber()
  customerPrice: number
}
