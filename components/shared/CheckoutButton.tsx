"use client";

import { IEvent } from '@/lib/database/models/event.model';
import { SignedIn, SignedOut, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import React from 'react';
import { Button } from '../ui/button';
import Checkout from './Checkout';

const CheckoutButton = ({ event }: { event: IEvent }) => {
  const { user } = useUser();
  const sub = user?.id; // 'sub' is a string or undefined
  const hasEventFinished = new Date(event.endDateTime) < new Date();

  return (
    <div className="flex items-center gap-3">
      {hasEventFinished ? (
        <p className="p-2 text-red-400">Sorry, tickets are no longer available.</p>
      ) : (
        <>
          <SignedOut>
            <Button asChild className="button rounded-full" size="lg">
              <Link href="/sign-in">
                Get Tickets
              </Link>
            </Button>
          </SignedOut>

          <SignedIn>
            {/* Only render Checkout if 'sub' is defined */}
            {sub ? (
              <Checkout event={event} sub={sub} />
            ) : (
              <p>Loading...</p> // Fallback UI while 'sub' is undefined
            )}
          </SignedIn>
        </>
      )}
    </div>
  );
};

export default CheckoutButton;