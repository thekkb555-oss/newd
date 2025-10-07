import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json();

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

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
        isLive: false,
      });
    }

    return NextResponse.json({
      isValid: true,
      title: 'YouTube Video',
      author: 'Unknown',
      isLive: true,
    });

  } catch (error) {
    console.error('Check video error:', error);
    return NextResponse.json({
      isValid: true,
      title: 'YouTube Video',
      author: 'Unknown',
      isLive: true,
    });
  }
}
