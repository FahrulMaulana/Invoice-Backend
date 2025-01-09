import * as jwt from 'jsonwebtoken'
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Observable } from 'rxjs'
import { Request } from 'express'
import { ERole } from '../common/enums/ERole'
import { env } from 'process'
import { UserPayload } from '../common/interfaces/UserPayload'

@Injectable()
export class AuthGuard implements CanActivate {
  roles: ERole[] | undefined
  constructor(roles?: ERole[]) {
    this.roles = roles
  }
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const { req } = context.switchToHttp().getNext()
    const request: Request = req || context.switchToHttp().getRequest()
    const token = (request.headers?.authorization || ' ').split(' ')[1] || request.cookies?.token
    if (!token) {
      throw new UnauthorizedException()
    }
    try {
      const decoded = jwt.verify(token, env.APP_KEY || '') as UserPayload
      if (this.roles && !this.roles.includes(decoded.role)) {
        throw new UnauthorizedException()
      }
      // add user request parameters
      request['user'] = decoded
      return true
    } catch (e) {
      throw new UnauthorizedException()
    }
  }
}
