import { Expose } from 'class-transformer'
import { IsEmail, IsNotEmpty, IsNumber, IsString, Length } from 'class-validator'

export class ClientPostDto {
  @Expose()
  @IsString()
  @Length(3, 50)
  @IsNotEmpty()
  legalName: string

  @Expose()
  @IsEmail()
  @IsNotEmpty()
  email: string

  @Expose()
  @IsString()
  @Length(6, 400)
  @IsNotEmpty()
  address: string

  @Expose()
  @IsNumber()
  @IsNotEmpty()
  netTerms: number
}

export class ClienGetDto {
  @Expose()
  @IsString()
  id: string

  @Expose()
  @IsString()
  @Length(3, 50)
  @IsNotEmpty()
  legalName: string

  @Expose()
  @IsEmail()
  @IsNotEmpty()
  email: string

  @Expose()
  @IsString()
  @Length(6, 400)
  @IsNotEmpty()
  address: string

  @Expose()
  @IsNumber()
  @IsNotEmpty()
  netTerms: number
}
