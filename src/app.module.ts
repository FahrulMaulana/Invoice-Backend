import { Module } from '@nestjs/common'
import { AuthController } from './controllers/auth.controller'
import { ClientController } from './controllers/client.controller'
import { CompanyController } from './controllers/company.controller'
import { HelloController } from './controllers/hello.controller'
import { InvoiceController } from './controllers/invoice.controller'
import { PaymentController } from './controllers/payment.controller'
import { ProductController } from './controllers/product.controller'
import { AuthService } from './services/auth.service'
import { ClientService } from './services/clients.service'
import { CompanyService } from './services/company.service'
import { HelloService } from './services/hello.service'
import { InvoiceService } from './services/iinvoice.service'
import { PaymentService } from './services/payment.service'
import { PrismaModule } from './services/prisma.module'
import { ProductService } from './services/product.service'

@Module({
  imports: [PrismaModule],
  controllers: [
    HelloController,
    AuthController,
    ClientController,
    CompanyController,
    ProductController,
    PaymentController,
    InvoiceController,
  ],
  providers: [HelloService, AuthService, ClientService, CompanyService, ProductService, PaymentService, InvoiceService],
})
export class AppModule {}
