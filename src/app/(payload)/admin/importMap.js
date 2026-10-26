import { PublishControl as PublishControl_468b90f6506e4b0c82fce16d4802cd4a } from '@/cms/components/PublicationControls'
import { UnpublishControl as UnpublishControl_468b90f6506e4b0c82fce16d4802cd4a } from '@/cms/components/PublicationControls'
import { default as default_c91436f05acd94719f75e89013ef577d } from '@/cms/components/AdminDashboard'
import { CollectionCards as CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1 } from '@payloadcms/next/rsc'
import { S3ClientUploadHandler as S3ClientUploadHandler_f97aa6c64367fa259c5bc0567239ef24 } from '@payloadcms/storage-s3/client'

/** @type import('payload').ImportMap */
export const importMap = {
  "@/cms/components/PublicationControls#PublishControl": PublishControl_468b90f6506e4b0c82fce16d4802cd4a,
  "@/cms/components/PublicationControls#UnpublishControl": UnpublishControl_468b90f6506e4b0c82fce16d4802cd4a,
  "@/cms/components/AdminDashboard#default": default_c91436f05acd94719f75e89013ef577d,
  "@payloadcms/next/rsc#CollectionCards": CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1,
  "@payloadcms/storage-s3/client#S3ClientUploadHandler": S3ClientUploadHandler_f97aa6c64367fa259c5bc0567239ef24
}
