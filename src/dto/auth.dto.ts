import { Expose, Type } from 'class-transformer'
import { IsArray, IsEnum, IsNotEmpty, IsString, Length } from 'class-validator'
import { ERole } from 'src/common/enums/ERole'

export class LoginDTO {
  @Expose()
  @IsString()
  @IsNotEmpty()
  email: string

  @Expose()
  @IsString()
  @Length(3, 20)
  @IsNotEmpty()
  password: string
}

export class Userpayload {
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
  @IsEnum([ERole])
  role: ERole
}

export class LoginResponse {
  @Expose()
  @IsString()
  token: string

  @Type(() => Userpayload)
  @Expose()
  data: Userpayload
}

export class LoginResponseDTO {
  @Type(() => LoginResponse)
  @Expose()
  data: LoginResponse[]
}

export class tokenDTO {
  @Expose()
  @IsEnum(ERole)
  role: ERole
  @Expose()
  @IsString()
  token: string
}

export class responLogin {
  @Expose()
  @IsString()
  id: string
  @Expose()
  @IsString()
  name: string
  @Expose()
  @IsArray()
  token: tokenDTO[]
}
