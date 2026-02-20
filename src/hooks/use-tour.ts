'use client';

import { useCallback, useState } from 'react';

const TOUR_KEY = 'mypredictify:tour-completed';

const TOUR_STEPS = [
  {
    element: '[data-tour="welcome-card"]',
    popover: {
      title: 'Your Dashboard',
      description: 'This is your dashboard overview — credits, plan, daily bonus, and this week\'s predictions at a glance.',
    },
  },
  {
    element: '[data-tour="sidebar-credits"]',
    popover: {
      title: 'Credits & Tier',
      description: 'Track your credit balance and current subscription tier here. Free users get 100 credits + 10 daily.',
    },
  },
  {
    element: '[data-tour="sidebar-nav"]',
    popover: {
      title: 'Navigation',
      description: 'Access Predictions, Results, Value Bets, ACCA Builder, and Today\'s fixtures from the sidebar.',
    },
  },
  {
    element: '[data-tour="sidebar-leagues"]',
    popover: {
      title: 'League Quick Access',
      description: 'Jump straight to predictions for any of our 5 supported European leagues.',
    },
  },
  {
    element: '[data-tour="upcoming-fixtures"]',
    popover: {
      title: 'Upcoming Fixtures',
      description: 'See this week\'s matches with our AI-predicted scores before kick-off.',
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
      description: 'Track how our model performs — result accuracy, exact scores, and per-gameweek breakdowns.',
    },
  },
];

export function useTour() {
  const [hasCompleted, setHasCompleted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(TOUR_KEY) === 'true';
  });

  const startTour = useCallback(async () => {
    const { driver } = await import('driver.js');

    const driverObj = driver({
      showProgress: true,
      animate: true,
      popoverClass: 'mypredictify-tour-popover',
      steps: TOUR_STEPS,
      onDestroyStarted: () => {
        driverObj.destroy();
        localStorage.setItem(TOUR_KEY, 'true');
        setHasCompleted(true);
      },
    });

    driverObj.drive();
  }, []);

  return { startTour, hasCompletedTour: hasCompleted };
}
