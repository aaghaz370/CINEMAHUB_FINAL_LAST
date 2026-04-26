import { NextResponse } from 'next/server';
import { getDemoUI } from './ui';

export async function GET(request: Request) {
  return new NextResponse(getDemoUI(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
