import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json();
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required', isValid: false },
        { status: 400 }
      );
    }

    // First, try to get video info using oEmbed (works for VODs and ended streams)
    const oembedResponse = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
        }
      }
    );

    if (oembedResponse.ok) {
      const data = await oembedResponse.json();
      return NextResponse.json({
        isValid: true,
        title: data.title,
        author: data.author_name,
        isLive: false, // oEmbed success means video is available (not live or ended)
      });
    }

    // If oEmbed fails, try to check if it's a live stream
    const youtubePageResponse = await fetch(
      `https://www.youtube.com/watch?v=${videoId}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    if (!youtubePageResponse.ok) {
      return NextResponse.json({
        isValid: false,
        error: 'Video not found'
      });
    }

    const pageText = await youtubePageResponse.text();

    // Check if video is live
    const isLive = pageText.includes('"isLiveContent":true') || 
                   pageText.includes('BADGE_STYLE_TYPE_LIVE_NOW') ||
                   pageText.includes('"label":"LIVE"');

    // Extract title and author from page
    const titleMatch = pageText.match(/"title":"([^"]+)"/);
    const authorMatch = pageText.match(/"author":"([^"]+)"/);

    if (isLive) {
      return NextResponse.json({
        isValid: true,
        title: titleMatch ? titleMatch[1] : 'YouTube Live Stream',
        author: authorMatch ? authorMatch[1] : 'Unknown',
        isLive: true,
      });
    }

    // Video exists but is not live and oEmbed failed - might be processing
    return NextResponse.json({
      isValid: true,
      title: titleMatch ? titleMatch[1] : 'YouTube Video',
      author: authorMatch ? authorMatch[1] : 'Unknown',
      isLive: false,
    });

  } catch (error) {
    console.error('Check video error:', error);
    return NextResponse.json({
      isValid: false,
      error: 'Failed to check video status'
    });
  }
}