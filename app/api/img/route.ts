import { NextRequest, NextResponse } from 'next/server';

interface TrackingParams {
  recipientName?: string;
  recipientEmail?: string;
  subject?: string;
  campaign?: string;
  customId?: string;
  test?: string;
}

interface PostHogEvent {
  api_key: string;
  event: string;
  distinct_id: string;
  properties: Record<string, any>;
}

interface PostHogIdentify {
  api_key: string;
  distinct_id: string;
  properties: Record<string, any>;
}

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const params: TrackingParams = {
      recipientName: searchParams.get('recipientName') || undefined,
      recipientEmail: searchParams.get('recipientEmail') || undefined,
      subject: searchParams.get('subject') || undefined,
      campaign: searchParams.get('campaign') || undefined,
      customId: searchParams.get('id') || undefined,
      test: searchParams.get('test') || undefined,
    };

    // Extract headers for additional information
    const userAgent = request.headers.get('user-agent') || '';
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const referer = request.headers.get('referer') || '';
    
    // Return pixel without sending to PostHog if userAgent matches MailMate (fuzzy match) and not a test (for /api/img endpoint)
    if (!params.test && /mailmate/i.test(userAgent)) {
      const pixelData = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      return new NextResponse(pixelData, {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Generate a unique tracking ID if not provided
    const trackingId = params.customId || `email-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    // Determine email client from user agent
    let emailClient = 'unknown';
    if (userAgent.includes('Thunderbird')) {
      emailClient = 'Thunderbird';
    } else if (userAgent.includes('Outlook')) {
      emailClient = 'Outlook';
    } else if (referer.includes('mail.google.com')) {
      emailClient = 'Gmail';
    } else if (userAgent.includes('Apple-Mail')) {
      emailClient = 'Apple Mail';
    } else if (userAgent.includes('MailMate')) {
      emailClient = 'MailMate';
    }

    // Use recipient email as distinct_id for PostHog, fallback to tracking ID
    const distinctId = params.recipientEmail || trackingId;
    
    // Prepare PostHog event data
    const eventData: PostHogEvent = {
      api_key: process.env.POSTHOG_API_KEY!,
      event: 'Email Opened',
      distinct_id: distinctId,
      properties: {
        // Email-specific properties
        emailId: trackingId,
        recipientName: params.recipientName,
        recipientEmail: params.recipientEmail,
        subject: params.subject,
        campaign: params.campaign || 'general',
        
        // Technical properties
        emailClient,
        userAgent,
        ipAddress,
        referer,
        timestamp: new Date().toISOString(),
        
        // Event metadata
        eventSource: 'email_pixel',
        eventType: 'email_open',
        test: params.test || undefined,
      },
    };

    // Prepare PostHog identify data (if we have recipient email)
    let identifyData: PostHogIdentify | null = null;
    if (params.recipientEmail) {
      identifyData = {
        api_key: process.env.POSTHOG_API_KEY!,
        distinct_id: params.recipientEmail,
        properties: {
          name: params.recipientName,
          email: params.recipientEmail,
          lastEmailOpen: new Date().toISOString(),
          emailClient,
          totalEmailOpens: 1, // PostHog will increment this automatically
        },
      };
    }

    // Send data to PostHog
    const postHogPromises: Promise<Response>[] = [];

    // Send the event
    postHogPromises.push(
      fetch('https://app.posthog.com/capture/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      })
    );

    // Send identify call if we have recipient email
    if (identifyData) {
      postHogPromises.push(
        fetch('https://app.posthog.com/identify/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(identifyData),
        })
      );
    }

    // Wait for all PostHog calls to complete
    const responses = await Promise.allSettled(postHogPromises);
    
    // Log any errors (but don't fail the request)
    responses.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`PostHog API call ${index} failed:`, result.reason);
      } else if (!result.value.ok) {
        console.error(`PostHog API call ${index} returned error:`, result.value.status);
      }
    });

    // Return a transparent 1x1 GIF pixel for /api/img
    const pixelData = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    
    return new NextResponse(pixelData, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error in tracking pixel handler:', error);
    
    // Still return the pixel even if tracking fails
    const pixelData = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    
    return new NextResponse(pixelData, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
} 