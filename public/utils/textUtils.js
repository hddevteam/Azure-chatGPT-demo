export const generateExcerpt = (content, start, middle, end) => {
    const contentLength = content.length;
    if (contentLength <= (start + middle + end)) {
        // Content is short enough, no need to trim
        return content;
    }
    
    const startText = content.slice(0, start);
    const middleText = content.slice((contentLength / 2) - (middle / 2), (contentLength / 2) + (middle / 2));
    const endText = content.slice(-end);

    return `${startText}...${middleText}...${endText}`;
};