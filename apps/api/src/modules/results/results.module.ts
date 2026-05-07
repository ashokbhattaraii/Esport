import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: process.env.UPLOAD_DIR ?? './uploads',
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `result-${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  ],
  controllers: [ResultsController],
  providers: [ResultsService],
})
export class ResultsModule {}
