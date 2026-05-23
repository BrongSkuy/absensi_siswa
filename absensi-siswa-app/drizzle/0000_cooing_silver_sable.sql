CREATE TABLE `academic_years` (
	`id` text PRIMARY KEY NOT NULL,
	`tahun_ajaran` text NOT NULL,
	`semester` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`tanggal` text NOT NULL,
	`mapel` text DEFAULT 'Umum',
	`status` text NOT NULL,
	`recorded_by` text,
	`periode` text DEFAULT '2024/2025-Genap' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `att_student_idx` ON `attendance` (`student_id`);--> statement-breakpoint
CREATE INDEX `att_tanggal_idx` ON `attendance` (`tanggal`);--> statement-breakpoint
CREATE INDEX `att_periode_idx` ON `attendance` (`periode`);--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`nama_kelas` text NOT NULL,
	`tingkat` text NOT NULL,
	`wali_kelas` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classes_nama_kelas_unique` ON `classes` (`nama_kelas`);--> statement-breakpoint
CREATE TABLE `leaderboard_archives` (
	`id` text PRIMARY KEY NOT NULL,
	`nama_file` text NOT NULL,
	`path_file` text NOT NULL,
	`periode` text NOT NULL,
	`uploaded_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spk_criteria` (
	`id` text PRIMARY KEY NOT NULL,
	`nama_kriteria` text NOT NULL,
	`bobot` real NOT NULL,
	`tipe` text NOT NULL,
	`deskripsi` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spk_criteria_nama_kriteria_unique` ON `spk_criteria` (`nama_kriteria`);--> statement-breakpoint
CREATE TABLE `spk_grading_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`kelas` text NOT NULL,
	`mapel` text NOT NULL,
	`criteria_id` text NOT NULL,
	`periode` text NOT NULL,
	`categories` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spk_publish_status` (
	`id` text PRIMARY KEY NOT NULL,
	`periode` text NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`published_at` text,
	`published_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spk_publish_status_periode_unique` ON `spk_publish_status` (`periode`);--> statement-breakpoint
CREATE TABLE `spk_results` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`periode` text NOT NULL,
	`kelas` text NOT NULL,
	`rank` integer NOT NULL,
	`raw_score` real NOT NULL,
	`persentase` real NOT NULL,
	`details` text
);
--> statement-breakpoint
CREATE INDEX `spk_results_student_idx` ON `spk_results` (`student_id`);--> statement-breakpoint
CREATE INDEX `spk_results_periode_idx` ON `spk_results` (`periode`);--> statement-breakpoint
CREATE TABLE `spk_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`criteria_id` text NOT NULL,
	`mapel` text,
	`nilai` real DEFAULT 0 NOT NULL,
	`details` text,
	`periode` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `spk_scores_student_idx` ON `spk_scores` (`student_id`);--> statement-breakpoint
CREATE INDEX `spk_scores_periode_idx` ON `spk_scores` (`periode`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`nis` text NOT NULL,
	`nama_lengkap` text NOT NULL,
	`kelas` text NOT NULL,
	`angkatan` text NOT NULL,
	`jenis_kelamin` text NOT NULL,
	`status` text DEFAULT 'aktif' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_nis_unique` ON `students` (`nis`);--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`nama_mapel` text NOT NULL,
	`guru_pengampu` text
);
--> statement-breakpoint
CREATE TABLE `teacher_classes` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`kelas` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teacher_subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`nama_mapel` text NOT NULL,
	`periode` text DEFAULT '2024/2025-Genap' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`nip` text NOT NULL,
	`nama_lengkap` text NOT NULL,
	`status` text DEFAULT 'aktif' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teachers_nip_unique` ON `teachers` (`nip`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`impersonated_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`username` text,
	`display_username` text,
	`role` text,
	`banned` integer DEFAULT false,
	`ban_reason` text,
	`ban_expires` integer,
	`app_role` text DEFAULT 'SISWA'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);