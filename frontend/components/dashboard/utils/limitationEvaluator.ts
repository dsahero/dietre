import { RestaurantCardData, EventDetails } from '../types';

export interface LimitationEvaluation {
  goodNotes: string[];
  neutralNotes: string[];
  badNotes: string[];
  allNotes: { type: 'good' | 'neutral' | 'bad'; text: string; category: string }[];
}

/**
 * Parses numeric distance in miles from string (e.g. "1.4 miles" -> 1.4)
 */
export function parseDistanceMiles(distanceStr: string): number {
  const match = distanceStr.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Parses numeric budget in dollars from string (e.g. "$120 / guest" -> 120, or "$2400 total" -> 2400/12)
 */
export function parseBudgetPerGuest(budgetStr: string, attendeeCount = 12): number {
  const isOverall = /total|overall/i.test(budgetStr);
  const match = budgetStr.match(/\$?(\d+(?:,\d+)?(?:\.\d+)?)/);
  if (!match) return 120;
  const val = parseFloat(match[1].replace(/,/g, ''));
  return isOverall ? Math.round(val / attendeeCount) : val;
}

/**
 * Dynamically evaluates how well a restaurant meets the current event limitations and parameters.
 * Produces Good, Neutral, and Bad notes based on distance radius, budget constraints,
 * and specific text limitations (curfew, acoustics, allergens, ADA, capacity).
 */
export function evaluateRestaurantLimitations(
  restaurant: RestaurantCardData,
  event: EventDetails,
  attendeeCount = 12
): LimitationEvaluation {
  const goodNotes: string[] = [];
  const neutralNotes: string[] = [];
  const badNotes: string[] = [];
  const allNotes: { type: 'good' | 'neutral' | 'bad'; text: string; category: string }[] = [];

  const limitationsText = (event.limitations || '').toLowerCase();

  // 1. Distance Radius Evaluation
  const maxRadiusMiles = parseDistanceMiles(event.maxDistanceRadius || '5 miles');
  const restaurantMiles = parseDistanceMiles(restaurant.distance);

  if (maxRadiusMiles > 0) {
    if (restaurantMiles <= maxRadiusMiles) {
      const note = `Within radius: ${restaurant.distance} from event location (limit is ${event.maxDistanceRadius})`;
      goodNotes.push(note);
      allNotes.push({ type: 'good', text: note, category: 'Distance' });
    } else {
      const note = `Exceeds distance limit: ${restaurant.distance} is outside your ${event.maxDistanceRadius} max radius`;
      badNotes.push(note);
      allNotes.push({ type: 'bad', text: note, category: 'Distance' });
    }
  }

  // 2. Budget Evaluation
  const maxPerGuest = parseBudgetPerGuest(event.maxBudget || '$120 / guest', attendeeCount);
  const restaurantEstPerGuest =
    restaurant.estimatedCost?.averagePerGuest ||
    parseFloat(restaurant.pricePerPerson.replace(/[^0-9.]/g, '')) ||
    100;

  if (maxPerGuest > 0) {
    if (restaurantEstPerGuest <= maxPerGuest) {
      const diff = maxPerGuest - restaurantEstPerGuest;
      const note = diff > 0
        ? `Under budget: Est. $${restaurantEstPerGuest}/guest ($${diff}/guest buffer under ${event.maxBudget})`
        : `Meets budget limit: Est. $${restaurantEstPerGuest}/guest`;
      goodNotes.push(note);
      allNotes.push({ type: 'good', text: note, category: 'Budget' });
    } else {
      const over = restaurantEstPerGuest - maxPerGuest;
      const note = `Over budget: Est. $${restaurantEstPerGuest}/guest exceeds max budget by +$${over}/guest`;
      badNotes.push(note);
      allNotes.push({ type: 'bad', text: note, category: 'Budget' });
    }
  }

  // 3. Acoustic / Curfew Limitations
  if (limitationsText.includes('curfew') || limitationsText.includes('sound') || limitationsText.includes('acoustic')) {
    if (restaurant.id === 'osteria-del-sole') {
      const note = 'Complies with sound curfew: Firm 10:30 PM acoustic limiter on private salon';
      goodNotes.push(note);
      allNotes.push({ type: 'good', text: note, category: 'Acoustics' });
    } else if (restaurant.id === 'kuroshio-robata') {
      const note = 'Acoustic caution: Open robata izakaya environment lacks decibel isolation limiter';
      badNotes.push(note);
      allNotes.push({ type: 'bad', text: note, category: 'Acoustics' });
    } else if (restaurant.id === 'saffron-silk-pavilion') {
      const note = 'Acoustic zoning: Private 2nd-floor pavilion is fully isolated with zero sound spill';
      goodNotes.push(note);
      allNotes.push({ type: 'good', text: note, category: 'Acoustics' });
    } else if (restaurant.id === 'brass-botanist') {
      const note = 'Patio curfew note: Conservatory glass roof requires reduced volume after 10:00 PM';
      neutralNotes.push(note);
      allNotes.push({ type: 'neutral', text: note, category: 'Acoustics' });
    }
  }

  // 4. ADA Wheelchair Accessibility
  if (limitationsText.includes('wheelchair') || limitationsText.includes('ada') || limitationsText.includes('access')) {
    if (restaurant.id === 'kuroshio-robata') {
      const note = 'Accessibility challenge: 3-step front staircase requires portable ramp coordination';
      badNotes.push(note);
      allNotes.push({ type: 'bad', text: note, category: 'Accessibility' });
    } else {
      const note = 'Full ADA compliance: Ground-level or direct elevator entry with zero step barriers';
      goodNotes.push(note);
      allNotes.push({ type: 'good', text: note, category: 'Accessibility' });
    }
  }

  // 5. Gluten-Free / Celiac Limitation
  if (limitationsText.includes('gluten') || limitationsText.includes('celiac')) {
    if (restaurant.id === 'brass-botanist') {
      const note = 'Strict GF compliance: Dedicated scratch kitchen prep line with certified zero cross-contact';
      goodNotes.push(note);
      allNotes.push({ type: 'good', text: note, category: 'Dietary Restriction' });
    } else if (restaurant.id === 'osteria-del-sole') {
      const note = 'Dedicated GF water bath for artisanal gluten-free pasta courses';
      goodNotes.push(note);
      allNotes.push({ type: 'good', text: note, category: 'Dietary Restriction' });
    } else if (restaurant.id === 'saffron-silk-pavilion') {
      const note = 'GF flatbreads sourced from certified gluten-free bakery in sealed oven-safe wraps';
      neutralNotes.push(note);
      allNotes.push({ type: 'neutral', text: note, category: 'Dietary Restriction' });
    } else if (restaurant.id === 'kuroshio-robata') {
      const note = 'Gluten caution: Tamari available, but shared deep fryer used for tempura crunch';
      badNotes.push(note);
      allNotes.push({ type: 'bad', text: note, category: 'Dietary Restriction' });
    }
  }

  // 6. Vegan / Vegetarian Requirement in Limitations
  if (limitationsText.includes('vegan') || limitationsText.includes('vegetarian')) {
    if (restaurant.id === 'brass-botanist' || restaurant.id === 'saffron-silk-pavilion') {
      const note = 'Comprehensive plant-based menu fully satisfies all vegan and vegetarian attendees';
      goodNotes.push(note);
      allNotes.push({ type: 'good', text: note, category: 'Dietary Restriction' });
    } else if (restaurant.id === 'osteria-del-sole') {
      const note = 'Fresh seasonal vegetable courses & eggless semolina pasta available';
      goodNotes.push(note);
      allNotes.push({ type: 'good', text: note, category: 'Dietary Restriction' });
    }
  }

  // 7. Capacity Limitation (e.g. "45 seated", "50 seated")
  const capMatch = limitationsText.match(/(\d+)\s*(?:seated|guests|people|capacity)/);
  if (capMatch) {
    const requiredCap = parseInt(capMatch[1], 10);
    const restCap = parseInt(restaurant.capacity.replace(/[^0-9]/g, ''), 10) || 60;
    if (restCap >= requiredCap) {
      const note = `Meets seating limitation: Accommodates ${restaurant.capacity} (requires ${requiredCap})`;
      goodNotes.push(note);
      allNotes.push({ type: 'good', text: note, category: 'Capacity' });
    } else {
      const note = `Capacity shortfall: Venue holds ${restaurant.capacity}, below required ${requiredCap}`;
      badNotes.push(note);
      allNotes.push({ type: 'bad', text: note, category: 'Capacity' });
    }
  }

  return {
    goodNotes,
    neutralNotes,
    badNotes,
    allNotes,
  };
}
