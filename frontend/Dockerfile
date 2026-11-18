FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/driver/package.json ./apps/driver/package.json
COPY apps/owner/package.json ./apps/owner/package.json
COPY apps/inspector/package.json ./apps/inspector/package.json
COPY apps/site/package.json ./apps/site/package.json
RUN npm ci --no-audit --no-fund
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ARG API_INTERNAL_URL=http://backend:8000
ARG SITE_URL=http://127.0.0.1:3001
ARG APP_URL=
ARG MULTI_APP=1
ARG DRIVER_URL=https://driver.alamut.bar
ARG OWNER_URL=https://owner.alamut.bar
ARG INSPECTOR_URL=https://inspector.alamut.bar
ARG ADMIN_URL=https://admin.alamut.bar
ENV MULTI_APP=$MULTI_APP DRIVER_URL=$DRIVER_URL OWNER_URL=$OWNER_URL INSPECTOR_URL=$INSPECTOR_URL ADMIN_URL=$ADMIN_URL
ARG GOOGLE_SITE_VERIFICATION=
ARG BUSINESS_OPERATOR_NAME=
ARG BUSINESS_CONTACT_EMAIL=
ARG BUSINESS_RETENTION_NOTICE=
ARG BUSINESS_TERMS_NOTICE=
ENV SITE_URL=$SITE_URL APP_URL=$APP_URL GOOGLE_SITE_VERIFICATION=$GOOGLE_SITE_VERIFICATION
ENV BUSINESS_OPERATOR_NAME=$BUSINESS_OPERATOR_NAME BUSINESS_CONTACT_EMAIL=$BUSINESS_CONTACT_EMAIL
ENV BUSINESS_RETENTION_NOTICE=$BUSINESS_RETENTION_NOTICE BUSINESS_TERMS_NOTICE=$BUSINESS_TERMS_NOTICE
ENV API_INTERNAL_URL=$API_INTERNAL_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/apps/site/.next/standalone ./
USER app
EXPOSE 3000
CMD ["node","apps/site/server.js"]
