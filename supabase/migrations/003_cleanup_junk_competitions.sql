-- Remove cached listicles, Q&A threads, and obvious junk from competitions table.
-- Safe to run multiple times.

DELETE FROM competitions
WHERE
  name ~* '^\d+\s+.*competitions?'
  OR name ~* 'competitions for (high school|students|schools)'
  OR name ~* '\?\s*[-–—]'
  OR name ~* '^(is there|how (do|can|to)|what are (some|the best))'
  OR link ILIKE '%careervillage%'
  OR link ILIKE '%reddit.com%'
  OR link ILIKE '%quora.com%'
  OR link ILIKE '%stackexchange%'
  OR link ILIKE '%stackoverflow%'
  OR details ~* '\btypical dates\b.*\bwhat it''s for\b'
  OR (source = 'web' AND (time IS NULL OR time = '') AND name !~* '(usaco|mathcounts|science olympiad|first robotics|technovation|cyberpatriot|science bowl|deca|hosa|fbla|amc|aime)');
