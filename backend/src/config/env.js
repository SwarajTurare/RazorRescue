import 'dotenv/config';
export const env={port:Number(process.env.PORT||4000),aiUrl:process.env.AI_SERVICE_URL||'http://localhost:8001',dataDir:process.env.DATA_DIR||'../data',corsOrigin:process.env.CORS_ORIGIN||'http://localhost:5173'};
