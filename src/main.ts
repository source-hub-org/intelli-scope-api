import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import * as fs from 'fs'; // Import 'fs' for file system operations

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());

  // --- Swagger Configuration ---
  const config = new DocumentBuilder()
    .setTitle('NestJS API') // Set the title of your API
    .setDescription('The API description') // Provide a description
    .setVersion('1.0') // Set the API version
    .addBearerAuth() // If you use Bearer token authentication
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Option 1: Setup Swagger UI (interactive documentation)
  // This will make your Swagger UI available at /api
  SwaggerModule.setup('api', app, document);

  // Option 2: Generate and save OpenAPI JSON file (e.g., during build or on demand)
  // You can call this function when you need to generate the file.
  // For example, you might have a separate script or integrate it into your build process.
  generateOpenApiJson(app, document);

  await app.listen(process.env.PORT ?? 3000);

  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger UI available at ${await app.getUrl()}/api`);
  console.log(`OpenAPI JSON available at ${await app.getUrl()}/api-json`); // Default path for JSON
}

/**
 * Function to generate and save the OpenAPI JSON file.
 * @param app The NestJS application instance.
 * @param document The OpenAPI document object.
 */
function generateOpenApiJson(app: INestApplication, document: any) {
  const outputPath = './openapi.json'; // Or any path you prefer
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2)); // Beautify the JSON output
  console.log(`OpenAPI JSON file has been generated at ${outputPath}`);

  // Optionally, you can expose a route to download the JSON file.
  // The SwaggerModule.setup already provides /api-json by default when UI is enabled.
  // If you disable the UI or need a custom path, you can do it manually:
  // (app as any).getHttpAdapter().get('/openapi.json', (req, res) => {
  //   res.setHeader('Content-Type', 'application/json');
  //   res.send(document);
  // });
}

bootstrap();
