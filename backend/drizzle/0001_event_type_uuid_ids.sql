CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  current_event_type_id_type text;
  constraint_name text;
BEGIN
  SELECT data_type
  INTO current_event_type_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'event_types'
    AND column_name = 'id';

  IF current_event_type_id_type = 'text' THEN
    ALTER TABLE event_types ADD COLUMN IF NOT EXISTS id_uuid uuid;
    UPDATE event_types SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;
    ALTER TABLE event_types ALTER COLUMN id_uuid SET NOT NULL;

    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS event_type_id_uuid uuid;
    UPDATE bookings
    SET event_type_id_uuid = event_types.id_uuid
    FROM event_types
    WHERE bookings.event_type_id = event_types.id
      AND bookings.event_type_id_uuid IS NULL;

    IF EXISTS (SELECT 1 FROM bookings WHERE event_type_id_uuid IS NULL) THEN
      RAISE EXCEPTION 'Cannot migrate bookings.event_type_id: some bookings do not match event_types.id';
    END IF;

    FOR constraint_name IN
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_schema = kcu.constraint_schema
       AND tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'bookings'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'event_type_id'
    LOOP
      EXECUTE format('ALTER TABLE bookings DROP CONSTRAINT %I', constraint_name);
    END LOOP;

    SELECT conname
    INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'event_types'::regclass
      AND contype = 'p';

    IF constraint_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE event_types DROP CONSTRAINT %I', constraint_name);
    END IF;

    ALTER TABLE bookings DROP COLUMN event_type_id;
    ALTER TABLE bookings RENAME COLUMN event_type_id_uuid TO event_type_id;
    ALTER TABLE bookings ALTER COLUMN event_type_id SET NOT NULL;

    ALTER TABLE event_types DROP COLUMN id;
    ALTER TABLE event_types RENAME COLUMN id_uuid TO id;
    ALTER TABLE event_types ALTER COLUMN id SET DEFAULT gen_random_uuid();
    ALTER TABLE event_types ADD PRIMARY KEY (id);

    ALTER TABLE bookings
      ADD CONSTRAINT bookings_event_type_id_event_types_id_fk
      FOREIGN KEY (event_type_id)
      REFERENCES event_types(id)
      ON DELETE RESTRICT;
  ELSIF current_event_type_id_type = 'uuid' THEN
    ALTER TABLE event_types ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
END $$;
