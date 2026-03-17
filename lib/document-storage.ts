import { createAdminClient } from "@/lib/supabase/admin";

export const OPPORTUNITY_DOCUMENT_BUCKET = "opportunity-documents";

export async function ensureOpportunityDocumentBucket() {
  const admin = createAdminClient();
  const { data: buckets } = await admin.storage.listBuckets();
  const exists = (buckets ?? []).some((bucket) => bucket.name === OPPORTUNITY_DOCUMENT_BUCKET);

  if (!exists) {
    const { error } = await admin.storage.createBucket(OPPORTUNITY_DOCUMENT_BUCKET, {
      public: false,
      fileSizeLimit: "10485760",
      allowedMimeTypes: [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/webp",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/plain",
      ],
    });

    if (error && !String(error.message).toLowerCase().includes("already exists")) {
      throw error;
    }
  }
}

export function buildOpportunityDocumentPath(args: {
  opportunityId: string;
  documentId: string;
  fileName: string;
}) {
  const safeFileName = args.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${args.opportunityId}/${args.documentId}/${safeFileName}`;
}
