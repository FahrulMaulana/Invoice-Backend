import { Expose } from 'class-transformer'
import { IsString } from 'class-validator'

export class companyPostDto {
  @Expose()
  @IsString()
  name: string
  @Expose()
  @IsString()
  email: string
  @Expose()
  @IsString()
  address: string
}

export class companyGetDto {
  @Expose()
  @IsString()
  id: string
  @Expose()
  @IsString()
  name: string
  @Expose()
  @IsString()
  email: string
  @Expose()
  @IsString()
  address: string
}
