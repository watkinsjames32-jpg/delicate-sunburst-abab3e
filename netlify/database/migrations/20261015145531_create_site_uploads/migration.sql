CREATE TABLE "site_uploads" (
	"id" serial PRIMARY KEY,
	"blob_key" text NOT NULL UNIQUE,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"caption" text,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"chunk_size" integer NOT NULL,
	"chunk_count" integer NOT NULL,
	"status" text DEFAULT 'uploading' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
