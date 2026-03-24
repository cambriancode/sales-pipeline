import { createAdminClient } from '@/lib/supabase/admin';
import { OPPORTUNITY_DOCUMENT_BUCKET } from '@/lib/document-storage';
import { createZip, type ZipEntry } from '@/lib/zip';

const SNAPSHOT_TABLES = [
  'allowed_emails',
  'profiles',
  'account_types',
  'opportunity_types',
  'opportunity_stages',
  'lost_reasons',
  'task_types',
  'document_types',
  'products',
  'accounts',
  'contacts',
  'opportunities',
  'opportunity_contacts',
  'opportunity_products',
  'activities',
  'tasks',
  'documents',
  'notes',
  'opportunity_stage_history',
  'sales_targets',
] as const;

const RESTORE_ORDER = [
  'account_types',
  'opportunity_types',
  'opportunity_stages',
  'lost_reasons',
  'task_types',
  'document_types',
  'products',
  'allowed_emails',
  'profiles',
  'accounts',
  'contacts',
  'opportunities',
  'opportunity_contacts',
  'opportunity_products',
  'activities',
  'tasks',
  'documents',
  'notes',
  'opportunity_stage_history',
  'sales_targets',
] as const;

interface SnapshotOptions {
  requestedBy: {
    id: string;
    email: string;
    fullName: string;
  };
}

function nowStamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function jsonFile(data: unknown) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

async function fetchAllRows(table: string) {
  const admin = createAdminClient() as any;
  const rows: any[] = [];
  const pageSize = 1000;
  let page = 0;

  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await admin
      .from(table)
      .select('*')
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to export ${table}: ${error.message}`);
    }

    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    page += 1;
  }

  return rows;
}

async function fetchAuthUsers() {
  const admin = createAdminClient();
  const users: any[] = [];
  const perPage = 100;
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage } as any);
    if (error) {
      throw new Error(`Failed to export auth users: ${error.message}`);
    }

    const batch = (data as { users?: any[] } | null)?.users ?? [];
    users.push(
      ...batch.map((user) => ({
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        aud: user.aud,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at,
        phone_confirmed_at: user.phone_confirmed_at,
        is_anonymous: user.is_anonymous,
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata,
      })),
    );

    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function fetchStorageManifest(documents: any[]) {
  const admin = createAdminClient();
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) {
    throw new Error(`Failed to export storage manifest: ${error.message}`);
  }

  const documentObjects = documents
    .filter((item) => item.file_path)
    .map((item) => ({
      bucket: OPPORTUNITY_DOCUMENT_BUCKET,
      document_id: item.id,
      opportunity_id: item.opportunity_id,
      file_path: item.file_path,
      file_name: item.file_name,
      file_size_bytes: item.file_size_bytes,
      mime_type: item.mime_type,
      uploaded_at: item.uploaded_at,
      status: item.status,
    }));

  return {
    buckets: (buckets ?? []).map((bucket) => ({
      id: bucket.id,
      name: bucket.name,
      public: bucket.public,
      file_size_limit: bucket.file_size_limit,
      allowed_mime_types: bucket.allowed_mime_types,
      created_at: bucket.created_at,
      updated_at: bucket.updated_at,
    })),
    document_bucket: OPPORTUNITY_DOCUMENT_BUCKET,
    document_objects: documentObjects,
  };
}

export async function buildSnapshotArchive(options: SnapshotOptions) {
  const exportedAt = new Date();
  const stamp = nowStamp(exportedAt);
  const entries: ZipEntry[] = [];
  const tableCounts: Record<string, number> = {};
  const tablesPayload: Record<string, any[]> = {};

  for (const table of SNAPSHOT_TABLES) {
    const rows = await fetchAllRows(table);
    tablesPayload[table] = rows;
    tableCounts[table] = rows.length;
    entries.push({
      name: `tables/${table}.json`,
      data: jsonFile(rows),
      modifiedAt: exportedAt,
    });
  }

  const authUsers = await fetchAuthUsers();
  entries.push({
    name: 'auth/auth_users.json',
    data: jsonFile(authUsers),
    modifiedAt: exportedAt,
  });

  const storageManifest = await fetchStorageManifest(tablesPayload.documents ?? []);
  entries.push({
    name: 'storage/storage-manifest.json',
    data: jsonFile(storageManifest),
    modifiedAt: exportedAt,
  });

  const manifest = {
    export_version: 'snapshot-export-v1',
    exported_at: exportedAt.toISOString(),
    requested_by: options.requestedBy,
    included_tables: SNAPSHOT_TABLES,
    row_counts: tableCounts,
    restore_order: RESTORE_ORDER,
    auth_users_count: authUsers.length,
    storage_object_rows: storageManifest.document_objects.length,
    notes: [
      'This snapshot exports app tables, selected Auth user metadata, and a storage manifest only.',
      'Storage object binaries are not included in this archive.',
      'Use service-role credentials only on the server when restoring or validating this archive.',
    ],
  };

  entries.unshift({
    name: 'manifest.json',
    data: jsonFile(manifest),
    modifiedAt: exportedAt,
  });

  entries.push({
    name: 'README.txt',
    data: [
      'Calavera Ventas snapshot export',
      '',
      `Generated: ${exportedAt.toISOString()}`,
      `Requested by: ${options.requestedBy.fullName} <${options.requestedBy.email}>`,
      '',
      'Contents:',
      '- manifest.json',
      '- tables/*.json',
      '- auth/auth_users.json',
      '- storage/storage-manifest.json',
      '',
      'Important:',
      '- This archive contains structured data only.',
      '- Storage object binaries are NOT included.',
      '- Restore lookup tables before transactional tables.',
      `- Recommended restore order is listed in manifest.json.`,
    ].join('\n'),
    modifiedAt: exportedAt,
  });

  return {
    fileName: `calavera-ventas-snapshot-${stamp}.zip`,
    buffer: createZip(entries),
    manifest,
  };
}
