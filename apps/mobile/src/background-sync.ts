import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import { syncQueue } from "./queue";
const TASK = "agrosentinel-sync";
TaskManager.defineTask(TASK, async () => {
  try {
    await syncQueue();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
export async function registerBackgroundSync() {
  if (
    (await BackgroundTask.getStatusAsync()) ===
    BackgroundTask.BackgroundTaskStatus.Restricted
  )
    return false;
  if (!(await TaskManager.isTaskRegisteredAsync(TASK)))
    await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 15 });
  return true;
}
