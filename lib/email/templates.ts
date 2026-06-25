interface ApprovalEmailInput {
  appUrl: string;
  recipientName: string | null;
  thumbnailUrl: string | null;
  outline: string;
  caption: string;
  scheduledAt: Date | null;
  approveUrl: string;
  rejectUrl: string;
  editUrl: string;
}

export function approvalEmailHtml(input: ApprovalEmailInput): string {
  const when = input.scheduledAt
    ? input.scheduledAt.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "immediately";

  return `<!doctype html>
<html>
  <body style="margin:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fafafa;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:16px;border:1px solid #e4e4e7;overflow:hidden;">
          <tr><td style="padding:24px 28px 8px 28px;">
            <div style="font-size:13px;color:#a1a1aa;letter-spacing:0.04em;text-transform:uppercase;">Promote · Approval needed</div>
            <h1 style="margin:8px 0 0 0;font-size:22px;line-height:1.3;color:#18181b;">
              Hi ${escape(input.recipientName ?? "there")}, please review this reel.
            </h1>
            <p style="margin:8px 0 0 0;color:#52525b;font-size:14px;">
              We&rsquo;ll publish on Instagram <strong>${when}</strong> once you approve.
            </p>
          </td></tr>

          ${
            input.thumbnailUrl
              ? `<tr><td style="padding:16px 28px 0 28px;">
                  <img src="${escape(input.thumbnailUrl)}" alt="" width="504" style="width:100%;border-radius:12px;display:block;border:1px solid #e4e4e7;" />
                </td></tr>`
              : ""
          }

          <tr><td style="padding:16px 28px 0 28px;">
            <div style="font-size:12px;color:#a1a1aa;letter-spacing:0.04em;text-transform:uppercase;">Outline</div>
            <p style="margin:4px 0 16px 0;font-size:14px;color:#3f3f46;">${escape(input.outline)}</p>
            <div style="font-size:12px;color:#a1a1aa;letter-spacing:0.04em;text-transform:uppercase;">Caption</div>
            <p style="margin:4px 0 0 0;font-size:14px;color:#18181b;white-space:pre-wrap;">${escape(input.caption)}</p>
          </td></tr>

          <tr><td style="padding:24px 28px;">
            <table role="presentation" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding-right:8px;">
                  <a href="${escape(input.approveUrl)}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:999px;">Approve &amp; publish</a>
                </td>
                <td style="padding-right:8px;">
                  <a href="${escape(input.editUrl)}" style="display:inline-block;background:#fff;color:#18181b;text-decoration:none;font-weight:500;font-size:14px;padding:11px 18px;border-radius:999px;border:1px solid #d4d4d8;">Edit caption</a>
                </td>
                <td>
                  <a href="${escape(input.rejectUrl)}" style="display:inline-block;background:#fff;color:#dc2626;text-decoration:none;font-weight:500;font-size:14px;padding:11px 18px;border-radius:999px;border:1px solid #fecaca;">Reject</a>
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0 0;font-size:12px;color:#a1a1aa;">
              Links expire in 7 days. You can also manage this post in
              <a href="${escape(input.appUrl)}/posts" style="color:#a1a1aa;">your dashboard</a>.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

// ── Post-published summary ──────────────────────────────────────────────────

export interface PublishedTargetResult {
  platform: string;          // "INSTAGRAM" | "FACEBOOK" | ...
  accountName: string | null; // the connected account's display name
  status: "posted" | "failed";
  url: string | null;        // public permalink when posted
  error?: string;            // failure reason when failed
}

export interface PublishedEmailInput {
  appUrl: string;
  recipientName: string | null;
  outline: string;
  caption: string;
  thumbnailUrl: string | null;
  mediaType: string;         // VIDEO | PHOTO | CAROUSEL
  postedAt: Date;
  postId: string;
  results: PublishedTargetResult[];
}

const PLATFORM_LABEL: Record<string, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
  PINTEREST: "Pinterest",
  YOUTUBE: "YouTube",
};

export function publishedEmailHtml(input: PublishedEmailInput): string {
  const when = input.postedAt.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const postedCount = input.results.filter((r) => r.status === "posted").length;
  const total = input.results.length;
  const allOk = postedCount === total;

  const rows = input.results
    .map((r) => {
      const label = PLATFORM_LABEL[r.platform] ?? r.platform;
      const account = r.accountName ? ` · ${escape(r.accountName)}` : "";
      if (r.status === "posted") {
        const link = r.url
          ? `<a href="${escape(r.url)}" style="color:#059669;text-decoration:none;font-weight:600;">View post →</a>`
          : `<span style="color:#059669;font-weight:600;">Posted</span>`;
        return `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:14px;color:#18181b;">
            <strong>${escape(label)}</strong><span style="color:#a1a1aa;">${account}</span>
          </td>
          <td align="right" style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:14px;">${link}</td>
        </tr>`;
      }
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:14px;color:#18181b;">
          <strong>${escape(label)}</strong><span style="color:#a1a1aa;">${account}</span>
        </td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:13px;color:#dc2626;">
          Failed${r.error ? `: ${escape(r.error.slice(0, 80))}` : ""}
        </td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fafafa;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:16px;border:1px solid #e4e4e7;overflow:hidden;">
          <tr><td style="padding:24px 28px 8px 28px;">
            <div style="font-size:13px;color:#a1a1aa;letter-spacing:0.04em;text-transform:uppercase;">Promote · Post published</div>
            <h1 style="margin:8px 0 0 0;font-size:22px;line-height:1.3;color:#18181b;">
              Hi ${escape(input.recipientName ?? "there")}, your post is live ${allOk ? "🎉" : ""}
            </h1>
            <p style="margin:8px 0 0 0;color:#52525b;font-size:14px;">
              Published to <strong>${postedCount} of ${total}</strong> ${total === 1 ? "platform" : "platforms"} on ${escape(when)}.
            </p>
          </td></tr>

          ${
            input.thumbnailUrl
              ? `<tr><td style="padding:16px 28px 0 28px;">
                  <img src="${escape(input.thumbnailUrl)}" alt="" width="504" style="width:100%;border-radius:12px;display:block;border:1px solid #e4e4e7;" />
                </td></tr>`
              : ""
          }

          <tr><td style="padding:16px 28px 0 28px;">
            <div style="font-size:12px;color:#a1a1aa;letter-spacing:0.04em;text-transform:uppercase;">${escape(input.mediaType.toLowerCase())} · Outline</div>
            <p style="margin:4px 0 16px 0;font-size:14px;color:#3f3f46;">${escape(input.outline)}</p>
            <div style="font-size:12px;color:#a1a1aa;letter-spacing:0.04em;text-transform:uppercase;">Caption</div>
            <p style="margin:4px 0 0 0;font-size:14px;color:#18181b;white-space:pre-wrap;">${escape(input.caption)}</p>
          </td></tr>

          <tr><td style="padding:20px 28px 0 28px;">
            <div style="font-size:12px;color:#a1a1aa;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:4px;">Where it went</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table>
          </td></tr>

          <tr><td style="padding:24px 28px;">
            <a href="${escape(input.appUrl)}/posts/${escape(input.postId)}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:999px;">Open in Promote</a>
            <p style="margin:16px 0 0 0;font-size:12px;color:#a1a1aa;">
              Manage all your posts in <a href="${escape(input.appUrl)}/posts" style="color:#a1a1aa;">your dashboard</a>.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
