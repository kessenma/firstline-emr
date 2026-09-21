CREATE TABLE "oidc_access_tokens" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"grant_id" varchar(255),
	"payload" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oidc_authorization_codes" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"grant_id" varchar(255),
	"payload" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "oidc_backchannel_auth_requests" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oidc_client_credentials" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "oidc_device_codes" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_code" varchar(255),
	"grant_id" varchar(255),
	"payload" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "oidc_grants" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oidc_interactions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oidc_pushed_authorization_requests" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oidc_refresh_tokens" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"grant_id" varchar(255),
	"payload" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "oidc_replay_detection" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oidc_sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"grant_id" varchar(255),
	"payload" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "oidc_access_tokens_expires_idx" ON "oidc_access_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "oidc_access_tokens_grant_id_idx" ON "oidc_access_tokens" USING btree ("grant_id");--> statement-breakpoint
CREATE INDEX "oidc_auth_codes_expires_idx" ON "oidc_authorization_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "oidc_auth_codes_grant_id_idx" ON "oidc_authorization_codes" USING btree ("grant_id");--> statement-breakpoint
CREATE INDEX "oidc_backchannel_auth_requests_expires_idx" ON "oidc_backchannel_auth_requests" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "oidc_client_credentials_expires_idx" ON "oidc_client_credentials" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "oidc_device_codes_expires_idx" ON "oidc_device_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "oidc_device_codes_user_code_idx" ON "oidc_device_codes" USING btree ("user_code");--> statement-breakpoint
CREATE INDEX "oidc_device_codes_grant_id_idx" ON "oidc_device_codes" USING btree ("grant_id");--> statement-breakpoint
CREATE INDEX "oidc_grants_expires_idx" ON "oidc_grants" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "oidc_interactions_expires_idx" ON "oidc_interactions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "oidc_pushed_auth_requests_expires_idx" ON "oidc_pushed_authorization_requests" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "oidc_refresh_tokens_expires_idx" ON "oidc_refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "oidc_refresh_tokens_grant_id_idx" ON "oidc_refresh_tokens" USING btree ("grant_id");--> statement-breakpoint
CREATE INDEX "oidc_replay_detection_expires_idx" ON "oidc_replay_detection" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "oidc_sessions_expires_idx" ON "oidc_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "oidc_sessions_grant_id_idx" ON "oidc_sessions" USING btree ("grant_id");