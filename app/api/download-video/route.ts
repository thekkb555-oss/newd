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

    const downloadUrl = `https://www.youtube.com/watch?v=${videoId}`;

    return NextResponse.json({
      success: true,
      downloadUrl,
      message: 'Use a YouTube downloader service with this URL',
      videoId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process download request' },
      { status: 500 }
    );
  }
}
