const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

class Queue {
  constructor() {
    this.tasks = [];
  }

  addTask(fn) {
    const task = {
      fn,
    };

    const promise = new Promise((resolve, reject) => {
      task.resolve = resolve;
      task.reject = reject;
    });

    this.tasks.push(task);

    return promise;
  }

  async run() {
    const task = this.tasks.shift();

    if (!task) {
      await sleep(50);

      return this.run();
    }

    try {
      task.resolve(await task.fn());
    } catch (err) {
      task.reject(err);
    } finally {
      this.run();
    }
  }
}

module.exports = Queue;
