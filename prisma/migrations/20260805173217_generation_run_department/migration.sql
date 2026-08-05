-- AlterTable
ALTER TABLE "GenerationRun" ADD COLUMN     "departmentId" INTEGER;

-- CreateIndex
CREATE INDEX "GenerationRun_departmentId_idx" ON "GenerationRun"("departmentId");

-- AddForeignKey
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
