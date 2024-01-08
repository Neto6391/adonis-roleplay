import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import Group from 'App/Models/Group'
import { GroupFactory, UserFactory } from 'Database/factories'

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

    test('it should update a group', async ({ client }) => {
        const master = await UserFactory.create()
        const group = await GroupFactory.merge({ master: master.id }).create()
        const payload = {
            name: 'test',
            description: 'test',
            schedule: 'test',
            location: 'test',
            chronic: 'test',
        }
        const response = await client.patch(`/groups/${group.id}`).loginAs(master).json(payload)
        response.assertStatus(200)
        const responseUpdatedGroup = { group: { ...payload, ...response.body().group } }

        response.assertBodyContains(responseUpdatedGroup)
    })

    test('it should return 404 when providing an unexisting group for update', async ({
        client,
    }) => {
        const user = await UserFactory.create()
        const response = await client.patch(`/groups/123`).loginAs(user).json({})
        response.assertStatus(404)
        response.assertBodyContains({
            code: 'BAD_REQUEST',
            status: 404,
        })
    })

    test('it should remove user from group', async ({ assert, client }) => {
        const user = await UserFactory.create()
        const master = await UserFactory.create()
        const group = await GroupFactory.merge({ master: master.id }).create()

        const responseGroupsRequests = await client
            .post(`/groups/${group.id}/requests`)
            .loginAs(user)
            .json({})

        await client
            .post(
                `/groups/${group.id}/requests/${
                    responseGroupsRequests.body().groupRequest.id
                }/accept`
            )
            .loginAs(master)

        const response = await client
            .delete(`/groups/${group.id}/players/${user.id}`)
            .loginAs(master)
            .json({})
        response.assertStatus(200)
        await group.load('players')
        assert.isEmpty(group.players)
    })

    test('it should not remove the master of the group', async ({ assert, client }) => {
        const user = await UserFactory.create()
        const groupPayload = {
            name: 'test',
            description: 'test',
            schedule: 'test',
            location: 'test',
            chronic: 'test',
            master: user.id,
        }
        const responseGroupCreated = await client.post('/groups').json(groupPayload).loginAs(user)
        const group = responseGroupCreated.body().group
        const response = await client
            .delete(`/groups/${group.id}/players/${user.id}`)
            .loginAs(user)
            .json({})
        response.assertStatus(400)
        const groupModel = await Group.findOrFail(group.id)
        await groupModel.load('players')
        assert.isNotEmpty(groupModel.players)
    })

    test('it should remove the group', async ({ assert, client }) => {
        const user = await UserFactory.create()
        const groupPayload = {
            name: 'test',
            description: 'test',
            schedule: 'test',
            location: 'test',
            chronic: 'test',
            master: user.id,
        }
        const responseGroupCreated = await client.post('/groups').json(groupPayload).loginAs(user)
        const group = responseGroupCreated.body().group
        const response = await client.delete(`/groups/${group.id}`).loginAs(user)
        response.assertStatus(200)

        const emptyGroup = await Database.query().from('groups').where('id', group.id)
        assert.isEmpty(emptyGroup)

        const players = await Database.query().from('groups_users')
        assert.isEmpty(players)
    })

    test('it should return 404 when providing an unexisting group for deletion', async ({
        client,
    }) => {
        const user = await UserFactory.create()
        const response = await client.delete(`/groups/123`).loginAs(user)
        response.assertStatus(404)
        response.assertBodyContains({
            code: 'BAD_REQUEST',
            status: 404,
        })
    })

    test('it should return all groups when no query is provided to list groups', async ({
        assert,
        client,
    }) => {
        const user = await UserFactory.create()
        const groupPayload = {
            name: 'test',
            description: 'test',
            schedule: 'test',
            location: 'test',
            chronic: 'test',
            master: user.id,
        }
        const responseGroupCreated = await client.post('/groups').json(groupPayload).loginAs(user)
        const groups = responseGroupCreated.body().group
        const responsListGroups = await client.get('/groups').loginAs(user).json({})
        responsListGroups.assertStatus(200)

        responsListGroups.assertBodyContains({
            groups: {
                data: [{ ...groups, ...responsListGroups.body().groups.data[0] }],
            },
        })
        assert.isNotEmpty(groups.players)
    })

    test('it should return no groups by user id', async ({ assert, client }) => {
        const user = await UserFactory.create()
        const groupPayload = {
            name: 'test',
            description: 'test',
            schedule: 'test',
            location: 'test',
            chronic: 'test',
            master: user.id,
        }
        await client.post('/groups').json(groupPayload).loginAs(user)
        const responsListGroups = await client.get('/groups?user=123').loginAs(user).json({})
        responsListGroups.assertStatus(200)
        assert.isEmpty(responsListGroups.body().groups.data)
    })

    test('it should return all groups by user id and name', async ({ assert, client }) => {
        const user = await UserFactory.create()
        const groupPayload = {
            name: 'test',
            description: 'test',
            schedule: 'test',
            location: 'test',
            chronic: 'test',
            master: user.id,
        }
        await client.post('/groups').json(groupPayload).loginAs(user)
        await client
            .post('/groups')
            .json({ ...groupPayload, name: '123', description: '123' })
            .loginAs(user)

        const responsListGroups = await client
            .get(`/groups?user=${user.id}&text=es`)
            .loginAs(user)
            .json({})
        responsListGroups.assertStatus(200)

        assert.lengthOf(responsListGroups.body().groups.data, 1)
    })

    test('it should return all groups by user id and description', async ({ assert, client }) => {
        const user = await UserFactory.create()
        const groupPayload = {
            name: '123',
            description: 'test',
            schedule: 'test',
            location: 'test',
            chronic: 'test',
            master: user.id,
        }
        await client.post('/groups').json(groupPayload).loginAs(user)
        await client
            .post('/groups')
            .json({ ...groupPayload, name: '123', description: '123' })
            .loginAs(user)

        const responsListGroups = await client
            .get(`/groups?user=${user.id}&text=es`)
            .loginAs(user)
            .json({})
        responsListGroups.assertStatus(200)

        assert.lengthOf(responsListGroups.body().groups.data, 1)
    })

    test('it should return all groups by name', async ({ assert, client }) => {
        const user = await UserFactory.create()
        const groupPayload = {
            name: 'test',
            description: '123',
            schedule: 'test',
            location: 'test',
            chronic: 'test',
            master: user.id,
        }
        await client.post('/groups').json(groupPayload).loginAs(user)
        await client
            .post('/groups')
            .json({ ...groupPayload, name: '123', description: '123' })
            .loginAs(user)

        const responsListGroups = await client.get(`/groups?text=es`).loginAs(user).json({})
        responsListGroups.assertStatus(200)

        assert.lengthOf(responsListGroups.body().groups.data, 1)
    })

    test('it should return all groups by description', async ({ assert, client }) => {
        const user = await UserFactory.create()
        const groupPayload = {
            name: '123',
            description: 'test',
            schedule: 'test',
            location: 'test',
            chronic: 'test',
            master: user.id,
        }
        await client.post('/groups').json(groupPayload).loginAs(user)
        await client
            .post('/groups')
            .json({ ...groupPayload, name: '123', description: '123' })
            .loginAs(user)

        const responsListGroups = await client.get(`/groups?text=es`).loginAs(user).json({})
        responsListGroups.assertStatus(200)

        assert.lengthOf(responsListGroups.body().groups.data, 1)
    })
})
