import Hash from '@ioc:Adonis/Core/Hash'
import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import { UserFactory } from 'Database/factories'

test.group('User', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })

  test('it should create an user', async ({ client, assert }) => {
    const userPayload = {
      email: 'test@test.com',
      username: 'test',
      password: 'test',
      avatar: 'http://images.com/image/1',
    }
    const response = await client.post('/users').json(userPayload)

    const { password, avatar, ...expected } = userPayload
    response.assertStatus(201)
    response.assertBodyContains({ user: expected })

    assert.notExists(response.body().user.password, 'Password defined')
  })

  test('it should return 409 when email is already in use', async ({ client }) => {
    const { email } = await UserFactory.create()
    const userPayload = {
      email,
      username: 'test',
      password: 'test',
      avatar: 'http://images.com/image/1',
    }
    const { avatar, ...expected } = userPayload

    const response = await client.post('/users').json(expected)
    response.assertStatus(409)

    response.assertBodyContains({
      message: 'email already in use',
      code: 'BAD_REQUEST',
      status: 409,
    })
  })

  test('it should return 409 when username is already in use', async ({ client, assert }) => {
    const { username } = await UserFactory.create()
    const userPayload = {
      email: 'test@email.com',
      username,
      password: 'test',
      avatar: 'http://images.com/image/1',
    }
    const { avatar, ...expected } = userPayload

    const response = await client.post('/users').json(expected)
    response.assertStatus(409)

    response.assertBodyContains({
      message: 'username already in use',
      code: 'BAD_REQUEST',
      status: 409,
    })
  })

  test('it should return 422 when required data is not provided', async ({ client }) => {
    const response = await client.post('/users').json({})
    response.assertStatus(422)

    response.assertBodyContains({
      code: 'BAD_REQUEST',
      status: 422,
    })
  })

  test('it should return 422 when providing an invalid email', async ({ client }) => {
    const response = await client
      .post('/users')
      .json({ email: 'test', username: 'test', password: 'test' })
    response.assertStatus(422)

    response.assertBodyContains({
      code: 'BAD_REQUEST',
      status: 422,
    })
  })

  test('it should return 422 when providing an invalid password', async ({ client }) => {
    const response = await client
      .post('/users')
      .json({ email: 'test@gmail.com', username: 'test', password: 'tes' })
    response.assertStatus(422)

    response.assertBodyContains({
      code: 'BAD_REQUEST',
      status: 422,
    })
  })

  test('it should update an user', async ({ client }) => {
    const user = await UserFactory.create()
    const email = 'test@test.com'
    const avatar = 'http://github.com/Neto6391'

    const response = await client
      .put(`/users/${user.id}`)
      .json({ email, avatar, password: user.password })
      .loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      user: {
        email,
        avatar,
        id: user.id,
      },
    })
  })

  test('it should update the password of the user', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const password = 'test'

    const response = await client
      .put(`/users/${user.id}`)
      .json({ email: user.email, avatar: user.avatar, password })
      .loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      user: {
        id: user.id,
      },
    })
    await user.refresh()

    assert.isTrue(await Hash.verify(user.password, password))
  })

  test('it should return 422 when required data is not provided', async ({ client }) => {
    const user = await UserFactory.create()

    const response = await client.put(`/users/${user.id}`).json({}).loginAs(user)

    response.assertStatus(422)
    response.assertBodyContains({
      code: 'BAD_REQUEST',
      status: 422,
    })
  })

  test('it should return 422 when providing an invalid email', async ({ client }) => {
    const user = await UserFactory.create()

    const response = await client
      .put(`/users/${user.id}`)
      .json({ email: 'test@', password: user.password, avatar: user.password })
      .loginAs(user)

    response.assertStatus(422)
    response.assertBodyContains({
      code: 'BAD_REQUEST',
      status: 422,
    })
  })

  test('it should return 422 when providing an invalid password', async ({ client }) => {
    const user = await UserFactory.create()
    const response = await client
      .put(`/users/${user.id}`)

      .json({ email: user.email, password: 'tes', avatar: user.avatar })
      .loginAs(user)

    response.assertStatus(422)
    response.assertBodyContains({
      code: 'BAD_REQUEST',
      status: 422,
    })
  })

  test('it should return 422 when providing an invalid avatar', async ({ client }) => {
    const user = await UserFactory.create()
    const response = await client
      .put(`/users/${user.id}`)

      .json({ email: user.email, password: user.password, avatar: 'test' })
      .loginAs(user)

    response.assertStatus(422)
    response.assertBodyContains({
      code: 'BAD_REQUEST',
      status: 422,
    })
  })
})
