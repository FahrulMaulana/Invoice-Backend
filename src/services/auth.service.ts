import { BadRequestException, HttpException, Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { classToPlain, instanceToPlain, plainToInstance } from 'class-transformer'
import * as jwt from 'jsonwebtoken'
import { env } from 'process'
import { ERole } from 'src/common/enums/ERole'
import { UserPayload } from 'src/common/interfaces/UserPayload'
import { LoginDTO, responLogin, tokenDTO } from 'src/dto/auth.dto'
import { PrismaService } from './prisma.service'

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async Login(body: LoginDTO) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: body.email,
      },
    })

    if (!user) {
      throw new BadRequestException('id atau password salah')
    }

    const isPasswordValid = await bcrypt.compare(body.password, user.password)
    if (!isPasswordValid) {
      throw new BadRequestException('id atau password salah')
    }

    const data = await (async () => {
      const payload = new UserPayload()
      payload.id = user?.id as string
      payload.name = user?.name as string
      payload.email = user?.email as string
      payload.role = user?.role as ERole

      const payloadObject = classToPlain(payload)

      try {
        // Generate JWT token
        const token = jwt.sign(instanceToPlain(payloadObject, { excludeExtraneousValues: true }), env.APP_KEY as string, {
          expiresIn: '7D',
        })

        return plainToInstance(tokenDTO, {
          role: user?.role as ERole,
          token,
        })
      } catch (error) {
        throw new HttpException('Internal Server Error', 500)
      }
    })()

    const loginResponseDTO = plainToInstance(responLogin, {
      id: user.id,
      name: user.name,
      token: data,
    })

    return loginResponseDTO
  }
}
