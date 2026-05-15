import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { runAdminSeed } from './database/seeds/admin.seeder';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 글로벌 유효성 검사
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // CORS 설정
  app.enableCors({
    origin: [
      `http://localhost:${process.env.PORT_FRONTEND_ADMIN ?? 5174}`,
      `http://localhost:${process.env.PORT_FRONTEND_TENANT ?? 5173}`,
    ],
    credentials: true,
  });

  // Swagger 문서
  const config = new DocumentBuilder()
    .setTitle('SOAR API')
    .setDescription('Security Orchestration, Automation and Response API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // 개발 환경에서만 자동 시딩
  if (process.env.NODE_ENV === 'development') {
    const dataSource = app.get(DataSource);
    await runAdminSeed(dataSource);
  }

  const port = process.env.PORT_BACKEND ?? 3000;
  await app.listen(port);
  console.log(`[SOAR Backend] 서버 기동 완료: http://localhost:${port}`);
  console.log(`[SOAR Backend] API 문서: http://localhost:${port}/docs`);
}
bootstrap();
