#!/bin/sh

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is not set!"
  exit 1
fi

echo "Running Prisma Migrations..."
npx prisma migrate dev -n first
echo "✅ Done"

