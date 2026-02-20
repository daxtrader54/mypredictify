'use client';

import { useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';

const TOUR_KEY_PREFIX = 'mypredictify:tour';

interface TourStep {
  element: string;
  popover: { title: string; description: string };
}

const DASHBOARD_STEPS: TourStep[] = [
  {
    element: '[data-tour="welcome-card"]',
    popover: {
      title: 'Your Dashboard',
      description: 'Credits, plan, daily bonus, and this week\'s predictions at a glance.',
    },
  },
  {
    element: '[data-tour="sidebar-credits"]',
    popover: {
      title: 'Credits & Tier',
      description: 'Your credit balance and subscription tier. Free users get 100 credits + 10 daily.',
    },
  },
  {
    element: '[data-tour="sidebar-nav"]',
    popover: {
      title: 'Navigation',
      description: 'Access Predictions, Results, Value Bets, ACCA Builder, and Today\'s fixtures.',
    },
  },
  {
    element: '[data-tour="upcoming-fixtures"]',
    popover: {
      title: 'Upcoming Fixtures',
      description: 'This week\'s matches. Tap the lock icon to reveal AI-predicted scores.',
    },
  },
  {
    element: '[data-tour="league-standings"]',
    popover: {
      title: 'Live Standings',
      description: 'League tables updated daily — switch between all 5 leagues.',
    },
  },
  {
    element: '[data-tour="accuracy-tracker"]',
    popover: {
      title: 'Prediction Accuracy',
      description: 'Season-long model performance — result accuracy, exact scores, and per-gameweek breakdown.',
    },
  },
];

const PREDICTIONS_STEPS: TourStep[] = [
  {
    element: '[data-tour="predictions-filter"]',
    popover: {
      title: 'Filter & Navigate',
      description: 'Switch leagues, navigate gameweeks, and toggle completed matches.',
    },
  },
  {
    element: '[data-tour="predictions-grid"]',
    popover: {
      title: 'Prediction Cards',
      description: 'Each card shows a fixture with AI probabilities, predicted score, and confidence level.',
    },
  },
  {
    element: '[data-tour="sidebar-leagues"]',
    popover: {
      title: 'League Quick Access',
      description: 'Jump straight to predictions for any of our 5 supported European leagues.',
    },
  },
];

const FALLBACK_STEPS: TourStep[] = [
  {
    element: '[data-tour="sidebar-nav"]',
    popover: {
      title: 'Navigation',
      description: 'Explore Predictions, Results, Value Bets, ACCA Builder, and Today\'s fixtures.',
    },
  },
  {
    element: '[data-tour="sidebar-credits"]',
    popover: {
      title: 'Credits & Tier',
      description: 'Your credit balance and subscription tier. Claim daily bonus credits here.',
    },
  },
  {
    element: '[data-tour="sidebar-leagues"]',
    popover: {
      title: 'League Quick Access',
      description: 'Jump straight to predictions for any of our 5 supported European leagues.',
    },
  },
];

function getStepsForPath(pathname: string): TourStep[] {
  if (pathname === '/dashboard') return DASHBOARD_STEPS;
  if (pathname === '/predictions' || pathname.startsWith('/predictions')) return PREDICTIONS_STEPS;
  return FALLBACK_STEPS;
}

function getTourKey(pathname: string): string {
  if (pathname === '/dashboard') return `${TOUR_KEY_PREFIX}:dashboard`;
  if (pathname === '/predictions' || pathname.startsWith('/predictions')) return `${TOUR_KEY_PREFIX}:predictions`;
  return `${TOUR_KEY_PREFIX}:general`;
}

export function useTour() {
  const pathname = usePathname();

  const [hasCompleted, setHasCompleted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(getTourKey(pathname)) === 'true';
  });

  const startTour = useCallback(async () => {
    const { driver } = await import('driver.js');
    const steps = getStepsForPath(pathname);

    // Filter to only steps whose elements exist on the page
    const availableSteps = steps.filter(
      (s) => document.querySelector(s.element)
    );

    if (availableSteps.length === 0) return;

    const key = getTourKey(pathname);

    const driverObj = driver({
      showProgress: true,
      animate: true,
      popoverClass: 'mypredictify-tour-popover',
      steps: availableSteps,
      onDestroyStarted: () => {
        driverObj.destroy();
        localStorage.setItem(key, 'true');
        setHasCompleted(true);
      },
    });

    driverObj.drive();
  }, [pathname]);

  return { startTour, hasCompletedTour: hasCompleted };
}
