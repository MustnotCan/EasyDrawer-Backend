/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `tag` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "book" ADD COLUMN     "indexes" VARCHAR(30)[] DEFAULT ARRAY[]::VARCHAR(30)[],
ADD COLUMN     "textExtracted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "textContent" (
    "id" UUID NOT NULL,
    "bookId" UUID NOT NULL,

    CONSTRAINT "textContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page" (
    "id" UUID NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "text" TEXT,
    "textContentId" UUID NOT NULL,

    CONSTRAINT "page_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "textContent_id_key" ON "textContent"("id");

-- CreateIndex
CREATE UNIQUE INDEX "textContent_bookId_key" ON "textContent"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "page_id_key" ON "page"("id");

-- CreateIndex
CREATE UNIQUE INDEX "tag_id_key" ON "tag"("id");

-- AddForeignKey
ALTER TABLE "textContent" ADD CONSTRAINT "textContent_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page" ADD CONSTRAINT "page_textContentId_fkey" FOREIGN KEY ("textContentId") REFERENCES "textContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
