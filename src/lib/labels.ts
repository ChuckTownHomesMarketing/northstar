export const LEAD_SOURCES = [
  { value: "META", label: "Meta" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "ZILLOW", label: "Zillow" },
  { value: "REALTOR", label: "Realtor.com" },
  { value: "REFERRAL", label: "Referral" },
  { value: "ORGANIC", label: "Organic" },
  { value: "OTHER", label: "Other" },
] as const;

export type LeadSourceValue = (typeof LEAD_SOURCES)[number]["value"];

export function sourceLabel(source: string, detail = ""): string {
  const known = LEAD_SOURCES.find((item) => item.value === source);
  const base = known?.label ?? source;
  if (source === "OTHER" && detail.trim()) return `${base}: ${detail.trim()}`;
  if (detail.trim()) return `${base} (${detail.trim()})`;
  return base;
}

export const CONTENT_CHANNELS = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "EMAIL", label: "Email" },
  { value: "BLOG", label: "Blog" },
  { value: "GOOGLE_BUSINESS", label: "Google Business" },
  { value: "OTHER", label: "Other" },
] as const;

export const CONTENT_TYPES = [
  { value: "POST", label: "Post" },
  { value: "REEL", label: "Reel" },
  { value: "STORY", label: "Story" },
  { value: "BLOG_POST", label: "Blog post" },
  { value: "EMAIL_BLAST", label: "Email" },
  { value: "AD_CREATIVE", label: "Ad creative" },
  { value: "VIDEO", label: "Video" },
  { value: "LISTING", label: "Listing" },
  { value: "OTHER", label: "Other" },
] as const;

export const CONTENT_STATUSES = [
  { value: "IDEA", label: "Idea" },
  { value: "DRAFTING", label: "Drafting" },
  { value: "REVIEW", label: "Review" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "POSTED", label: "Posted" },
] as const;

export const TASK_STATUSES = [
  { value: "TODO", label: "To do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "DONE", label: "Done" },
] as const;

export const TASK_PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
] as const;

export function labelFor(options: readonly { value: string; label: string }[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export const WEEKDAYS = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "7", label: "Sunday" },
] as const;
