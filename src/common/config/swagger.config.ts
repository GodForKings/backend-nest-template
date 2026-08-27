import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const getSwaggerConfig = () => {
  return new DocumentBuilder()
    .setTitle('Rest API Template')
    .setDescription('API Documentation')
    .setVersion('1.0.0')
    .setContact(
      'GodForKings',
      'https://github.com/GodForKings',
      'itdextrabusiness@gmail.com',
    )
    .setLicense('JSON-doc', '/swagger.json')
    .addBearerAuth()
    .build();
};

export const setupSwagger = (app: INestApplication) => {
  const config = getSwaggerConfig();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('/swagger', app, document, {
    jsonDocumentUrl: '/swagger.json',
    yamlDocumentUrl: '/swagger.yaml',
    customSiteTitle: 'API DOCS',
  });
};
