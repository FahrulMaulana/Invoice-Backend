import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { AuthController } from './controllers/auth.controller'
import { ClientController } from './controllers/client.controller'
import { CompanyController } from './controllers/company.controller'
import { EmailAutomationController } from './controllers/email-automation.controller'
import { HelloController } from './controllers/hello.controller'
import { InvoiceController } from './controllers/invoice.controller'
import { PaymentController } from './controllers/payment.controller'
import { ProductController } from './controllers/product.controller'
import { AuthService } from './services/auth.service'
import { ClientService } from './services/clients.service'
import { CompanyService } from './services/company.service'
import { EmailAutomationService } from './services/email-automation.service'
import { EmailSchedulerService } from './services/email-scheduler.service'
import { HelloService } from './services/hello.service'
import { InvoiceService } from './services/iinvoice.service'
import { PaymentService } from './services/payment.service'
import { PrismaModule } from './services/prisma.module'
import { ProductService } from './services/product.service'

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [
    HelloController,
    AuthController,
    ClientController,
    CompanyController,
    ProductController,
    PaymentController,
    InvoiceController,
    EmailAutomationController,
  ],
  providers: [
    HelloService,
    AuthService,
    ClientService,
    CompanyService,
    ProductService,
    PaymentService,
    InvoiceService,
    EmailAutomationService,
    EmailSchedulerService,
  ],
})
export class AppModule {}
