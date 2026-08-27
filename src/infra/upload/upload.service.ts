import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { v4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly rootDir = path.resolve(process.cwd(), 'uploads');
  private readonly publicDir = path.join(this.rootDir, 'public');
  private readonly privateDir = path.join(this.rootDir, 'private');

  constructor() {
    this.ensureDirsExistSync();
  }

  private ensureDirsExistSync() {
    try {
      fs.mkdirSync(this.publicDir, { recursive: true });
      fs.mkdirSync(this.privateDir, { recursive: true });
    } catch (error) {
      Logger.error(
        `Ошибка создания директорий загрузки: ${(error as Error).message}`,
        UploadService.name,
      );
    }
  }

  /**
   * Сохраняет файл на диске.
   */
  async saveFile(
    file: { originalname: string; buffer: Buffer },
    type: 'public' | 'private',
  ): Promise<{ fileName: string; filePath: string }> {
    if (!file) {
      throw new BadRequestException('Файл не передан');
    }

    const ext = path.extname(file.originalname);
    const uniqueFileName = `${v4()}${ext}`;
    const targetDir = type === 'public' ? this.publicDir : this.privateDir;
    const fullPath = path.join(targetDir, uniqueFileName);

    try {
      await fsPromises.writeFile(fullPath, file.buffer);
    } catch (error) {
      throw new BadRequestException(
        `Не удалось сохранить файл: ${(error as Error).message}`,
      );
    }

    const relativePath =
      type === 'public'
        ? `/uploads/public/${uniqueFileName}`
        : `/uploads/private/${uniqueFileName}`;

    return {
      fileName: file.originalname,
      filePath: relativePath,
    };
  }

  /**
   * Удаляет файл с диска по его относительному пути.
   */
  async deleteFile(filePath: string): Promise<void> {
    if (!filePath) {
      return;
    }

    let relativePath = filePath;
    if (filePath.includes('/uploads/')) {
      const index = filePath.indexOf('/uploads/');
      relativePath = filePath.substring(index);
    }

    if (!relativePath.startsWith('/uploads/')) {
      return;
    }

    const cleanPath = relativePath.replace(/^\/uploads\//, '');
    const fullPath = path.join(this.rootDir, cleanPath);

    try {
      await fsPromises.access(fullPath);
      await fsPromises.unlink(fullPath);
    } catch (error) {
      Logger.warn(
        `Не удалось удалить файл ${fullPath}: ${(error as Error).message}`,
        UploadService.name,
      );
    }
  }
}
