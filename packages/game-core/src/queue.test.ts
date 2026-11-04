import { expect, it } from 'vitest';
import { KeyedQueue } from './index';
it('serializes the same room and continues after rejected commands', async () => {
  const queue = new KeyedQueue();
  const order: number[] = [];
  const tasks = [
    queue.run('room', async () => {
      await Promise.resolve();
      order.push(1);
    }),
    queue.run('room', () => {
      order.push(2);
      throw new Error('bad action');
    }),
    queue.run('room', () => {
      order.push(3);
    }),
  ];
  await Promise.allSettled(tasks);
  expect(order).toEqual([1, 2, 3]);
});
