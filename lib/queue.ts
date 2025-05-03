type Task = () => Promise<void>;

class Queue {
  private tasks: Map<string, Task> = new Map();
  private runningTasks: Set<string> = new Set();
  private maxConcurrent: number;

  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  enqueue(taskId: string, task: Task): void {
    this.tasks.set(taskId, task);
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.runningTasks.size >= this.maxConcurrent || this.tasks.size === 0) {
      return;
    }

    // Get the next task
    const [taskId, task] = [...this.tasks.entries()][0];
    this.tasks.delete(taskId);
    this.runningTasks.add(taskId);

    try {
      await task();
    } catch (error) {
      console.error(`Error executing task ${taskId}:`, error);
    } finally {
      this.runningTasks.delete(taskId);
      this.processNext();
    }
  }

  isProcessing(taskId: string): boolean {
    return this.runningTasks.has(taskId);
  }

  isQueued(taskId: string): boolean {
    return this.tasks.has(taskId);
  }
}

// Singleton instance
export const queue = new Queue(); 