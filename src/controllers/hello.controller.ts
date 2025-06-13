import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { HelloService } from '../services/hello.service'
import { PrismaService } from '../services/prisma.service'

@ApiTags('Hello')
@Controller('/api/hello')
export class HelloController {
  constructor(private readonly appService: HelloService, private prisma: PrismaService) {}

  @Get('/get')
  async get() {
    const data = 'Hello World'
    return data
  }
}
