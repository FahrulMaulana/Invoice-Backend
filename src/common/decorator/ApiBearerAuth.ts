import { applyDecorators, UseGuards } from '@nestjs/common'
import { ApiBearerAuth as ApiBearerAuthSwagger, ApiOperation } from '@nestjs/swagger'
import { AuthGuard } from '../../guards/AuthGuard'
import { ERole } from '../enums/ERole'

export function ApiBearerAuth(roles: ERole[] = []) {
  const decorators = [ApiBearerAuthSwagger(), UseGuards(new AuthGuard(roles))]
  decorators.push(ApiOperation({ summary: roles?.join(', ') || 'ALL' }) as any)
  return applyDecorators(...decorators)
}
