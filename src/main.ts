import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common'
import { NestFactory, Reflector } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'path'
import { env } from 'process'

// Add crypto polyfill for Node.js versions
import * as nodeCrypto from 'crypto'
// Polyfill for crypto.randomUUID used by @nestjs/schedule
// Use type assertion to avoid ESLint warnings
if (!global.crypto || !global.crypto.randomUUID) {
  ;(global as any).crypto = {
    ...(global as any).crypto,
    randomUUID: () => {
      return nodeCrypto.randomUUID ? nodeCrypto.randomUUID() : nodeCrypto.randomBytes(16).toString('hex')
    },
  }
}

import { AppModule } from './app.module'
import { SwaggerApiDocs } from './docs/swagger-api.docs'
import { ErrorsInterceptor } from './errors.interceptors'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true, // Enable built-in body parser
  })

  // Static Assets
  app.useStaticAssets(join(__dirname, '..', 'public'))
  app.setViewEngine('html')

  app.enableCors()
  /* Global Interceptor */
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector), { excludeExtraneousValues: true }))
  app.useGlobalInterceptors(new ErrorsInterceptor())

  /* Global Validation */
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, transformOptions: { enableImplicitConversion: true } }))

  /* Swagger */
  if (env.APP_ENV !== 'prod') {
    new SwaggerApiDocs(app).init()
  }

  await app.listen(3001)

  console.log(`Application is running on: http://localhost:3001`)
}
bootstrap()
