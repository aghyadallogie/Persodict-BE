import { AppController } from './app.controller';

describe('AppController', () => {
  const controller = new AppController();

  it('answers the root URL', () => {
    expect(controller.getHello()).toBe('Hello World!');
  });

  it('reports that it is healthy', () => {
    expect(controller.health()).toEqual({ status: 'ok' });
  });
});
