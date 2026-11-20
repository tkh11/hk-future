// The active schema no longer exposes the former catalogue pump fields.
// Keep their tables and columns for historical imports and existing backups.
// This migration advances the schema snapshot without dropping engineering data.
export async function up(): Promise<void> {}

export async function down(): Promise<void> {}
