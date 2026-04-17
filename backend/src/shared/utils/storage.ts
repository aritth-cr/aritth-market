// shared/utils/storage.ts
import { mkdir, writeFile, unlink, access } from 'fs/promises';
import { join, dirname } from 'path';
import { env } from '../../config/env.js';

export type StorageFolder = 'quotes' | 'invoices' | 'technical-documents' | 'temp';

/**
 * Guarda un archivo en el storage local y retorna la URL relativa.
 * Estructura: ./storage/{folder}/{filename}
 */
export async function saveFile(
  folder: StorageFolder,
  filename: string,
  content: Buffer | Uint8Array,
): Promise<string> {
  const basePath = env.STORAGE_PATH;
  const fullPath = join(basePath, folder, filename);

  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content);

  return `/files/${folder}/${filename}`;
}

/**
 * Genera un nombre de archivo único con timestamp
 */
export function generateFilename(prefix: string, extension = 'pdf'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}.${extension}`;
}

/**
 * Elimina un archivo del storage local (best-effort, no lanza si no existe)
 */
export async function deleteFile(
  folder: StorageFolder,
  filename: string,
): Promise<void> {
  const basePath = env.STORAGE_PATH;
  const fullPath = join(basePath, folder, filename);
  try {
    await unlink(fullPath);
  } catch {
    // File may not exist — non-blocking
  }
}

/**
 * Retorna la ruta completa del sistema de archivos para un recurso almacenado.
 * Útil para operaciones de lectura directa (e.g. reenvío de PDF).
 */
export function getFilePath(folder: StorageFolder, filename: string): string {
  return join(env.STORAGE_PATH, folder, filename);
}

/**
 * Verifica si un archivo existe en el storage
 */
export async function fileExists(folder: StorageFolder, filename: string): Promise<boolean> {
  try {
    await access(getFilePath(folder, filename));
    return true;
  } catch {
    return false;
  }
}
