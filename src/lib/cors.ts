// CORS helper for API routes
// Apply to all routes that need CORS support

import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://mrapple-tech-transfers.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

function getOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  return null;
}

export function corsHeaders(request: NextRequest): HeadersInit {
  const origin = getOrigin(request);

  return {
    'Access-Control-Allow-Origin': origin || '',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
    'Vary': 'Origin',
  };
}

export function handleCorsOptions(request: NextRequest): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export function addCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const headers = corsHeaders(request);
  Object.entries(headers).forEach(([key, value]) => {
    if (value) response.headers.set(key, value);
  });
  return response;
}
