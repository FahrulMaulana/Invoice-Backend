import { Expose } from 'class-transformer'
import { IsString } from 'class-validator'

export class responseDto {
  @Expose()
  @IsString()
  message: string
}
