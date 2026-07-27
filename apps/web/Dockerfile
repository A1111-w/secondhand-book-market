FROM node:22-alpine
WORKDIR /app

COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

COPY apps/web/ ./
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=mysql://build:build@127.0.0.1:3306/build
ENV JWT_SECRET=build-only-secret-not-used-at-runtime-123456
RUN npx prisma generate && npm run build \
  && mkdir -p public/uploads public/productimage .data/verification \
  && chown -R node:node public/uploads public/productimage .data

USER node
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
