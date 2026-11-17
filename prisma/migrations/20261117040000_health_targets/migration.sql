-- CreateTable
CREATE TABLE "HealthTarget" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "secondaryTarget" DOUBLE PRECISION,
    "direction" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthTarget_pkey" PRIMARY KEY ("key")
);

