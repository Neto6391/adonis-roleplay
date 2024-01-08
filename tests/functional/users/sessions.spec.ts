import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import { UserFactory } from 'Database/factories'

test.group('Session', (group) => {
    group.each.setup(async () => {
        await Database.beginGlobalTransaction()
        return () => Database.rollbackGlobalTransaction()
    })

    test('it should authenticate an user', async ({ client }) => {
        const plainPassword = 'test'
        const { id, email } = await UserFactory.merge({ password: plainPassword }).create()
        const response = await client.post('/sessions').json({ email, password: plainPassword })
        response.assertStatus(201)

        response.assertBodyContains({
            user: {
                id,
                email,
            },
        })
    })

    test('it should return an api token when session is created', async ({ client }) => {
        const plainPassword = 'test'
        const { id, email } = await UserFactory.merge({ password: plainPassword }).create()
        const response = await client.post('/sessions').json({ email, password: plainPassword })
        response.assertStatus(201)
        const token = response.body().token

        response.assertBodyContains({
            user: {
                id,
                email,
            },
            token,
        })
    })

    test('it should return 400 when credentials are not provided', async ({ client }) => {
        const response = await client.post('/sessions').json({})
        response.assertStatus(400)
        response.assertBodyContains({
            code: 'BAD_REQUEST',
            status: 400,
            message: 'invalid credentials',
        })
    })

    test('it should return 400 when credentials are invalid', async ({ client }) => {
        const { email } = await UserFactory.create()

        const response = await client.post('/sessions').json({ email, password: '1234567' })

        response.assertStatus(400)
        response.assertBodyContains({
            code: 'BAD_REQUEST',
            status: 400,
            message: 'invalid credentials',
        })
    })

    test('it should return 200 when user signs out', async ({ client }) => {
        const plainPassword = 'test'
        const user = await UserFactory.merge({ password: plainPassword }).create()
        const sessionResponse = await client
            .post('/sessions')
            .json({ email: user.email, password: plainPassword })
        const response = await client
            .delete('/sessions')
            .loginAs(user)
            .header('Authorization', `Bearer ${sessionResponse.body().token.token}`)
        response.assertStatus(200)
    })

    test('it should revoke token when user signs out', async ({ assert, client }) => {
        const plainPassword = 'test'
        const user = await UserFactory.merge({ password: plainPassword }).create()
        const sessionResponse = await client
            .post('/sessions')
            .json({ email: user.email, password: plainPassword })

        const response = await client
            .delete('/sessions')
            .header('Authorization', `Bearer ${sessionResponse.body().token.token}`)
        response.assertStatus(200)
        const token = await Database.query().select('*').from('api_tokens')

        assert.isEmpty(token)
    })
})
