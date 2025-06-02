CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text,
	`nickname` text,
	`avatar_url` text,
	`locale` text,
	`signin_type` text,
	`signin_ip` text,
	`signin_provider` text,
	`signin_openid` text,
	`utm` text DEFAULT '{}'
);

CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_no` text NOT NULL,
	`user_uuid` text NOT NULL,
	`user_email` text NOT NULL,
	`customer_id` text,
	`amount` real,
	`net_amount` real,
	`charge_type` text NOT NULL,
	`payment_country` text,
	`payment_channel` text NOT NULL,
	`status` text NOT NULL,
	`last_refund_at` text,
	`total_refund_amount` real,
	`invoice` text,
	`paid_at` text,
	`created_at` text,
	`updated_at` text,
    `paid_email` text
);


CREATE TABLE `apikeys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`api_key` text NOT NULL,
	`title` text,
	`user_uuid` text NOT NULL,
	`created_at` text,
	`status` text
);

CREATE TABLE `credits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trans_no` text NOT NULL,
	`created_at` text,
	`user_uuid` text NOT NULL,
	`trans_type` text NOT NULL,
	`credits` integer NOT NULL,
	`order_no` text,
	`expired_at` text
);

CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`slug` text,
	`title` text,
	`description` text,
	`content` text,
	`created_at` text,
	`updated_at` text,
	`status` text,
	`cover_url` text,
	`author_name` text,
	`author_avatar_url` text,
	`locale` text
);

CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sub_id` text NOT NULL,
	`user_uuid` text NOT NULL,
	`user_email` text NOT NULL,
	`sub_expires_at` text,
	`sub_status` text,
	`customer_id` text,
	`plan_type` text,
	`cycle` text,
	`payment_channel` text,
	`created_at` text,
	`updated_at` text
);
