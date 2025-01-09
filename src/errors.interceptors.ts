import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common'
import { IncomingWebhook } from '@slack/webhook'
import { Observable, throwError } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { env } from 'process'

@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((err: TypeError) => {
        const slack = new IncomingWebhook('https://hooks.slack.com/services/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')

        if (env.APP_ENV != 'local' && !['HttpException', 'BadRequestException'].includes(err.name)) {
          slack.send({
            channel: '#pmb-smk',
            username: `Apps Error Log - ${env.APP_ENV}`,
            icon_emoji: 'boom',
            text: `>*Message*\n>${err.message}\n>*Exception*\n>\`\`\`${err.stack}\`\`\``,
          })
          return throwError(() => new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR))
        }
        return throwError(err)
      })
    )
  }
}
