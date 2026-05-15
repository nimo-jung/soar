"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const typeorm_1 = require("typeorm");
const admin_seeder_1 = require("./database/seeds/admin.seeder");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.enableCors({
        origin: [
            `http://localhost:${process.env.PORT_FRONTEND_ADMIN ?? 5174}`,
            `http://localhost:${process.env.PORT_FRONTEND_TENANT ?? 5173}`,
        ],
        credentials: true,
    });
    const config = new swagger_1.DocumentBuilder()
        .setTitle('SOAR API')
        .setDescription('Security Orchestration, Automation and Response API')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('docs', app, document);
    if (process.env.NODE_ENV === 'development') {
        const dataSource = app.get(typeorm_1.DataSource);
        await (0, admin_seeder_1.runAdminSeed)(dataSource);
    }
    const port = process.env.PORT_BACKEND ?? 3000;
    await app.listen(port);
    console.log(`[SOAR Backend] 서버 기동 완료: http://localhost:${port}`);
    console.log(`[SOAR Backend] API 문서: http://localhost:${port}/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map