-- Staff who were created without a PracticeMembership saw no appointments (scheduler reads are scoped by membership locations).
-- Give every active user of a role that can schedule one active membership, at their own locations or else the practice's active locations.
INSERT INTO "PracticeMembership" ("id", "practice", "user", "status", "createdAt", "updatedAt")
SELECT 'c' || substr(md5(u."id" || clock_timestamp()::text), 1, 24), u."practice", u."id", 'active', now(), now()
FROM "User" u
JOIN "Role" r ON r."id" = u."role"
WHERE u."status" = 'active' AND u."practice" IS NOT NULL AND r."canSchedule" = true
  AND NOT EXISTS (SELECT 1 FROM "PracticeMembership" m WHERE m."user" = u."id");

INSERT INTO "_PracticeMembership_locations" ("A", "B")
SELECT DISTINCT l."id", m."id"
FROM "PracticeMembership" m
JOIN "User" u ON u."id" = m."user"
JOIN "Location" l ON l."practice" = m."practice" AND l."isActive" = true
WHERE m."status" = 'active'
  AND NOT EXISTS (SELECT 1 FROM "_PracticeMembership_locations" x WHERE x."B" = m."id")
  AND (
    EXISTS (SELECT 1 FROM "_Location_staff" s WHERE s."B" = u."id" AND s."A" = l."id")
    OR NOT EXISTS (SELECT 1 FROM "_Location_staff" s JOIN "Location" sl ON sl."id" = s."A" WHERE s."B" = u."id" AND sl."isActive" = true)
  );
