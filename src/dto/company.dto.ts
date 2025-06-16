import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsOptional, IsString } from 'class-validator'

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
  @Expose()
  @IsOptional()
  @ApiProperty({ type: 'string', format: 'binary', required: false })
  @IsOptional()
  file: string
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
  @Expose()
  @IsOptional()
  @IsString()
  file: string
}
