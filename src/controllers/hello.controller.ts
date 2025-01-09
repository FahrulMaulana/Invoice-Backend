import { Controller, Get } from '@nestjs/common'
import { HelloService } from '../services/hello.service'
import { ApiTags } from '@nestjs/swagger'
import { PrismaService } from '../services/prisma.service'
import { HelloData } from '../dto/hello.dto'
import { plainToInstance } from 'class-transformer'

@ApiTags('Hello')
@Controller('/api/hello')
export class HelloController {
  constructor(private readonly appService: HelloService, private prisma: PrismaService) {}

  @Get('/get')
  async get() {
    const roles = await this.prisma.mst_role.findMany()

    return plainToInstance(HelloData, roles)
  }
}
