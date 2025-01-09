import { NestFactory, Reflector } from '@nestjs/core'
import { AppModule } from './app.module'
import { SwaggerApiDocs } from './docs/swagger-api.docs'
import { env } from 'process'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'path'
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common'
import { ErrorsInterceptor } from './errors.interceptors'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // Static Assets
  app.useStaticAssets(join(__dirname, '..', 'public'))
  app.setViewEngine('html')

  /* Global Interceptor */
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector), { excludeExtraneousValues: true }))
  app.useGlobalInterceptors(new ErrorsInterceptor())

  /* Global Validation */
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))

  /* Swagger */
  if (env.APP_ENV !== 'prod') {
    new SwaggerApiDocs(app).init()
  }

  await app.listen(3000)

  console.log(`Application is running on: http://localhost:3000`)
}
bootstrap()
