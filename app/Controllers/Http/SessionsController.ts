import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class SessionsController {
  public async store({ request, response }: HttpContextContract) {
    return response.created({})
  }
}
