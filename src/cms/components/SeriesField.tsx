import 'server-only';
import { RelationshipField } from '@payloadcms/ui';
import type { RelationshipFieldServerComponent } from 'payload';

/** The catalog has no series yet; the field appears once one exists or the record already has a value. */
const SeriesField: RelationshipFieldServerComponent = async ({ clientField, path, schemaPath, permissions, readOnly, payload, req, data }) => {
  if (!data?.series) {
    const { totalDocs } = await payload.count({ collection: 'product-series', req, overrideAccess: false, user: req.user });
    if (!totalDocs) return null;
  }
  return <RelationshipField field={clientField} path={path} schemaPath={schemaPath} permissions={permissions} readOnly={readOnly} />;
};

export default SeriesField;
