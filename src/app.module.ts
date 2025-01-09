import { Module } from '@nestjs/common'
import { HelloController } from './controllers/hello.controller'
import { HelloService } from './services/hello.service'
import { PrismaModule } from './services/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [HelloController],
  providers: [HelloService],
})
export class AppModule {}
