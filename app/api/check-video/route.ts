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
    try {
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
    } catch (oembedError) {
      console.log('oEmbed failed, checking if live:', oembedError);
    }

    // If oEmbed fails, assume it might be a live stream
    // Try to fetch the YouTube page
    try {
      const youtubePageResponse = await fetch(
        `https://www.youtube.com/watch?v=${videoId}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

      // Check if video exists at all
      const videoExists = !pageText.includes('Video unavailable') && 
                         !pageText.includes('"status":"ERROR"');

      if (!videoExists) {
        return NextResponse.json({
          isValid: false,
          error: 'Video not found or unavailable'
        });
      }

      // Check if video is live
      const isLive = pageText.includes('"isLiveContent":true') || 
                     pageText.includes('BADGE_STYLE_TYPE_LIVE_NOW') ||
                     pageText.includes('"isLiveBroadcast":true');

      // Extract title and author from page (with better regex)
      let title = 'YouTube Video';
      let author = 'Unknown';

      const titleMatch = pageText.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        title = titleMatch[1].replace(' - YouTube', '').trim();
      } else {
        const jsonTitleMatch = pageText.match(/"title":\{"runs":\[\{"text":"([^"]+)"\}\]/);
        if (jsonTitleMatch) title = jsonTitleMatch[1];
      }

      const authorMatch = pageText.match(/"author":"([^"]+)"/);
      if (authorMatch) author = authorMatch[1];

      return NextResponse.json({
        isValid: true,
        title: title,
        author: author,
        isLive: isLive,
      });

    } catch (pageError) {
      console.error('Page fetch error:', pageError);
      // If we can't check, assume it's valid and might be live
      return NextResponse.json({
        isValid: true,
        title: 'YouTube Video',
        author: 'Unknown',
        isLive: true, // Assume live if we can't verify
      });
    }

  } catch (error) {
    console.error('Check video error:', error);
    return NextResponse.json({
      isValid: false,
      error: 'Failed to check video status'
    });
  }
}