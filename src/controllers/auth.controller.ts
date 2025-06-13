import { Body, Controller, Get, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { plainToInstance } from 'class-transformer'
import { ApiBearerAuth } from 'src/common/decorator/ApiBearerAuth'
import { User } from 'src/common/decorator/User'
import { ERole } from 'src/common/enums/ERole'
import { LoginDTO, Userpayload } from 'src/dto/auth.dto'
import { AuthService } from 'src/services/auth.service'

@ApiTags('Auth')
@Controller('api')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/Login')
  async post(@Body() body: LoginDTO) {
    const data = await this.authService.Login(body)
    return data
  }

  @ApiBearerAuth([ERole.SU])
  @Get('/user/info')
  async update(@User() user: Userpayload) {
    const data = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }

    return plainToInstance(Userpayload, data)
  }
}
