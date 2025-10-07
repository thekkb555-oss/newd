import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let videoId: string;
    try {
      const body = await request.json();
      videoId = body.videoId;
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body', isValid: false },
        { status: 400 }
      );
    }
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required', isValid: false },
        { status: 400 }
      );
    }

    console.log('Checking video:', videoId);

    // Method 1: Try oEmbed API (works for regular videos and ended streams)
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      console.log('Trying oEmbed:', oembedUrl);
      
      const oembedResponse = await fetch(oembedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
        }
      });

      console.log('oEmbed response status:', oembedResponse.status);

      if (oembedResponse.ok) {
        const data = await oembedResponse.json();
        console.log('oEmbed success - video is available (not live)');
        return NextResponse.json({
          isValid: true,
          title: data.title,
          author: data.author_name,
          isLive: false,
        });
      }
    } catch (oembedError) {
      console.log('oEmbed failed:', oembedError);
    }

    // Method 2: If oEmbed fails, try to check YouTube page directly
    try {
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      console.log('Fetching YouTube page:', youtubeUrl);
      
      const youtubePageResponse = await fetch(youtubeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      });

      console.log('YouTube page response status:', youtubePageResponse.status);

      if (!youtubePageResponse.ok) {
        console.error('YouTube page fetch failed with status:', youtubePageResponse.status);
        return NextResponse.json({
          isValid: false,
          error: 'Video not found'
        });
      }

      const pageText = await youtubePageResponse.text();
      console.log('Page text length:', pageText.length);

      // Check if video exists
      if (pageText.includes('Video unavailable') || pageText.includes('"status":"ERROR"')) {
        console.log('Video unavailable detected');
        return NextResponse.json({
          isValid: false,
          error: 'Video not found or unavailable'
        });
      }

      // Check if video is live
      const isLive = pageText.includes('"isLiveContent":true') || 
                     pageText.includes('BADGE_STYLE_TYPE_LIVE_NOW') ||
                     pageText.includes('"isLiveBroadcast":true') ||
                     pageText.includes('"isLive":true');

      console.log('Is live:', isLive);

      // Extract title
      let title = 'YouTube Video';
      const titleMatch = pageText.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        title = titleMatch[1].replace(' - YouTube', '').trim();
      }

      // Extract author
      let author = 'Unknown';
      const authorMatch = pageText.match(/"author":"([^"]+)"/);
      if (authorMatch) {
        author = authorMatch[1];
      }

      console.log('Title:', title, 'Author:', author);

      return NextResponse.json({
        isValid: true,
        title: title,
        author: author,
        isLive: isLive,
      });

    } catch (pageError) {
      console.error('Page fetch error:', pageError);
      
      // Last fallback - assume video might be live
      return NextResponse.json({
        isValid: true,
        title: 'YouTube Video',
        author: 'Unknown',
        isLive: true,
      });
    }

  } catch (error) {
    console.error('Unexpected error in check-video:', error);
    return NextResponse.json({
      isValid: false,
      error: `Failed to check video status: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}