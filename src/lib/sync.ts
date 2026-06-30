/**
 * Image synchronization service.
 * Handles async upload of images to GitHub in the background.
 */

import { getDb } from "./db";
import {
  ensureRepository,
  uploadImage,
  generateImagePath,
  getImageUrl,
  getGitHubUser,
} from "./github";
import { readFile } from "fs/promises";
import path from "path";

interface SyncJob {
  id: number;
  userId: number;
  imageId: number;
  localPath: string;
  provider: string;
  model: string;
  prompt: string;
  status: "pending" | "syncing" | "completed" | "failed";
  error?: string;
  githubPath?: string;
  githubUrl?: string;
}

// In-memory queue for sync jobs
const syncQueue: SyncJob[] = [];
let isProcessing = false;

/**
 * Add an image to the sync queue
 */
export async function addToSyncQueue(
  userId: number,
  imageId: number,
  localPath: string,
  provider: string,
  model: string,
  prompt: string
): Promise<void> {
  const job: SyncJob = {
    id: Date.now(),
    userId,
    imageId,
    localPath,
    provider,
    model,
    prompt,
    status: "pending",
  };

  syncQueue.push(job);

  // Start processing if not already running
  if (!isProcessing) {
    processQueue();
  }
}

/**
 * Process the sync queue
 */
async function processQueue(): Promise<void> {
  if (isProcessing || syncQueue.length === 0) {
    return;
  }

  isProcessing = true;

  while (syncQueue.length > 0) {
    const job = syncQueue.shift();
    if (!job) break;

    try {
      await processSyncJob(job);
    } catch (error) {
      console.error(`Sync job ${job.id} failed:`, error);
      job.status = "failed";
      job.error = error instanceof Error ? error.message : "Unknown error";
      updateSyncStatus(job);
    }
  }

  isProcessing = false;
}

/**
 * Process a single sync job
 */
async function processSyncJob(job: SyncJob): Promise<void> {
  job.status = "syncing";
  updateSyncStatus(job);

  // Get user's GitHub access token
  const db = await getDb();
  const user = db.prepare(
    "SELECT access_token, username FROM users WHERE id = ?"
  ).get(job.userId) as {
    access_token: string;
    username: string;
  } | undefined;

  if (!user?.access_token) {
    throw new Error("User not found or no GitHub access token");
  }

  const accessToken = user.access_token;
  const username = user.username;

  // Ensure repository exists
  await ensureRepository(accessToken, username);

  // Generate GitHub file path
  const githubPath = generateImagePath(job.provider, job.model, Date.now());

  // Read local file
  const fullPath = path.join(process.cwd(), "data", job.localPath);
  const imageBuffer = await readFile(fullPath);

  // Upload to GitHub
  const commitMessage = `🎨 Add image: ${job.prompt.substring(0, 50)}...`;
  await uploadImage(accessToken, username, githubPath, imageBuffer, commitMessage);

  // Update job status
  job.status = "completed";
  job.githubPath = githubPath;
  job.githubUrl = getImageUrl(username, githubPath);
  updateSyncStatus(job);

  // Update database with GitHub info
  db.prepare(`
    UPDATE images
    SET github_path = ?, github_sha = 'synced', repo_name = ?
    WHERE id = ?
  `).run(githubPath, `${username}/imagegate-images`, job.imageId);

  console.log(`✅ Synced image ${job.imageId} to GitHub: ${githubPath}`);
}

/**
 * Update sync status in database
 */
function updateSyncStatus(job: SyncJob): void {
  // You could add a sync_status column to images table
  // For now, we'll just log the status
  console.log(`Sync job ${job.id}: ${job.status}${job.error ? ` - ${job.error}` : ""}`);
}

/**
 * Get sync queue status
 */
export function getSyncQueueStatus(): {
  pending: number;
  processing: boolean;
  jobs: SyncJob[];
} {
  return {
    pending: syncQueue.length,
    processing: isProcessing,
    jobs: [...syncQueue],
  };
}

/**
 * Retry failed sync jobs
 */
export async function retryFailedJobs(): Promise<void> {
  const db = await getDb();

  // Get images that failed to sync
  const failedImages = db.prepare(`
    SELECT i.id, i.user_id, i.local_path, i.provider, i.model, i.prompt
    FROM images i
    WHERE i.github_path IS NULL
    AND i.user_id IN (SELECT id FROM users WHERE access_token IS NOT NULL)
  `).all() as Array<{
    id: number;
    user_id: number;
    local_path: string;
    provider: string;
    model: string;
    prompt: string;
  }>;

  for (const image of failedImages) {
    await addToSyncQueue(
      image.user_id,
      image.id,
      image.local_path,
      image.provider,
      image.model,
      image.prompt
    );
  }
}

/**
 * Sync a single image immediately (for testing)
 */
export async function syncImageNow(
  userId: number,
  imageId: number
): Promise<{ success: boolean; githubUrl?: string; error?: string }> {
  const db = await getDb();

  const image = db.prepare(
    "SELECT * FROM images WHERE id = ? AND user_id = ?"
  ).get(imageId, userId) as {
    id: number;
    user_id: number;
    local_path: string;
    provider: string;
    model: string;
    prompt: string;
  } | undefined;

  if (!image) {
    return { success: false, error: "Image not found" };
  }

  const user = db.prepare(
    "SELECT access_token, username FROM users WHERE id = ?"
  ).get(userId) as {
    access_token: string;
    username: string;
  } | undefined;

  if (!user?.access_token) {
    return { success: false, error: "User not found or no GitHub access token" };
  }

  try {
    await ensureRepository(user.access_token, user.username);

    const githubPath = generateImagePath(image.provider, image.model, Date.now());
    const fullPath = path.join(process.cwd(), "data", image.local_path);
    const imageBuffer = await readFile(fullPath);

    const commitMessage = `🎨 Add image: ${image.prompt.substring(0, 50)}...`;
    await uploadImage(user.access_token, user.username, githubPath, imageBuffer, commitMessage);

    db.prepare(`
      UPDATE images
      SET github_path = ?, github_sha = 'synced', repo_name = ?
      WHERE id = ?
    `).run(githubPath, `${user.username}/imagegate-images`, image.id);

    const githubUrl = getImageUrl(user.username, githubPath);

    return { success: true, githubUrl };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
