import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import { GroupFactory, UserFactory } from 'Database/factories'

test.group('Group Request', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })

  test('it should create a group request', async ({ client }) => {
    const user = await UserFactory.create()
    const group = await GroupFactory.merge({ master: user.id }).create()
    const response = await client.post(`/groups/${group.id}/requests`).loginAs(user).json({})

    response.assertStatus(201)
    response.assertBodyContains({
      groupRequest: {
        userId: user.id,
        groupId: group.id,
        status: 'PENDING',
      },
    })
  })

  test('it should return 409 when group request already exists', async ({ client }) => {
    const user = await UserFactory.create()
    const group = await GroupFactory.merge({ master: user.id }).create()
    await client.post(`/groups/${group.id}/requests`).loginAs(user).json({})

    const response = await client.post(`/groups/${group.id}/requests`).loginAs(user).json({})
    response.assertStatus(409)
    response.assertBodyContains({
      code: 'BAD_REQUEST',
      status: 409,
    })
  })

  test('it should return 422 when user is already in the group', async ({ client }) => {
    const user = await UserFactory.create()
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }

    //Master add in group by token id
    const responseGroup = await client.post('/groups').json(groupPayload).loginAs(user)

    const responseGroupsRequests = await client
      .post(`/groups/${responseGroup.body().group.id}/requests`)
      .loginAs(user)
      .json({})

    responseGroupsRequests.assertStatus(422)
    responseGroupsRequests.assertBodyContains({
      code: 'BAD_REQUEST',
      status: 422,
    })
  })

  test('it should list group requests by master', async ({ client }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const responseGroupsRequests = await client
      .post(`/groups/${group.id}/requests`)
      .loginAs(user)
      .json({})
    const groupRequest = responseGroupsRequests.body().groupRequest

    const responseListGroupsRequests = await client.get(
      `/groups/${group.id}/requests?master=${master.id}`
    )

    responseListGroupsRequests.assertStatus(200)
    responseListGroupsRequests.assertBodyContains({
      groupRequests: [
        {
          id: groupRequest.id,
          userId: groupRequest.userId,
          groupId: groupRequest.groupId,
          status: groupRequest.status,
          group: {
            name: group.name,
            master: master.id,
          },
          user: {
            username: user.username,
          },
        },
      ],
    })
  })

  test('it should return an empty list when master has no group requests', async ({ client }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    await client.post(`/groups/${group.id}/requests`).loginAs(user).json({})

    const response = await client.get(`/groups/${group.id}/requests?master=${user.id}`)
    response.assertStatus(200)
    response.assertBodyContains({
      groupRequests: [],
    })
  })

  test('it should return 422 when master is not provided', async ({ client }) => {
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const response = await client.get(`/groups/${group.id}/requests`)
    response.assertStatus(422)

    response.assertBodyContains({
      code: 'BAD_REQUEST',
      status: 422,
    })
  })

  test('it should accept a group request', async ({ assert, client }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const responseGroupsRequests = await client
      .post(`/groups/${group.id}/requests`)
      .loginAs(user)
      .json({})

    const response = await client.post(
      `/groups/${group.id}/requests/${responseGroupsRequests.body().groupRequest.id}/accept`
    )
    response.assertStatus(200)
    response.assertBodyContains({
      groupRequest: {
        userId: user.id,
        groupId: group.id,
        status: 'ACCEPTED',
      },
    })

    await group.load('players')
    assert.isNotEmpty(group.players)
    assert.equal(group.players.length, 1)
    assert.equal(group.players[0].id, user.id)
  })

  test('it should return 404 when providing an unexisting group', async ({ client }) => {
    const user = await UserFactory.create()

    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const responseGroupsRequests = await client
      .post(`/groups/${group.id}/requests`)
      .loginAs(user)
      .json({})

    const response = await client.post(
      `/groups/123/requests/${responseGroupsRequests.body().groupRequest.id}/accept`
    )
    response.assertStatus(404)
    response.assertBodyContains({
      code: 'BAD_REQUEST',
      status: 404,
    })
  })

  test('it should return 404 when providing an unexisting group request', async ({ client }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    await client.post(`/groups/${group.id}/requests`).loginAs(user).json({})

    const response = await client.post(`/groups/${group.id}/requests/123/accept`)
    response.assertStatus(404)
    response.assertBodyContains({
      code: 'BAD_REQUEST',
      status: 404,
    })
  })
})
