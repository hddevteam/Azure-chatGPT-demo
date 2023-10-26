export function formatTime(createdAt) {
    const now = new Date();
    const createdAtDate = new Date(createdAt);
    const diff = now - createdAtDate;
    const diffMinutes = Math.floor(diff / 1000 / 60);
    const diffHours = Math.floor(diff / 1000 / 60 / 60);
    const diffDays = Math.floor(diff / 1000 / 60 / 60 / 24);
    const diffWeeks = Math.floor(diff / 1000 / 60 / 60 / 24 / 7);
    const diffMonths = Math.floor(diff / 1000 / 60 / 60 / 24 / 30);
    const diffYears = Math.floor(diff / 1000 / 60 / 60 / 24 / 365);
    if (diffMinutes < 5) {
        return "just now";
    } else if (diffHours < 1) {
        return `${diffMinutes} minutes ago`;
    } else if (diffDays < 1) {
        return `${diffHours} hours ago`;
    } else if (diffWeeks < 1) {
        return `${diffDays} days ago`;
    } else if (diffMonths < 1) {
        return `${diffWeeks} weeks ago`;
    } else if (diffYears < 1) {
        return `${diffMonths} months ago`;
    } else {
        return `${diffYears} years ago`;
    }
}