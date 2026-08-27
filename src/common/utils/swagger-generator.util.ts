import { OpenAPIObject } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

/** Сохраняет спецификацию OpenAPI в файл swagger-spec.json в корне проекта. */
export const saveSwaggerSpec = (document: OpenAPIObject): void => {
  try {
    const outputPath = path.join(__dirname, '../../../../swagger-spec.json');
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
    console.log(`[Swagger] Спецификация успешно сохранена в: ${outputPath}`);
  } catch (error) {
    console.error('[Swagger] Ошибка сохранения спецификации на диск:', error);
  }
};
