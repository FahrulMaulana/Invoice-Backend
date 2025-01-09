import { Exclude, Expose } from 'class-transformer'

export class HelloData {
  @Expose()
  id: string

  @Expose()
  role: string
}
