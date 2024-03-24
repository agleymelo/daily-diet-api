import { beforeEach } from 'node:test'
import { execSync } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'

import { app } from '../../src/app'

describe('User routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('yarn knex migrate:rollback --all')
    execSync('yarn knex migrate:latest')
  })

  it('should be able to create a new user', async () => {
    const response = await request(app.server).post('/users').send({ name: 'John Doe', email: 'john@doe.com' }).expect(201)

    const cookie = response.get('Set-Cookie')

    expect(cookie).toEqual(expect.arrayContaining([expect.stringContaining('sessionId')]))
  })
})
