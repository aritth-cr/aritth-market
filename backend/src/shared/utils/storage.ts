import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { env } from '../../config/env.js';

export type StorageFolder = 'quotes' | 'invoices' | 'temp';

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
