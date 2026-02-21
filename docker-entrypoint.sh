#!/bin/sh
# If /app/data is an empty volume mount, seed it from the built-in copy
if [ -d /app/data-seed ] && [ ! -f /app/data/.seeded ]; then
  echo "Seeding /app/data from built-in data..."
  cp -rn /app/data-seed/* /app/data/ 2>/dev/null || true
  touch /app/data/.seeded
  echo "Data seeded successfully."
fi

exec "$@"
