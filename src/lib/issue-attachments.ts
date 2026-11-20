export type IssueAttachment = { name: string; url: string };

const PREFIX = 'qa-attachments-v1:';
export const MAX_ISSUE_ATTACHMENT_BYTES = 3_400_000;

export function parseIssueAttachments(url?: string | null, name?: string | null): IssueAttachment[] {
  if (!url) return [];
  if (!url.startsWith(PREFIX)) return [{ url, name: name || 'Attachment' }];
  try {
    const parsed: unknown = JSON.parse(url.slice(PREFIX.length));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is IssueAttachment =>
      typeof item?.name === 'string' && typeof item?.url === 'string' && item.url.length > 0
    );
  } catch {
    return [];
  }
}

export function serializeIssueAttachments(attachments: IssueAttachment[]) {
  if (!attachments.length) return { attachment_url: null, attachment_name: null };
  if (attachments.length === 1) return { attachment_url: attachments[0].url, attachment_name: attachments[0].name };
  return {
    attachment_url: PREFIX + JSON.stringify(attachments),
    attachment_name: `${attachments.length} attachments`,
  };
}
