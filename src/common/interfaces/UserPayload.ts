import { ERole } from '../enums/ERole'

export class UserPayload {
  id: string

  name: string

  email: string

  role: ERole
}
