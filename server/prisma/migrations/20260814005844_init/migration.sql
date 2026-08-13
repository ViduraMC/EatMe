-- CreateTable
CREATE TABLE `users` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `address` TEXT NOT NULL,
    `role` ENUM('admin', 'coordinator', 'donor', 'recipient', 'driver') NOT NULL,
    `organisation_name` VARCHAR(150) NULL,
    `is_available` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_role_idx`(`role`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `donation_listings` (
    `listing_id` INTEGER NOT NULL AUTO_INCREMENT,
    `donor_id` INTEGER NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `pickup_address` VARCHAR(255) NOT NULL,
    `pickup_window_start` DATETIME(3) NOT NULL,
    `pickup_window_end` DATETIME(3) NOT NULL,
    `status` ENUM('open', 'partially_claimed', 'fully_claimed', 'expired', 'cancelled') NOT NULL DEFAULT 'open',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `donation_listings_donor_id_idx`(`donor_id`),
    INDEX `donation_listings_status_idx`(`status`),
    PRIMARY KEY (`listing_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `donation_items` (
    `item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `listing_id` INTEGER NOT NULL,
    `food_name` VARCHAR(120) NOT NULL,
    `category` ENUM('packaged', 'prepared') NOT NULL,
    `quantity` DECIMAL(8, 2) NOT NULL,
    `quantity_remaining` DECIMAL(8, 2) NOT NULL,
    `unit` ENUM('kg', 'servings', 'loaves', 'packets', 'cans', 'litres') NOT NULL,
    `storage_type` ENUM('ambient', 'chilled', 'frozen') NOT NULL,
    `expiry_date` DATETIME(3) NULL,
    `prepared_at` DATETIME(3) NULL,
    `safe_window_hours` INTEGER NULL,
    `computed_expiry` DATETIME(3) NULL,
    `is_urgent` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `donation_items_listing_id_idx`(`listing_id`),
    INDEX `donation_items_is_urgent_idx`(`is_urgent`),
    INDEX `donation_items_computed_expiry_idx`(`computed_expiry`),
    PRIMARY KEY (`item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `donation_requests` (
    `request_id` INTEGER NOT NULL AUTO_INCREMENT,
    `listing_id` INTEGER NOT NULL,
    `recipient_id` INTEGER NOT NULL,
    `message` TEXT NULL,
    `status` ENUM('pending', 'accepted', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
    `rejection_reason` TEXT NULL,
    `responded_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `donation_requests_listing_id_idx`(`listing_id`),
    INDEX `donation_requests_recipient_id_idx`(`recipient_id`),
    INDEX `donation_requests_status_idx`(`status`),
    PRIMARY KEY (`request_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `donation_request_items` (
    `request_item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_id` INTEGER NOT NULL,
    `item_id` INTEGER NOT NULL,
    `quantity_requested` DECIMAL(8, 2) NOT NULL,

    INDEX `donation_request_items_item_id_idx`(`item_id`),
    UNIQUE INDEX `donation_request_items_request_id_item_id_key`(`request_id`, `item_id`),
    PRIMARY KEY (`request_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `delivery_assignments` (
    `assignment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_id` INTEGER NOT NULL,
    `coordinator_id` INTEGER NOT NULL,
    `driver_id` INTEGER NOT NULL,
    `status` ENUM('pending_driver', 'accepted', 'declined', 'in_transit', 'completed', 'cancelled') NOT NULL DEFAULT 'pending_driver',
    `note_to_driver` TEXT NULL,
    `decline_reason` TEXT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `responded_at` DATETIME(3) NULL,
    `pickup_donor_confirmed_at` DATETIME(3) NULL,
    `pickup_driver_confirmed_at` DATETIME(3) NULL,
    `pickup_notes` TEXT NULL,
    `dropoff_driver_confirmed_at` DATETIME(3) NULL,
    `dropoff_recipient_confirmed_at` DATETIME(3) NULL,
    `dropoff_notes` TEXT NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `delivery_assignments_request_id_idx`(`request_id`),
    INDEX `delivery_assignments_driver_id_idx`(`driver_id`),
    INDEX `delivery_assignments_status_idx`(`status`),
    INDEX `delivery_assignments_coordinator_id_idx`(`coordinator_id`),
    PRIMARY KEY (`assignment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `notification_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` ENUM('new_request', 'request_accepted', 'request_rejected', 'driver_assigned', 'driver_declined', 'delivery_completed', 'food_urgent') NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `body` VARCHAR(255) NOT NULL,
    `related_entity_type` VARCHAR(40) NULL,
    `related_entity_id` INTEGER NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_is_read_idx`(`user_id`, `is_read`),
    PRIMARY KEY (`notification_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `donation_listings` ADD CONSTRAINT `donation_listings_donor_id_fkey` FOREIGN KEY (`donor_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `donation_items` ADD CONSTRAINT `donation_items_listing_id_fkey` FOREIGN KEY (`listing_id`) REFERENCES `donation_listings`(`listing_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `donation_requests` ADD CONSTRAINT `donation_requests_listing_id_fkey` FOREIGN KEY (`listing_id`) REFERENCES `donation_listings`(`listing_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `donation_requests` ADD CONSTRAINT `donation_requests_recipient_id_fkey` FOREIGN KEY (`recipient_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `donation_request_items` ADD CONSTRAINT `donation_request_items_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `donation_requests`(`request_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `donation_request_items` ADD CONSTRAINT `donation_request_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `donation_items`(`item_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_assignments` ADD CONSTRAINT `delivery_assignments_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `donation_requests`(`request_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_assignments` ADD CONSTRAINT `delivery_assignments_coordinator_id_fkey` FOREIGN KEY (`coordinator_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_assignments` ADD CONSTRAINT `delivery_assignments_driver_id_fkey` FOREIGN KEY (`driver_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

