"use client";

import { Button, PublishButton, UnpublishButton, useAuth } from "@payloadcms/ui";
import type { PublishButtonClientProps, UnpublishButtonClientProps } from "payload";

function useMayPublish() {
  const { user } = useAuth<{ role?: string }>();
  return user?.role === "admin" || user?.role === "publisher";
}

/** UI guidance only; collection hooks enforce the same restriction on the server. */
export function PublishControl(props: PublishButtonClientProps) {
  const mayPublish = useMayPublish();
  return mayPublish ? <PublishButton {...props} /> : <Button buttonId="action-save" disabled size="medium" type="button" tooltip="Публикация доступна публикующему редактору.">Опубликовать изменения</Button>;
}

export function UnpublishControl(props: UnpublishButtonClientProps) {
  const mayPublish = useMayPublish();
  return mayPublish ? <UnpublishButton {...props} /> : null;
}
