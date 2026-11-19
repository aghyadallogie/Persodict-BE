import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'http';
import request from 'supertest';
import { PrismaService } from '../../prisma/prisma.service';
import { UserModule } from './user.module';

/**
 * Regression test for a data leak: `GET /users/:id` was public and returned the whole user
 * record (password hash included), and `POST /users` created users with an unhashed password.
 * The user module must not expose any HTTP route.
 */
describe('UserModule', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer() as Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [UserModule] })
      // Never touch a real database from a unit test.
      .overrideProvider(PrismaService)
      .useValue({ user: { findUnique: jest.fn(), create: jest.fn() } })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('does not serve GET /users/:id', async () => {
    await request(server()).get('/users/64b000000000000000000001').expect(404);
  });

  it('does not serve POST /users', async () => {
    await request(server())
      .post('/users')
      .send({ email: 'a@b.co', password: 'plain-text' })
      .expect(404);
  });

  it('does not serve GET /users', async () => {
    await request(server()).get('/users').expect(404);
  });

  it('still provides UserService to the modules that import it', () => {
    const imports = Reflect.getMetadata('exports', UserModule) as unknown[];
    expect(imports.map((e) => (e as { name: string }).name)).toContain(
      'UserService',
    );
  });
});
