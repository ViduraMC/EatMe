-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'coordinator', 'donor', 'recipient', 'driver');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('open', 'partially_claimed', 'fully_claimed', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('packaged', 'prepared');

-- CreateEnum
CREATE TYPE "ItemUnit" AS ENUM ('kg', 'servings', 'loaves', 'packets', 'cans', 'litres');

-- CreateEnum
CREATE TYPE "StorageType" AS ENUM ('ambient', 'chilled', 'frozen');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('pending_driver', 'accepted', 'declined', 'in_transit', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('new_request', 'request_accepted', 'request_rejected', 'driver_assigned', 'driver_declined', 'delivery_completed', 'food_urgent');

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "address" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "organisation_name" VARCHAR(150),
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "donation_listings" (
    "listing_id" SERIAL NOT NULL,
    "donor_id" INTEGER NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "pickup_address" VARCHAR(255) NOT NULL,
    "pickup_window_start" TIMESTAMPTZ(3) NOT NULL,
    "pickup_window_end" TIMESTAMPTZ(3) NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "donation_listings_pkey" PRIMARY KEY ("listing_id")
);

-- CreateTable
CREATE TABLE "donation_items" (
    "item_id" SERIAL NOT NULL,
    "listing_id" INTEGER NOT NULL,
    "food_name" VARCHAR(120) NOT NULL,
    "category" "ItemCategory" NOT NULL,
    "quantity" DECIMAL(8,2) NOT NULL,
    "quantity_remaining" DECIMAL(8,2) NOT NULL,
    "unit" "ItemUnit" NOT NULL,
    "storage_type" "StorageType" NOT NULL,
    "expiry_date" TIMESTAMPTZ(3),
    "prepared_at" TIMESTAMPTZ(3),
    "safe_window_hours" INTEGER,
    "computed_expiry" TIMESTAMPTZ(3),
    "is_urgent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "donation_items_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "donation_requests" (
    "request_id" SERIAL NOT NULL,
    "listing_id" INTEGER NOT NULL,
    "recipient_id" INTEGER NOT NULL,
    "message" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "responded_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "donation_requests_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "donation_request_items" (
    "request_item_id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "quantity_requested" DECIMAL(8,2) NOT NULL,

    CONSTRAINT "donation_request_items_pkey" PRIMARY KEY ("request_item_id")
);

-- CreateTable
CREATE TABLE "delivery_assignments" (
    "assignment_id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "coordinator_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'pending_driver',
    "note_to_driver" TEXT,
    "decline_reason" TEXT,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ(3),
    "pickup_donor_confirmed_at" TIMESTAMPTZ(3),
    "pickup_driver_confirmed_at" TIMESTAMPTZ(3),
    "pickup_notes" TEXT,
    "dropoff_driver_confirmed_at" TIMESTAMPTZ(3),
    "dropoff_recipient_confirmed_at" TIMESTAMPTZ(3),
    "dropoff_notes" TEXT,
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "delivery_assignments_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "body" VARCHAR(255) NOT NULL,
    "related_entity_type" VARCHAR(40),
    "related_entity_id" INTEGER,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_is_available_idx" ON "users"("role", "is_available");

-- CreateIndex
CREATE INDEX "donation_listings_donor_id_idx" ON "donation_listings"("donor_id");

-- CreateIndex
CREATE INDEX "donation_listings_status_idx" ON "donation_listings"("status");

-- CreateIndex
CREATE INDEX "donation_items_listing_id_idx" ON "donation_items"("listing_id");

-- CreateIndex
CREATE INDEX "donation_items_is_urgent_computed_expiry_idx" ON "donation_items"("is_urgent", "computed_expiry");

-- CreateIndex
CREATE INDEX "donation_items_expiry_date_idx" ON "donation_items"("expiry_date");

-- CreateIndex
CREATE INDEX "donation_requests_listing_id_idx" ON "donation_requests"("listing_id");

-- CreateIndex
CREATE INDEX "donation_requests_recipient_id_idx" ON "donation_requests"("recipient_id");

-- CreateIndex
CREATE INDEX "donation_requests_status_idx" ON "donation_requests"("status");

-- CreateIndex
CREATE INDEX "donation_request_items_item_id_idx" ON "donation_request_items"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "donation_request_items_request_id_item_id_key" ON "donation_request_items"("request_id", "item_id");

-- CreateIndex
CREATE INDEX "delivery_assignments_request_id_idx" ON "delivery_assignments"("request_id");

-- CreateIndex
CREATE INDEX "delivery_assignments_driver_id_status_idx" ON "delivery_assignments"("driver_id", "status");

-- CreateIndex
CREATE INDEX "delivery_assignments_status_idx" ON "delivery_assignments"("status");

-- CreateIndex
CREATE INDEX "delivery_assignments_coordinator_id_idx" ON "delivery_assignments"("coordinator_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- AddForeignKey
ALTER TABLE "donation_listings" ADD CONSTRAINT "donation_listings_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_items" ADD CONSTRAINT "donation_items_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "donation_listings"("listing_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_requests" ADD CONSTRAINT "donation_requests_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "donation_listings"("listing_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_requests" ADD CONSTRAINT "donation_requests_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_request_items" ADD CONSTRAINT "donation_request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "donation_requests"("request_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_request_items" ADD CONSTRAINT "donation_request_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "donation_items"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "donation_requests"("request_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_coordinator_id_fkey" FOREIGN KEY ("coordinator_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- CHECK constraints, added by hand.
--
-- Prisma cannot express CHECK constraints in schema.prisma, so these are
-- written directly into the migration. Editing a migration this way is a
-- supported Prisma workflow: the shadow database replays this file, so
-- "prisma migrate dev" stays happy and these constraints survive a reset.
--
-- src/services/urgency.service.ts validates the same rules first and returns a
-- readable message. These are the backstop that catches anything written by a
-- route that forgets to call the service, by the seed, or by hand in psql.
-- MySQL could not enforce any of this, which is why the rule previously lived
-- only in application code.
-- ---------------------------------------------------------------------------

-- A packaged item carries expiry_date and none of the prepared columns.
ALTER TABLE "donation_items"
    ADD CONSTRAINT "donation_items_packaged_expiry_check" CHECK (
        "category" <> 'packaged'::"ItemCategory"
        OR (
            "expiry_date" IS NOT NULL
            AND "prepared_at" IS NULL
            AND "safe_window_hours" IS NULL
        )
    );

-- A prepared item is the mirror image, and its safe window must be positive.
ALTER TABLE "donation_items"
    ADD CONSTRAINT "donation_items_prepared_expiry_check" CHECK (
        "category" <> 'prepared'::"ItemCategory"
        OR (
            "expiry_date" IS NULL
            AND "prepared_at" IS NOT NULL
            AND "safe_window_hours" IS NOT NULL
            AND "safe_window_hours" > 0
        )
    );

-- Stock can never go negative, and can never exceed what was offered. This is
-- the invariant the quantity_remaining decrement on donor acceptance depends
-- on, and it guards against two concurrent acceptances oversubscribing an item.
ALTER TABLE "donation_items"
    ADD CONSTRAINT "donation_items_quantity_range_check" CHECK (
        "quantity" > 0
        AND "quantity_remaining" >= 0
        AND "quantity_remaining" <= "quantity"
    );

-- A requested quantity of zero or less is meaningless.
ALTER TABLE "donation_request_items"
    ADD CONSTRAINT "donation_request_items_quantity_positive_check" CHECK (
        "quantity_requested" > 0
    );

-- A pickup window that ends before it starts is a data entry error.
ALTER TABLE "donation_listings"
    ADD CONSTRAINT "donation_listings_pickup_window_check" CHECK (
        "pickup_window_end" > "pickup_window_start"
    );
