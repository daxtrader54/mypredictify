// SportMonks API v3 Types

export interface SportMonksResponse<T> {
  data: T;
  pagination?: Pagination;
  subscription: Subscription[];
  rate_limit: RateLimit;
  timezone: string;
}

export interface Pagination {
  count: number;
  per_page: number;
  current_page: number;
  next_page: string | null;
  has_more: boolean;
}

export interface Subscription {
  meta: {
    trial_ends_at: string | null;
    ends_at: string | null;
    current_timestamp: number;
  };
  plans: Plan[];
  add_ons: unknown[];
  widgets: unknown[];
}

export interface Plan {
  plan: string;
  sport: string;
  category: string;
}

export interface RateLimit {
  resets_in_seconds: number;
  remaining: number;
  requested_entity: string;
}

// Core Entities

export interface Fixture {
  id: number;
  sport_id: number;
  league_id: number;
  season_id: number;
  stage_id: number;
  group_id: number | null;
  aggregate_id: number | null;
  round_id: number | null;
  state_id: number;
  venue_id: number | null;
  name: string;
  starting_at: string;
  result_info: string | null;
  leg: string;
  details: string | null;
  length: number;
  placeholder: boolean;
  has_odds: boolean;
  has_premium_odds: boolean;
  starting_at_timestamp: number;
  // Includes
  participants?: Team[];
  scores?: Score[];
  league?: League;
  venue?: Venue;
  state?: State;
  statistics?: FixtureStatistic[];
  events?: Event[];
  lineups?: Lineup[];
  odds?: Odd[];
  predictions?: Prediction[];
}

export interface Team {
  id: number;
  sport_id: number;
  country_id: number;
  venue_id: number | null;
  gender: string;
  name: string;
  short_code: string;
  image_path: string;
  founded: number | null;
  type: string;
  placeholder: boolean;
  last_played_at: string;
  meta?: {
    location: 'home' | 'away';
    winner: boolean | null;
    position: number | null;
  };
}

export interface Score {
  id: number;
  fixture_id: number;
  type_id: number;
  participant_id: number;
  score: {
    goals: number;
    participant: 'home' | 'away';
  };
  description: string;
}

export interface League {
  id: number;
  sport_id: number;
  country_id: number;
  name: string;
  active: boolean;
  short_code: string;
  image_path: string;
  type: string;
  sub_type: string;
  last_played_at: string;
  category: number;
  has_jerseys: boolean;
}

export interface Venue {
  id: number;
  country_id: number;
  city_id: number;
  name: string;
  address: string | null;
  zipcode: string | null;
  latitude: string | null;
  longitude: string | null;
  capacity: number | null;
  image_path: string | null;
  city_name: string | null;
  surface: string | null;
  national_team: boolean;
}

export interface State {
  id: number;
  state: string;
  name: string;
  short_name: string;
  developer_name: string;
}

export interface FixtureStatistic {
  id: number;
  fixture_id: number;
  type_id: number;
  participant_id: number;
  data: {
    value: number | string;
  };
  location: string;
  type?: StatisticType;
}

export interface StatisticType {
  id: number;
  name: string;
  code: string;
  developer_name: string;
  model_type: string;
  stat_group: string;
}

export interface Event {
  id: number;
  fixture_id: number;
  period_id: number;
  participant_id: number;
  type_id: number;
  section: string;
  player_id: number | null;
  related_player_id: number | null;
  player_name: string | null;
  related_player_name: string | null;
  result: string | null;
  info: string | null;
  addition: string | null;
  minute: number;
  extra_minute: number | null;
  injured: boolean | null;
  on_bench: boolean;
  coach_id: number | null;
  sub_type_id: number | null;
}

export interface Lineup {
  id: number;
  sport_id: number;
  fixture_id: number;
  player_id: number;
  team_id: number;
  position_id: number;
  formation_field: string | null;
  type_id: number;
  jersey_number: number;
  player?: Player;
}

export interface Player {
  id: number;
  sport_id: number;
  country_id: number;
  nationality_id: number;
  city_id: number | null;
  position_id: number;
  detailed_position_id: number | null;
  type_id: number;
  common_name: string;
  firstname: string;
  lastname: string;
  name: string;
  display_name: string;
  image_path: string;
  height: number | null;
  weight: number | null;
  date_of_birth: string;
  gender: string;
}

// Predictions

export interface Prediction {
  id: number;
  fixture_id: number;
  predictions: PredictionData;
  type_id: number;
  type?: PredictionType;
  fixture?: Fixture;
}

export interface PredictionData {
  yes?: number;
  no?: number;
  home?: number;
  away?: number;
  draw?: number;
  over?: number;
  under?: number;
}

export interface PredictionType {
  id: number;
  name: string;
  code: string;
  developer_name: string;
  model_type: string;
}

export interface Probability {
  id: number;
  fixture_id: number;
  type_id: number;
  predictions: ProbabilityPredictions;
  type?: PredictionType;
  fixture?: Fixture;
}

export interface ProbabilityPredictions {
  home: number;
  away: number;
  draw: number;
}

export interface ValueBet {
  id: number;
  fixture_id: number;
  predictions: ValueBetPredictions;
  type_id: number;
  type?: PredictionType;
  fixture?: Fixture;
}

export interface ValueBetPredictions {
  bet: string;
  bookmaker: string;
  odd: number;
  is_value: boolean;
  stake: number;
  fair_odd: number;
}

// Odds

export interface Odd {
  id: number;
  fixture_id: number;
  market_id: number;
  bookmaker_id: number;
  label: string;
  value: string;
  name: string | null;
  sort_order: number | null;
  market_description: string | null;
  probability: string | null;
  dp3: string;
  fractional: string | null;
  american: string | null;
  winning: boolean | null;
  stopped: boolean;
  total: string | null;
  handicap: string | null;
  participants: string | null;
  created_at: string;
  original_label: string | null;
  latest_bookmaker_update: string;
  market?: Market;
  bookmaker?: Bookmaker;
}

export interface Market {
  id: number;
  legacy_id: number | null;
  name: string;
  developer_name: string;
  has_winning_calculations: boolean;
}

export interface Bookmaker {
  id: number;
  legacy_id: number | null;
  name: string;
}

// Standings

export interface Standing {
  id: number;
  participant_id: number;
  sport_id: number;
  league_id: number;
  season_id: number;
  stage_id: number;
  group_id: number | null;
  round_id: number | null;
  standing_rule_id: number;
  position: number;
  result: string | null;
  points: number;
  participant?: Team;
  details?: StandingDetail[];
}

export interface StandingDetail {
  id: number;
  standing_id: number;
  standing_type_id: number;
  value: number;
  type?: StandingType;
}

export interface StandingType {
  id: number;
  name: string;
  code: string;
  developer_name: string;
  model_type: string;
}

// Seasons

export interface Season {
  id: number;
  sport_id: number;
  league_id: number;
  tie_breaker_rule_id: number;
  name: string;
  finished: boolean;
  pending: boolean;
  is_current: boolean;
  starting_at: string;
  ending_at: string;
  standings_recalculated_at: string;
  games_in_current_week: boolean;
}

// Query parameters

export interface FixturesQueryParams {
  [key: string]: string | number | undefined;
  include?: string;
  filters?: string;
  select?: string;
  per_page?: number;
  page?: number;
}

export interface PredictionsQueryParams {
  [key: string]: string | number | undefined;
  include?: string;
  filters?: string;
  per_page?: number;
  page?: number;
}

// Processed types for the app

export interface ProcessedFixture {
  id: number;
  leagueId: number;
  leagueName: string;
  homeTeam: ProcessedTeam;
  awayTeam: ProcessedTeam;
  startTime: Date;
  status: 'upcoming' | 'live' | 'finished' | 'postponed';
  score?: {
    home: number;
    away: number;
  };
  venue?: string;
  predictions?: ProcessedPrediction;
  odds?: ProcessedOdds;
}

export interface ProcessedTeam {
  id: number;
  name: string;
  shortCode: string;
  logo: string;
}

export interface ProcessedPrediction {
  homeWin: number;
  draw: number;
  awayWin: number;
  predictedScore?: string;
  btts?: { yes: number; no: number };
  overUnder?: { over: number; under: number; line: number };
  advice?: string;
  confidence: number;
  explanation?: string;
  modelComponents?: {
    elo?: { H: number; D: number; A: number };
    poisson?: { H: number; D: number; A: number };
    odds?: { H: number; D: number; A: number } | null;
  };
}

export interface ProcessedOdds {
  homeWin: number;
  draw: number;
  awayWin: number;
  bookmaker: string;
}

export interface ProcessedValueBet {
  fixtureId: number;
  fixture: ProcessedFixture;
  bet: string;
  bookmaker: string;
  currentOdd: number;
  fairOdd: number;
  value: number; // percentage value
  recommendedStake: number;
}
