import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import { UserFactory } from 'Database/factories'
import { DateTime } from 'luxon'

test.group('Group', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })

  test('it should create a group', async ({ client }) => {
    const user = await UserFactory.create()
    const groupPayload = {
      id: 1,
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }
    const response = await client.post('/groups').json(groupPayload).loginAs(user)
    response.assertStatus(201)
    response.assertBodyContains({
      group: {
        name: groupPayload.name,
        description: groupPayload.description,
        id: groupPayload.id,
        schedule: groupPayload.schedule,
        location: groupPayload.location,
        chronic: groupPayload.chronic,
        master: groupPayload.master,
        players: [groupPayload.master],
      },
      ...response.body(),
    })
  })

  test('it should return 422 when required data is not provided', async ({ client }) => {
    const user = await UserFactory.create()
    const response = await client.post('/groups').loginAs(user).json({})
    response.assertStatus(422)
    response.assertBodyContains({
      code: 'BAD_REQUEST',
      status: 422,
    })
  })
})
